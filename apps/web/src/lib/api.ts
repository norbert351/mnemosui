import type { ChatMessage, Memory, WalletHistory } from '../types'
import { getStoredSuiNetwork, networkHeader, type SuiNetwork } from './network'

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ??
  (import.meta.env.PROD ? 'https://mnemosui.onrender.com' : 'http://localhost:3001')

interface ApiErrorPayload {
  success?: boolean
  error?: string | {
    message?: string
    code?: string
  }
}

interface SuiResponse<T> {
  result: T
}

const API_TIMEOUT_MS = 15_000

function normalizeBackendUrl(): string {
  return BACKEND_URL.replace(/\/+$/, '')
}

class ApiNetworkError extends Error {
  constructor(context: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause)
    super(`[api] ${context} failed: ${message}`)
    this.name = 'ApiNetworkError'
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  context: string,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  const combinedSignal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal

  try {
    const response = await fetch(url, { ...options, signal: combinedSignal })

    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | T | null

    if (!response.ok) {
      let errorMessage = `${context} failed`
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const errorValue = (payload as ApiErrorPayload).error
        if (typeof errorValue === 'string') {
          errorMessage = errorValue
        } else if (errorValue?.message) {
          errorMessage = errorValue.message
        }
      }

      console.error(`[web/api] ${context} failed`, {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
      })
      throw new Error(errorMessage)
    }

    return payload as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${context} timed out after ${API_TIMEOUT_MS / 1000}s`)
    }
    throw new ApiNetworkError(context, error)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

export async function getWalletHistory(
  walletAddress: string,
  network: SuiNetwork = getStoredSuiNetwork(),
  signal?: AbortSignal,
): Promise<WalletHistory> {
  const data = await apiFetch<SuiResponse<WalletHistory>>(
    `${normalizeBackendUrl()}/api/sui/history`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...networkHeader(network),
      },
      body: JSON.stringify({ walletAddress, limit: 12 }),
      signal,
    },
    'getWalletHistory',
  )
  return data.result
}

export async function getWalletBalances(
  walletAddress: string,
  network: SuiNetwork = getStoredSuiNetwork(),
  signal?: AbortSignal,
): Promise<unknown> {
  const data = await apiFetch<SuiResponse<unknown>>(
    `${normalizeBackendUrl()}/api/sui/balances`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...networkHeader(network),
      },
      body: JSON.stringify({ walletAddress }),
      signal,
    },
    'getWalletBalances',
  )
  return data.result
}

export async function streamAiChat(
  walletAddress: string,
  memories: readonly Memory[],
  messages: ChatMessage[],
  onText: (text: string) => void,
  signal: AbortSignal,
  balances?: unknown,
  network: SuiNetwork = getStoredSuiNetwork(),
): Promise<void> {
  const backend = normalizeBackendUrl()

  const response = await fetch(`${backend}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(network),
    },
    signal,
    body: JSON.stringify({
      walletAddress,
      memories,
      balances,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    console.error('[api] streamAiChat HTTP error', { status: response.status })
    throw new Error(`AI stream failed: ${response.status}${err ? ` - ${err}` : ''}`)
  }

  if (!response.body) {
    throw new Error('[api] No response body from AI endpoint')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        for (const line of event.split('\n')) {
          const trimmed = line.trim()

          if (!trimmed.startsWith('data:')) continue

          const data = trimmed.slice(5).trim()

          if (data === '[DONE]') {
            return
          }

          try {
            const parsed = JSON.parse(data) as {
              delta?: string
            }
            const text = parsed.delta
            if (typeof text === 'string' && text.length > 0) {
              onText(text)
            }
          } catch {
            continue
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return
    }
    console.error('[api] SSE stream read error:', err instanceof Error ? err.message : err)
    throw err
  } finally {
    reader.releaseLock()
  }
}
