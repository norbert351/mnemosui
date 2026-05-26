import type { ChatMessage, Memory, WalletHistory } from '../types'
import { getStoredSuiNetwork, networkHeader, type SuiNetwork } from './network'

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ??
  (import.meta.env.PROD ? 'https://mnemosui.onrender.com' : 'http://localhost:3001')
const WALRUS_LOAD_TIMEOUT_MS = 30_000

interface ApiErrorPayload {
  success?: boolean
  error?: string | {
    message?: string
    code?: string
  }
}

interface SaveMemoryResponse {
  blobId: string
}

interface SummarizeResponse {
  summary: string
}

interface SuiResponse<T> {
  result: T
}

interface LoadMemoryResponse {
  memory: Memory
}

function normalizeBackendUrl(): string {
  return BACKEND_URL.replace(/\/+$/, '')
}

async function readJson<T>(response: Response, context: string): Promise<T> {
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
}

export async function summarizeMemory(content: string): Promise<string> {
  const response = await fetch(`${normalizeBackendUrl()}/api/ai/summarize`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(),
    },
    body: JSON.stringify({ content }),
  })

  const data = await readJson<SummarizeResponse>(response, 'summarizeMemory')
  return data.summary
}

export async function saveMemory(memory: Memory, network: SuiNetwork = getStoredSuiNetwork()): Promise<string> {
  const response = await fetch(`${normalizeBackendUrl()}/api/walrus/save`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(network),
    },
    body: JSON.stringify({ memory }),
  })

  const data = await readJson<SaveMemoryResponse>(response, 'saveMemory')
  return data.blobId
}

export async function loadMemory(blobId: string, network: SuiNetwork = getStoredSuiNetwork()): Promise<Memory> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, WALRUS_LOAD_TIMEOUT_MS)

  try {
    const response = await fetch(`${normalizeBackendUrl()}/api/walrus/load/${encodeURIComponent(blobId)}`, {
      headers: networkHeader(network),
      signal: controller.signal,
    })
    const data = await readJson<LoadMemoryResponse>(response, 'loadMemory')
    return { ...data.memory, blobId, saved: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[web/api] loadMemory timed out', { timeoutMs: WALRUS_LOAD_TIMEOUT_MS })
      throw new Error('Walrus temporarily unavailable')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getWalletHistory(walletAddress: string, network: SuiNetwork = getStoredSuiNetwork()): Promise<WalletHistory> {
  const response = await fetch(`${normalizeBackendUrl()}/api/sui/history`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(network),
    },
    body: JSON.stringify({ walletAddress, limit: 12 }),
  })

  const data = await readJson<SuiResponse<WalletHistory>>(response, 'getWalletHistory')
  return data.result
}

export async function getWalletBalances(walletAddress: string, network: SuiNetwork = getStoredSuiNetwork()): Promise<unknown> {
  const response = await fetch(`${normalizeBackendUrl()}/api/sui/balances`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...networkHeader(network),
    },
    body: JSON.stringify({ walletAddress }),
  })

  const data = await readJson<SuiResponse<unknown>>(response, 'getWalletBalances')
  return data.result
}

export async function streamAiChat(
  walletAddress: string,
  memories: Memory[],
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
    console.error('[api] SSE stream read error:', err)
    throw err
  } finally {
    reader.releaseLock()
  }
}
