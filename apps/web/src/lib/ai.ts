import type { ChatMessage, Memory } from '../types'
import { networkHeader } from './network'

interface AskAIParams {
  backendUrl: string
  walletAddress: string
  memories: Memory[]
  messages: ChatMessage[]
  signal: AbortSignal
}

interface ApiErrorPayload {
  error?: {
    message?: string
    code?: string
  }
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return fallback
  }

  const error = (payload as ApiErrorPayload).error
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallback
}

async function readResponsePreview(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  return text.trim().slice(0, 200)
}

export async function askAI({
  backendUrl,
  walletAddress,
  memories,
  messages,
  signal,
}: AskAIParams): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${backendUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(),
    },
    body: JSON.stringify({
      walletAddress,
      memories,
      history: messages.slice(0, -1),
      userMessage: messages.at(-1)?.content ?? '',
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    signal,
  })

  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
    throw new Error(getApiErrorMessage(payload, `AI request failed with HTTP ${response.status}`))
  }

  if (!contentType.toLowerCase().includes('text/event-stream')) {
    const preview = await readResponsePreview(response)
    throw new Error(
      `Expected text/event-stream from AI chat, got ${contentType || 'missing content-type'}${preview ? `: ${preview}` : ''}`,
    )
  }

  if (response.body === null) {
    throw new Error('AI response did not include a readable stream')
  }

  return response.body
}

function processSseEvent(event: string, onText: (text: string) => void): boolean {
  const lines = event.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed.startsWith('data:')) continue

    const data = trimmed.slice(5).trim()

    if (data === '[DONE]') {
      return true
    }

    try {
      const parsed = JSON.parse(data) as { delta?: unknown; text?: unknown }
      const delta = typeof parsed.delta === 'string'
        ? parsed.delta
        : typeof parsed.text === 'string'
          ? parsed.text
          : ''

      if (delta) {
        onText(delta)
      }
    } catch (err) {
      console.warn('[AIChat] failed to parse SSE chunk', err)
    }
  }

  return false
}

export async function readAIStream(
  stream: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const streamDone = processSseEvent(event, onText)
        if (streamDone) return
      }
    }

    buffer += decoder.decode()

    if (buffer.trim()) {
      const streamDone = processSseEvent(buffer, onText)
      if (streamDone) return
    }

  } finally {
    reader.releaseLock()
  }
}
