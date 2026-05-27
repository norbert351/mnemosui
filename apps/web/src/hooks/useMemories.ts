import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStoredSuiNetwork, type SuiNetwork } from '../lib/network'
import { saveMemoryToWalrus } from '../services/walrus/upload'
import { readBlob } from '../services/walrus/read'
import { classifyWalrusError, delay } from '../services/walrus/utils'
import type { WalrusSigner } from '../services/walrus/types'
import { summarizeContent } from '../lib/format'
import { networkKey } from '../lib/storage'
import type { Memory, MemoryDraft } from '../types'

interface MemoryIndexEntry {
  blobId: string
  cachedAt: string
  memory?: Memory
  title?: string
  summary?: string
  updatedAt?: string
  walletAddress?: string
  saved?: boolean
}

interface WalletMemoryIndex {
  walletAddress: string
  blobIds: string[]
  cache: Record<string, MemoryIndexEntry>
}

interface WalrusContext {
  signer: WalrusSigner
  suiClient: any
}

const MEMORY_LOAD_RETRIES = 2
const MEMORY_LOAD_BACKOFF_MS = 700
const MEMORY_LOAD_SOFT_TIMEOUT_MS = 10_000

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.toLowerCase()
}

function indexKey(network: SuiNetwork, walletAddress: string): string {
  return networkKey(network, `memories-${normalizeWalletAddress(walletAddress)}`)
}

function legacyIndexKey(network: SuiNetwork, walletAddress: string): string {
  return `mnemosui_memory_index_${network}_${normalizeWalletAddress(walletAddress)}`
}

function readIndex(network: SuiNetwork, walletAddress: string): WalletMemoryIndex {
  const key = indexKey(network, walletAddress)
  const legacyKey = legacyIndexKey(network, walletAddress)
  const raw = localStorage.getItem(key) ?? localStorage.getItem(legacyKey)
  if (!raw) {
    return { walletAddress: normalizeWalletAddress(walletAddress), blobIds: [], cache: {} }
  }

  try {
    const parsed = JSON.parse(raw) as WalletMemoryIndex
    const index = {
      walletAddress: normalizeWalletAddress(parsed.walletAddress ?? walletAddress),
      blobIds: Array.isArray(parsed.blobIds) ? parsed.blobIds.filter(blobId => typeof blobId === 'string') : [],
      cache: parsed.cache && typeof parsed.cache === 'object' ? parsed.cache : {},
    }

    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(index))
    }

    return index
  } catch {
    return { walletAddress: normalizeWalletAddress(walletAddress), blobIds: [], cache: {} }
  }
}

function writeIndex(network: SuiNetwork, walletAddress: string, index: WalletMemoryIndex) {
  localStorage.setItem(indexKey(network, walletAddress), JSON.stringify(index))
}

function toMemoryIndexEntry(memory: Memory): MemoryIndexEntry {
  return {
    blobId: memory.blobId ?? '',
    cachedAt: new Date().toISOString(),
    memory: memory,
    title: memory.title,
    summary: memory.summary,
    updatedAt: memory.updatedAt,
    walletAddress: memory.walletAddress,
    saved: memory.saved,
  }
}

function dedupeMemories(memories: Memory[]): Memory[] {
  const seen = new Set<string>()
  const result: Memory[] = []

  for (const memory of memories) {
    const key = memory.blobId ?? memory.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push(memory)
  }

  return result.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime()
    const bTime = new Date(b.updatedAt).getTime()
    return bTime - aTime
  })
}

function publishMemoryRefresh(network: SuiNetwork, walletAddress: string) {
  window.dispatchEvent(new CustomEvent('mnemosui:memories-updated', {
    detail: { network, walletAddress: walletAddress.toLowerCase() },
  }))
}

async function withAggregatorRetry<T>(operation: () => Promise<T>, retries = MEMORY_LOAD_RETRIES): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await delay(MEMORY_LOAD_BACKOFF_MS * 2 ** attempt)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load from aggregator')
}

