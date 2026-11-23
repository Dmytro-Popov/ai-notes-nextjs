'use client'

import { useState } from 'react'

type Language = 'German' | 'Spanish' | 'French' | 'Italian' | 'Portuguese' | 'Russian' | 'Chinese' | 'Japanese'

export function Translation({ noteId }: { noteId: string }) {
  const [language, setLanguage] = useState<Language>('German')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [controller, setController] = useState<AbortController | null>(null)

  async function translate() {
    setText('')
    setError('')
    setIsLoading(true)
    const abortController = new AbortController()
    setController(abortController)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          language,
        }),
      })

      if (!response.ok) {
        let message = 'The translation could not be completed.'

        try {
          const data: unknown = await response.json()

          if (
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof data.error === 'string'
          ) {
            message = data.error
          }
        } catch {
        }

        setError(message)
        return
      }

      if (!response.body) {
        throw new Error('The response does not contain a readable body.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        setText((current) =>
          current + decoder.decode(value, { stream: true }),
        )
      }

      setText((current) => current + decoder.decode())
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        setError(
          'An error occurred whilst retrieving the translation. Please try again.',
        )
      }
    } finally {
      setIsLoading(false)
      setController(null)
    }
  }

  function stopTranslation() {
    controller?.abort()
  }

  return (
    <div className="mt-4">
      <div className="rounded bg-slate-100 px-3 py-2 text-sm text-black my-5">
        AI-generated translation:

        <select
          className="ml-2"
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as Language)
          }
          disabled={isLoading}
        >
          <option value="German">German</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
            <option value="Italian">Italian</option>
            <option value="Portuguese">Portuguese</option>
            <option value="Russian">Russian</option>
            <option value="Chinese">Chinese</option>
            <option value="Japanese">Japanese</option>
        </select>
      </div>

      <button
        type="button"
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={isLoading}
        onClick={translate}
      >
        {isLoading ? 'Translating...' : 'Translate'}
      </button>

      {isLoading && (
        <button
          type="button"
          className="ml-2 rounded border border-slate-900 px-3 py-2 text-sm text-slate-900"
          onClick={stopTranslation}
        >
          Stop
        </button>
      )}

      {text && (
        <p className="mt-3 whitespace-pre-wrap text-sm">
          {text}
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Machine-generated translation — meanings and numbers should be verified
        before you rely on it.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}