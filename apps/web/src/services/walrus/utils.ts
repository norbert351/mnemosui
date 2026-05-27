export class WalrusNetworkError extends Error {
  public readonly retryable = true
  public readonly code = 'NETWORK_ERROR'

  constructor(message?: string) {
    super(message ?? 'Network connection issue. Check your internet connection.')
    this.name = 'WalrusNetworkError'
  }
}

export class WalrusUploadError extends Error {
  public readonly retryable = false
  public readonly code = 'UPLOAD_ERROR'

  constructor(message?: string) {
    super(message ?? 'Failed to upload blob to Walrus.')
    this.name = 'WalrusUploadError'
  }
}

export class WalletConnectionError extends Error {
  public readonly retryable = false
  public readonly code = 'WALLET_DISCONNECTED'

  constructor(message?: string) {
    super(message ?? 'Wallet is not connected. Connect your wallet first.')
    this.name = 'WalletConnectionError'
  }
}

export class BlobTooLargeError extends Error {
  public readonly retryable = false
  public readonly code = 'BLOB_TOO_LARGE'

  constructor(size: number, maxSize: number) {
    super(`Blob size (${(size / 1024).toFixed(1)} KB) exceeds max (${(maxSize / 1024).toFixed(1)} KB).`)
    this.name = 'BlobTooLargeError'
  }
}

export class UnsupportedNetworkError extends Error {
  public readonly retryable = false
  public readonly code = 'UNSUPPORTED_NETWORK'

  constructor(network?: string) {
    super(`Network "${network ?? 'unknown'}" is not supported. Use testnet or mainnet.`)
    this.name = 'UnsupportedNetworkError'
  }
}

export const MAX_BLOB_SIZE = 512_000

export class WalrusServiceError extends Error {
  public readonly code: string
  public readonly retryable: boolean
  public readonly status?: number
  public readonly originalError?: unknown

  constructor(payload: {
    code: string
    message: string
    retryable: boolean
    status?: number
    originalError?: unknown
  }) {
    super(payload.message)
    this.name = 'WalrusServiceError'
    this.code = payload.code
    this.retryable = payload.retryable
    this.status = payload.status
    this.originalError = payload.originalError
  }
}

export function classifyWalrusError(error: unknown): WalrusServiceError {
  if (error instanceof WalrusServiceError) return error

  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  console.error('[Walrus] classifyWalrusError:', {
    message,
    name: error instanceof Error ? error.name : typeof error,
    status: error && typeof error === 'object' && 'status' in error ? (error as any).status : undefined,
    error,
  })

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new WalrusServiceError({
      code: 'TIMEOUT',
      message: 'Walrus upload relay timed out. The network may be congested.',
      retryable: true,
    })
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return new WalrusServiceError({
      code: 'RATE_LIMITED',
      message: 'Rate limited by Walrus relay. Please wait a moment.',
      retryable: true,
    })
  }

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('service unavailable')) {
    return new WalrusServiceError({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Walrus relay is temporarily unavailable. Retrying...',
      retryable: true,
    })
  }

  if (lower.includes('insufficient') || lower.includes('gas') || lower.includes('balance')) {
    return new WalrusServiceError({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient SUI or WAL tokens for storage.',
      retryable: false,
    })
  }

  if (lower.includes('rejected') || lower.includes('user rejected') || lower.includes('cancelled') || lower.includes('userabort')) {
    return new WalrusServiceError({
      code: 'USER_REJECTED',
      message: 'Transaction was rejected in wallet.',
      retryable: false,
    })
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch') || lower.includes('enotfound') || lower.includes('econnrefused')) {
    return new WalrusServiceError({
      code: 'NETWORK_ERROR',
      message: 'Network connection issue. Check your internet connection.',
      retryable: true,
    })
  }

  if (lower.includes('notconnected') || lower.includes('no wallet')) {
    return new WalrusServiceError({
      code: 'WALLET_DISCONNECTED',
      message: 'Wallet is not connected. Please connect your wallet first.',
      retryable: false,
    })
  }

  return new WalrusServiceError({
    code: 'UNKNOWN',
    message: `Walrus relay error: ${message}`,
    retryable: true,
    status: error && typeof error === 'object' && 'status' in error ? (error as any).status : undefined,
    originalError: error,
  })
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelay?: number; onRetry?: (attempt: number, error: unknown) => void } = {},
): Promise<T> {
  const { retries = 2, baseDelay = 1000, onRetry } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const classified = classifyWalrusError(error)
      if (!classified.retryable || attempt >= retries) break
      onRetry?.(attempt + 1, error)
      await delay(baseDelay * 2 ** attempt)
    }
  }

  throw lastError
}