function unavailableMemoryFromEntry(entry: MemoryIndexEntry, walletAddress: string): Memory {
  const cachedText = entry.summary || entry.title || 'Content temporarily unavailable.'
  return {
    id: entry.blobId,
    walletAddress: entry.walletAddress ?? walletAddress,
    type: entry.memory?.type ?? 'manual_note',
    title: entry.title ?? entry.memory?.title ?? 'Memory',
    content: 'Content temporarily unavailable.',
    summary: cachedText,
    tags: entry.memory?.tags ?? [],
    txDigest: entry.memory?.txDigest,
    source: entry.memory?.source,
    metadata: entry.memory?.metadata,
    blobId: entry.blobId,
    saved: entry.saved ?? true,
    createdAt: entry.memory?.createdAt ?? entry.cachedAt,
    updatedAt: entry.updatedAt ?? entry.memory?.updatedAt ?? entry.cachedAt,
  }
}

function cachedMemoriesFromIndex(network: SuiNetwork, walletAddress: string): Memory[] {
  const index = readIndex(network, walletAddress)
  return index.blobIds
    .map(blobId => index.cache[blobId])
    .filter((entry): entry is MemoryIndexEntry => Boolean(entry))
    .map(entry => {
      if (entry.memory) {
        return entry.memory
      }

      const cachedText = entry.summary || entry.title || 'Memory is still loading from Walrus.'
      return {
        id: entry.blobId,
        walletAddress: entry.walletAddress ?? walletAddress,
        type: 'manual_note' as const,
        title: entry.title ?? 'Memory',
        content: cachedText,
        summary: entry.summary ?? '',
        tags: [],
        blobId: entry.blobId,
        saved: true,
        createdAt: entry.cachedAt,
        updatedAt: entry.updatedAt ?? entry.cachedAt,
      }
    })
}

async function loadIndexedMemories(network: SuiNetwork, walletAddress: string): Promise<Memory[]> {
  const index = readIndex(network, walletAddress)

  if (index.blobIds.length === 0) {
    return []
  }

  const results = await Promise.allSettled(index.blobIds.map(blobId =>
    withAggregatorRetry(() => readBlob(blobId, network)),
  ))
  const loadedMemories: Memory[] = []
  const updatedCache: Record<string, MemoryIndexEntry> = { ...index.cache }
  const failedBlobIds: string[] = []

  results.forEach((result, i) => {
    const blobId = index.blobIds[i]

    if (result.status === 'fulfilled') {
      try {
        const memory = JSON.parse(result.value.data) as Memory
        const withBlobId = { ...memory, blobId, saved: true }
        loadedMemories.push(withBlobId)
        updatedCache[blobId] = toMemoryIndexEntry(withBlobId)
      } catch {
        failedBlobIds.push(blobId)
        const cachedEntry = index.cache[blobId]
        if (cachedEntry) {
          loadedMemories.push(cachedEntry.memory ?? unavailableMemoryFromEntry(cachedEntry, walletAddress))
        }
      }
      return
    }

    failedBlobIds.push(blobId)
    const cachedEntry = index.cache[blobId]
    if (cachedEntry) {
      loadedMemories.push(cachedEntry.memory ?? unavailableMemoryFromEntry(cachedEntry, walletAddress))
    }
  })

  const nextIndex: WalletMemoryIndex = {
    walletAddress: index.walletAddress,
    blobIds: index.blobIds,
    cache: updatedCache,
  }
  writeIndex(network, walletAddress, nextIndex)

  return dedupeMemories(loadedMemories)
}

