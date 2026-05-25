import { useEffect, useMemo, useState } from 'react'
import { getWalletBalances, getWalletHistory } from '../lib/api'
import { getStoredSuiNetwork } from '../lib/network'

const HISTORY_SOFT_TIMEOUT_MS = 15_000

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

  useEffect(() => {
    if (!walletAddress) {
      setHistory(null)
      setBalances(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const normalizedWalletAddress = walletAddress.toLowerCase()
    const previousHistory = history
    const previousBalances = balances

    // Debounce to avoid rapid duplicate calls.
    const timer = setTimeout(async () => {
      setLoading(true)
      const softTimeout = window.setTimeout(() => {
        if (!cancelled) {
          console.warn('[useWalletHistory] request still in flight after soft timeout')
        }
      }, HISTORY_SOFT_TIMEOUT_MS)
      try {
        const [historyResult, balancesResult] = await Promise.allSettled([
          getWalletHistory(normalizedWalletAddress, network),
          getWalletBalances(normalizedWalletAddress, network),
        ])

        if (cancelled) return
        if (historyResult.status === 'fulfilled') {
          setHistory(historyResult.value)
        } else {
          console.warn('[useWalletHistory] history fetch failed:', historyResult.reason)
          setHistory(previousHistory)
        }
        if (balancesResult.status === 'fulfilled') {
          setBalances(balancesResult.value)
        } else {
          console.warn('[useWalletHistory] balances fetch failed:', balancesResult.reason)
          setBalances(previousBalances)
        }
      } catch (err) {
        console.error('[useWalletHistory] fetch error:', err)
        if (!cancelled) {
          setHistory(previousHistory)
          setBalances(previousBalances)
        }
      } finally {
        clearTimeout(softTimeout)
        if (!cancelled) setLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [walletAddress, network])

  const transactions = useMemo(() => flattenTransactions(history), [history])

  return { transactions, balances, loading }
}
