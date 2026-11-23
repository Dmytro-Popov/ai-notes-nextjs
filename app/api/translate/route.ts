import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { claude, model } from '@/lib/claude';
import { getNote } from '@/lib/notes';
import { getDb } from '@/lib/db';

const Body = z.object({
  noteId: z.string(),
  language: z.enum(['German', 'Spanish', 'French', 'Italian', 'Russian', 'Chinese', 'Portuguese', 'Japanese'])
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Choose a note and a supported language.' }, { status: 400 });
  }

  const note = getNote(parsed.data.noteId);
  if (!note) return Response.json({ error: 'Note not found.' }, { status: 404 });

  const cached = getDb()
    .prepare('SELECT translation FROM translations WHERE note_id = ? AND language = ?')
    .get(note.id, parsed.data.language) as { translation: string } | undefined;

  if (cached) {
    return new Response(cached.translation, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const stream = claude.messages.stream({
    model,
    max_tokens: 16384,
    system: `Translate the note into ${parsed.data.language}. Reply with the translation only.`,
    messages: [{ role: 'user', content: `<note>${note.body}</note>` }]
  });

  const encoder = new TextEncoder();
  let generatedText = '';
  const body = new ReadableStream({
    async start(controller) {
      stream.on('text', (text) => {
        generatedText += text;
        controller.enqueue(encoder.encode(text));
      });

      try {
        const message = await stream.finalMessage();
        if (message.stop_reason !== 'end_turn') throw new Error(`Stopped early: ${message.stop_reason}`);
        getDb()
          .prepare('INSERT OR REPLACE INTO translations (note_id, language, translation) VALUES (?, ?, ?)')
          .run(note.id, parsed.data.language, generatedText);
        controller.close();
      } catch (err) {
        if (err instanceof Anthropic.APIUserAbortError) {
          console.log(`Translation generation aborted for note ${note.id} (${parsed.data.language}).`);
          return;
        }
        console.error(err);
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    }
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}