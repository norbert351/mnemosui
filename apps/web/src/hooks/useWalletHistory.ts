import { useEffect, useMemo, useRef, useState } from 'react'
import { getWalletBalances, getWalletHistory } from '../lib/api'
import { getStoredSuiNetwork } from '../lib/network'

const HISTORY_SOFT_TIMEOUT_MS = 15_000
const DEBOUNCE_MS = 500

function flattenTransactions(history: unknown): unknown[] {
  if (typeof history !== 'object' || history === null) return []
  const record = history as Record<string, unknown>
  const sections = [record.sent, record.received]

  return sections.flatMap(section => {
    if (typeof section !== 'object' || section === null) return []
    const sectionRecord = section as Record<string, unknown>
    return Array.isArray(sectionRecord.data) ? sectionRecord.data : []
  })
}

export function useWalletHistory(walletAddress: string | undefined) {
  const network = getStoredSuiNetwork()
  const [history, setHistory] = useState<unknown>(null)
  const [balances, setBalances] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (!walletAddress) {
      setHistory(null)
      setBalances(null)
      setLoading(false)
      return
    }

    const normalizedWalletAddress = walletAddress.toLowerCase()
    const fetchId = ++fetchIdRef.current

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = window.setTimeout(async () => {
      if (fetchId !== fetchIdRef.current) return
      setLoading(true)

      const softTimeout = window.setTimeout(() => {
        if (fetchId === fetchIdRef.current) {
          console.warn('[useWalletHistory] request still in flight after soft timeout')
        }
      }, HISTORY_SOFT_TIMEOUT_MS)

      try {
        const [historyResult, balancesResult] = await Promise.allSettled([
          getWalletHistory(normalizedWalletAddress, network, controller.signal),
          getWalletBalances(normalizedWalletAddress, network, controller.signal),
        ])

        if (fetchId !== fetchIdRef.current) return

        if (historyResult.status === 'fulfilled') {
          setHistory(historyResult.value)
        } else {
          const reason = historyResult.reason
          if (reason instanceof Error && reason.name !== 'AbortError') {
            console.warn('[useWalletHistory] history fetch failed:', reason)
          }
        }
        if (balancesResult.status === 'fulfilled') {
          setBalances(balancesResult.value)
        } else {
          const reason = balancesResult.reason
          if (reason instanceof Error && reason.name !== 'AbortError') {
            console.warn('[useWalletHistory] balances fetch failed:', reason)
          }
        }
      } catch (err) {
        if (fetchId === fetchIdRef.current) {
          console.error('[useWalletHistory] fetch error:', err)
        }
      } finally {
        window.clearTimeout(softTimeout)
        if (fetchId === fetchIdRef.current) {
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      fetchIdRef.current++
    }
  }, [walletAddress, network])

  const transactions = useMemo(() => flattenTransactions(history), [history])

  return { transactions, balances, loading }
}
