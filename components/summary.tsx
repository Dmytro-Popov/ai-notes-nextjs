'use client'

import { useState, useTransition } from 'react'
import { summariseNote } from '@/app/notes/ai-actions'

export function Summary({ noteId }: { noteId: string }) {
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof summariseNote>>>()
  const [isPending, startTransition] = useTransition()
  const [length, setLength] = useState('sentence')

  return (
    <div className="mt-4">
      <div className="rounded bg-slate-100 px-3 py-2 text-sm text-black disabled:opacity-50 my-5">
        AI-generated summary:
        <select
          value={length}
          onChange={(event) => setLength(event.target.value)}
        >
          <option value="sentence">sentence</option>
          <option value="bullets">bullets</option>
          <option value="paragraph">paragraph</option>
        </select>
      </div>
      <button
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={isPending}
        onClick={() =>
          startTransition(async () =>
            setResult(await summariseNote(noteId, length)),
          )
        }
      >
        {isPending ? 'Summarising...' : 'Summarise'}
      </button>
      {result?.summary && (
        <div className="mt-3 text-sm">
          <h3 className="font-semibold">{result.summary.headline}</h3>

          <ul className="mt-2 list-disc pl-5">
            {result.summary.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      {result?.error && (
        <p className="mt-3 text-sm text-red-700">{result.error}</p>
      )}
    </div>
  )
}
