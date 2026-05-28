import { createWalrusClient, type WalrusNetwork } from './client'
import type { WalrusUploadResult, WalrusSigner } from './types'
import { BlobTooLargeError, classifyWalrusError, MAX_BLOB_SIZE, withRetry } from './utils'
import { getRelayHost } from './client'

export interface UploadCallbacks {
  onStep?: (status: string) => void
  signal?: AbortSignal
}

function stepLabel(step: any): string {
  if (!step || typeof step !== 'object') return 'Processing...'
  if ('CreateStorage' in step) return 'Creating storage...'
  if ('RegisterBlob' in step) return 'Registering blob...'
  if ('UploadBlobToNodes' in step || 'UploadBlobToRelay' in step) return 'Uploading...'
  if ('CertifyBlob' in step) return 'Certifying...'
  return 'Processing...'
}

export async function saveMemoryToWalrus(
  memory: unknown,
  network: WalrusNetwork,
  signer: WalrusSigner,
  suiClient: any,
  callbacks?: UploadCallbacks,
): Promise<WalrusUploadResult> {
  const { onStep, signal } = callbacks ?? {}

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  const walrusClient = createWalrusClient(network, suiClient)
  const json = JSON.stringify(memory)
  const encoder = new TextEncoder()
  const blob = encoder.encode(json)
  const relayHost = getRelayHost(network)

  console.log('[Walrus] saveMemoryToWalrus start', {
    network,
    relayHost,
    blobSize: blob.byteLength,
    maxSize: MAX_BLOB_SIZE,
  })

  if (blob.byteLength > MAX_BLOB_SIZE) {
    throw new BlobTooLargeError(blob.byteLength, MAX_BLOB_SIZE)
  }

  try {
    console.log('[Walrus] Calling writeBlob via SDK...')
    const result = await withRetry(
      async () => {
        if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
        return await walrusClient.writeBlob({
          blob,
          deletable: false,
          epochs: 1,
          signer,
          signal,
          onStep: (step: any) => {
            onStep?.(stepLabel(step))
          },
        })
      },
      {
        retries: 1,
        baseDelay: 2000,
        onRetry: (attempt) => onStep?.(`Retrying (${attempt}/2)...`),
      },
    )

    console.log('[Walrus] writeBlob result:', { blobId: result.blobId })

    return {
      blobId: result.blobId,
      blobObject: result.blobObject,
      endEpoch: result.blobObject.storage.end_epoch,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    console.error('[Walrus] saveMemoryToWalrus error:', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      status: error && typeof error === 'object' && 'status' in error ? (error as any).status : undefined,
    })
    throw classifyWalrusError(error)
  }
}
