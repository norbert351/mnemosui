import { useState, useEffect } from 'react'
import { getStoredSuiNetwork } from '../lib/network'
import { networkKey } from '../lib/storage'

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'theme'

function themeStorageKey(): string {
  return networkKey(getStoredSuiNetwork(), THEME_STORAGE_KEY)
}

// Apply theme immediately on module load to prevent FOUT
;(function applyThemeImmediately() {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(themeStorageKey())
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
  const theme = (stored === 'dark' || stored === 'light') ? stored : preferred
  document.documentElement.setAttribute('data-theme', theme)
})()

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(themeStorageKey()) as Theme | null
    if (stored === 'dark' || stored === 'light') return stored
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(themeStorageKey(), theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
