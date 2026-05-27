import type { WalrusReadResult } from './types'
import { classifyWalrusError, withRetry } from './utils'
import { getStoredSuiNetwork, type SuiNetwork } from '../../lib/network'

function getAggregatorUrl(network: SuiNetwork): string {
  return network === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space'
}

export async function readBlob(
  blobId: string,
  network?: SuiNetwork,
): Promise<WalrusReadResult> {
  const operation = async () => {
    const n = network ?? getStoredSuiNetwork()
    const url = `${getAggregatorUrl(n)}/v1/blobs/${encodeURIComponent(blobId)}`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) throw new Error('Blob not found on Walrus')
      throw new Error(`Walrus aggregator returned HTTP ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const decoder = new TextDecoder()
    const text = decoder.decode(buffer)

    return { blobId, data: text }
  }

  try {
    return await withRetry(operation, { retries: 2, baseDelay: 800 })
  } catch (error) {
    throw classifyWalrusError(error)
  }
}
