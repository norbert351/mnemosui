import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadMemory, saveMemory as saveMemoryToWalrus, summarizeMemory } from '../lib/api'
import { summarizeContent } from '../lib/format'
import { getStoredSuiNetwork, type SuiNetwork } from '../lib/network'
import { networkKey } from '../lib/storage'
import type { Memory, MemoryDraft } from '../types'

interface MemoryIndexEntry {
  blobId: string
  cachedAt: string
  // Full memory data cached locally for offline access
  memory?: Memory
  // Legacy fields kept for backwards compatibility
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

const MEMORY_LOAD_RETRIES = 2
const MEMORY_LOAD_BACKOFF_MS = 700
const MEMORY_LOAD_SOFT_TIMEOUT_MS = 15_000
function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.toLowerCase()
}

function indexKey(network: SuiNetwork, walletAddress: string): string {
  return networkKey(network, `memories-${normalizeWalletAddress(walletAddress)}`)
}

function legacyIndexKey(network: SuiNetwork, walletAddress: string): string {
  return `mnemosui_memory_index_${network}_${normalizeWalletAddress(walletAddress)}`
}

function truncateWalletAddress(walletAddress: string): string {
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}

function truncateBlobId(blobId: string): string {
  return blobId.length > 14 ? `${blobId.slice(0, 6)}...${blobId.slice(-6)}` : blobId
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
  } catch (error) {
    console.error('[useMemories] Failed to parse memory index', error)
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function withRetry<T>(operation: () => Promise<T>, retries = MEMORY_LOAD_RETRIES): Promise<T> {
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

  throw lastError instanceof Error ? lastError : new Error('Operation failed')
}

function unavailableMemoryFromEntry(entry: MemoryIndexEntry, walletAddress: string): Memory {
  const cachedText = entry.summary || entry.title || 'Content temporarily unavailable. MnemoSui will retry from Walrus.'
  return {
    id: entry.blobId,
    walletAddress: entry.walletAddress ?? walletAddress,
    type: entry.memory?.type ?? 'manual_note',
    title: entry.title ?? entry.memory?.title ?? 'Memory',
    content: 'Content temporarily unavailable. MnemoSui will retry from Walrus.',
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
  console.info(`[network] loading ${network} memories`)
  const index = readIndex(network, walletAddress)
  return index.blobIds
    .map(blobId => index.cache[blobId])
    .filter((entry): entry is MemoryIndexEntry => Boolean(entry))
    .map(entry => {
      if (entry.memory) {
        return entry.memory
      }

      const cachedText = entry.summary || entry.title || 'Memory content is still loading from Walrus.'
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
  console.info('[useMemories] loading index', {
    network,
    walletAddress: truncateWalletAddress(walletAddress),
    blobCount: index.blobIds.length,
  })

  if (index.blobIds.length === 0) {
    console.info('[useMemories] loaded N memories', {
      network,
      walletAddress: truncateWalletAddress(walletAddress),
      loadedCount: 0,
      requestedCount: 0,
    })
    return []
  }

  const results = await Promise.allSettled(index.blobIds.map(blobId => withRetry(() => loadMemory(blobId, network))))
  const loadedMemories: Memory[] = []
  const updatedCache: Record<string, MemoryIndexEntry> = { ...index.cache }
  const failedBlobIds: string[] = []

  results.forEach((result, i) => {
    const blobId = index.blobIds[i]

    if (result.status === 'fulfilled') {
      loadedMemories.push(result.value)
      updatedCache[blobId] = toMemoryIndexEntry(result.value)
      return
    }

    failedBlobIds.push(blobId)
    const cachedEntry = index.cache[blobId]
    if (cachedEntry) {
      loadedMemories.push(cachedEntry.memory ?? unavailableMemoryFromEntry(cachedEntry, walletAddress))
    }
    console.error('[useMemories] failed blobId', {
      network,
      walletAddress: truncateWalletAddress(walletAddress),
      blobId: truncateBlobId(blobId),
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    })
  })

  if (failedBlobIds.length > 0) {
    console.warn('[useMemories] continuing with partial results', {
      network,
      walletAddress: truncateWalletAddress(walletAddress),
      failedBlobIds: failedBlobIds.map(truncateBlobId),
      loadedCount: loadedMemories.length,
      requestedCount: index.blobIds.length,
    })
  }

  console.info('[useMemories] loaded N memories', {
    network,
    walletAddress: truncateWalletAddress(walletAddress),
    loadedCount: loadedMemories.length,
    requestedCount: index.blobIds.length,
  })

  const nextIndex: WalletMemoryIndex = {
    walletAddress: index.walletAddress,
    blobIds: index.blobIds,
    cache: updatedCache,
  }
  writeIndex(network, walletAddress, nextIndex)

  return dedupeMemories(loadedMemories)
}

export function useMemories(walletAddress: string | undefined) {
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
    loadingRef.current = false

    const load = async () => {
      if (loadingRef.current) return
      loadingRef.current = true
      setIsLoading(true)
      setError(null)
      const softTimeout = window.setTimeout(() => {
        if (!cancelled) {
          setError('Walrus is taking longer than usual. Cached memories remain available.')
        }
      }, MEMORY_LOAD_SOFT_TIMEOUT_MS)
      console.info('[useMemories] loading started', {
        network,
        walletAddress: truncateWalletAddress(normalizedWalletAddress),
      })

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
      } catch (loadError) {
        console.error('[useMemories] Memory load failed', loadError)
        if (!cancelled) {
          setError('Unable to load every memory from Walrus. Showing cached memories.')
          setMemories(cachedMemoriesFromIndex(network, normalizedWalletAddress))
        }
      } finally {
        window.clearTimeout(softTimeout)
        loadingRef.current = false
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
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
        } catch (refreshError) {
          console.error('[useMemories] Memory refresh failed', refreshError)
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

    setIsLoading(true)
    setError(null)

    try {
      console.info('[useMemories] saveMemory start', {
        network,
        walletAddress: truncateWalletAddress(normalizedWalletAddress),
        title: draft.title,
      })

      const summary = await summarizeMemory(draft.content).catch(error => {
        console.error('[useMemories] summarizeMemory failed, falling back to local summary', error)
        return summarizeContent(draft.content)
      })

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
        metadata: draft.metadata,
        blobId: undefined,
        saved: false,
        createdAt: now,
        updatedAt: now,
      }

      const blobId = await saveMemoryToWalrus(memory, network)
      const savedMemory: Memory = {
        ...memory,
        blobId,
        saved: true,
        updatedAt: now,
      }

      const index = readIndex(network, normalizedWalletAddress)
      const nextIndex: WalletMemoryIndex = {
        walletAddress: normalizedWalletAddress,
        blobIds: [blobId, ...index.blobIds.filter(id => id !== blobId)],
        cache: {
          ...index.cache,
          [blobId]: toMemoryIndexEntry(savedMemory),
        },
      }
      writeIndex(network, normalizedWalletAddress, nextIndex)

      setMemories(prev => dedupeMemories([savedMemory, ...prev]))
      publishMemoryRefresh(network, normalizedWalletAddress)
      console.info('[useMemories] saveMemory success', { network, blobId: truncateBlobId(blobId) })
      return savedMemory
    } catch (saveError) {
      console.error('[useMemories] saveMemory failed', saveError)
      setError('Unable to save memory right now.')
      throw saveError instanceof Error ? saveError : new Error('Unable to save memory')
    } finally {
      setIsLoading(false)
    }
  }, [normalizedWalletAddress, network])

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