export function useMemories(
  walletAddress: string | undefined,
  walrusContext?: WalrusContext,
) {
  const normalizedWalletAddress = walletAddress ? normalizeWalletAddress(walletAddress) : undefined
  const network = getStoredSuiNetwork()
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!normalizedWalletAddress) {
      setMemories([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    setIsLoading(true)
    setError(null)

    const softTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setError('Walrus is taking longer than usual. Cached memories remain available.')
      }
    }, MEMORY_LOAD_SOFT_TIMEOUT_MS)

    const load = async () => {
      try {
        const cachedMemories = cachedMemoriesFromIndex(network, normalizedWalletAddress)

        if (cachedMemories.length > 0) {
          if (!cancelled) {
            setMemories(cachedMemories)
          }
        }

        const loadedMemories = await loadIndexedMemories(network, normalizedWalletAddress)

        if (!cancelled) {
          setMemories(loadedMemories)
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load every memory from Walrus. Showing cached memories.')
          setMemories(cachedMemoriesFromIndex(network, normalizedWalletAddress))
        }
      } finally {
        window.clearTimeout(softTimeout)
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      window.clearTimeout(softTimeout)
    }
  }, [normalizedWalletAddress, network, reloadToken])

  useEffect(() => {
    if (!normalizedWalletAddress) return

    let cancelled = false

    const onMemoriesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ network?: SuiNetwork; walletAddress?: string }>).detail
      if (detail?.network !== network) return
      if (detail?.walletAddress !== normalizedWalletAddress) return

      const refresh = async () => {
        setError(null)

        try {
          const loadedMemories = await loadIndexedMemories(network, normalizedWalletAddress)
          if (!cancelled) {
            setMemories(loadedMemories)
          }
        } catch {
          if (!cancelled) {
            setError('Unable to refresh every memory from Walrus. Keeping cached memories visible.')
            setMemories(cachedMemoriesFromIndex(network, normalizedWalletAddress))
          }
        }
      }

      void refresh()
    }

    window.addEventListener('mnemosui:memories-updated', onMemoriesUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('mnemosui:memories-updated', onMemoriesUpdated)
    }
  }, [normalizedWalletAddress, network])

  const saveMemory = useCallback(async (draft: MemoryDraft) => {
    if (!normalizedWalletAddress) {
      throw new Error('Wallet is not connected')
    }

    if (!walrusContext) {
      throw new Error('Walrus context not available. Connect your wallet first.')
    }

    setIsLoading(true)
    setError(null)

    try {
      const summary = summarizeContent(draft.content)

      const now = new Date().toISOString()
      const memory: Memory = {
        id: crypto.randomUUID(),
        walletAddress: normalizedWalletAddress,
        type: draft.type,
        title: draft.title,
        content: draft.content,
        summary,
        tags: draft.tags,
        txDigest: draft.txDigest,
        source: draft.source,
        metadata: { ...draft.metadata, network },
        blobId: undefined,
        saved: false,
        network,
        createdAt: now,
        updatedAt: now,
      }

      const result = await saveMemoryToWalrus(
        memory,
        network,
        walrusContext.signer,
        walrusContext.suiClient,
      )
      const savedMemory: Memory = {
        ...memory,
        blobId: result.blobId,
        saved: true,
        updatedAt: now,
      }

      const index = readIndex(network, normalizedWalletAddress)
      const nextIndex: WalletMemoryIndex = {
        walletAddress: normalizedWalletAddress,
        blobIds: [result.blobId, ...index.blobIds.filter(id => id !== result.blobId)],
        cache: {
          ...index.cache,
          [result.blobId]: toMemoryIndexEntry(savedMemory),
        },
      }
      writeIndex(network, normalizedWalletAddress, nextIndex)

      setMemories(prev => dedupeMemories([savedMemory, ...prev]))
      publishMemoryRefresh(network, normalizedWalletAddress)
      return savedMemory
    } catch (saveError) {
      const classified = classifyWalrusError(saveError)
      setError(classified.message)
      throw classified
    } finally {
      setIsLoading(false)
    }
  }, [normalizedWalletAddress, network, walrusContext])

  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => {
      const next = prev.filter(memory => memory.id !== id)
      if (normalizedWalletAddress) {
        const index = readIndex(network, normalizedWalletAddress)
        const removed = prev.find(memory => memory.id === id)
        const nextIndex: WalletMemoryIndex = {
          walletAddress: normalizedWalletAddress,
          blobIds: removed?.blobId ? index.blobIds.filter(blobId => blobId !== removed.blobId) : index.blobIds,
          cache: { ...index.cache },
        }
        if (removed?.blobId) {
          delete nextIndex.cache[removed.blobId]
        }
        writeIndex(network, normalizedWalletAddress, nextIndex)
        publishMemoryRefresh(network, normalizedWalletAddress)
      }
      return next
    })
  }, [normalizedWalletAddress, network])

  const memoryCount = useMemo(() => memories.length, [memories.length])
  const retryLoad = useCallback(() => {
    setError(null)
    setReloadToken(token => token + 1)
  }, [])

  return {
    memories,
    memoryCount,
    saveMemory,
    deleteMemory,
    isLoading,
    error,
    clearError: () => setError(null),
    retryLoad,
  }
}
