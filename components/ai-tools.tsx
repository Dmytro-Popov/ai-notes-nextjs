import type { Note } from '@/lib/notes'
import { Summary } from '@/components/summary'
import { Translation } from './translation'

export function AiTools({ note }: { note: Note }) {
  return (
    <section
      aria-label={`AI tools for ${note.title}`}
      className="mt-8 border-t border-slate-200 pt-6"
    >
      <h2 className="text-lg font-medium">AI tools</h2>
      <div className="mt-2 text-sm text-slate-600">
        <Summary noteId={note.id} />
        <Translation noteId={note.id} />
      </div>
    </section>
  )
}
