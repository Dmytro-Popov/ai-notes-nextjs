'use server'

import { claude, model } from '@/lib/claude'
import { getNote } from '@/lib/notes'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const LengthSchema = z.enum(['sentence', 'bullets', 'paragraph'])

const SummarySchema = z.object({
  headline: z.string(),
  keyPoints: z.array(z.string()),
})

const lengthInstructions = {
  sentence: 'Write exactly one complete sentence.',
  bullets: 'Write exactly three bullet points.',
  paragraph: 'Write a short paragraph of two to three sentences.',
}

export async function summariseNote(noteId: string, length: unknown) {
  const note = getNote(noteId)
  if (!note) return { error: 'Note not found.' }

  const parsedLength = LengthSchema.safeParse(length)

  if (!parsedLength.success) {
    return { error: 'Invalid summary length.' }
  }

  const lengthInstruction = lengthInstructions[parsedLength.data]

  try {
    const message = await claude.messages.parse({
      model,
      max_tokens: 1024,
      system: `Summarise the note for a busy colleague. ${lengthInstruction} Use only what the note says.`,
      messages: [{ role: 'user', content: `<note>${note.body}</note>` }],
      output_config: { format: zodOutputFormat(SummarySchema) },
    })
    console.log('Model:', model)
    console.log('Usage:', message.usage)

    const inputCost = (message.usage.input_tokens / 1_000_000) * 0.1

    const outputCost = (message.usage.output_tokens / 1_000_000) * 0.5

    const totalCost = inputCost + outputCost

    console.log({
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      inputCostUSD: inputCost,
      outputCostUSD: outputCost,
      totalCostUSD: totalCost,
    })

    if (message.stop_reason !== 'end_turn') {
      return { error: 'The summary could not be completed.' }
    }
    const summary = message.parsed_output
    if (!summary) {
      return { error: 'The AI response could not be read.' }
    }
    return { summary }
  } catch (err) {
    console.error(err)
    return { error: 'The AI service is not available. Please try again.' }
  }
}
