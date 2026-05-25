import { useCurrentAccount, useCurrentWallet } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LogoMark } from './components/LogoMark'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { Chat } from './pages/Chat'
import { Home } from './pages/Home'
import { Vault } from './pages/Vault'
import { getStoredSuiNetwork, NETWORK_SWITCH_TOAST_KEY, networkLabel, type SuiNetwork } from './lib/network'
import { networkKey } from './lib/storage'
import type { Page } from './types'

const PAGE_STORAGE_KEY = 'current-page'

const PAGE_TITLE: Record<Page, string> = {
  home: 'MnemoSui | AI Memory for Wallets',
  vault: 'Vault | MnemoSui',
  chat: 'AI Chat | MnemoSui',
}

function pageStorageKey(): string {
  return networkKey(getStoredSuiNetwork(), PAGE_STORAGE_KEY)
}

function readStoredPage(): Page {
  const stored = sessionStorage.getItem(pageStorageKey())
  return stored === 'home' || stored === 'vault' || stored === 'chat' ? stored : 'home'
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div
      className="app-page fade-in"
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: '14px', textAlign: 'center' }}>
        <div className="loading-logo" style={{ width: '58px', height: '58px', display: 'grid', placeItems: 'center' }}>
          <LogoMark size={46} />
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>{label}</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '3px' }}>
            Warming up wallet memory.
          </div>
        </div>
      </div>
    </div>
  )
}

function NetworkSwitchOverlay({ network }: { network: SuiNetwork }) {
  return (
    <div
      className="fade-in"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'color-mix(in srgb, var(--bg-page) 86%, transparent)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        className="app-card scale-in"
        style={{
          width: 'min(340px, 100%)',
          padding: '22px',
          display: 'grid',
          justifyItems: 'center',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        <div className="loading-logo" style={{ width: '48px', height: '48px', display: 'grid', placeItems: 'center' }}>
          <LogoMark size={38} />
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>Switching network...</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
            Connecting to Sui {networkLabel(network).toLowerCase()}.
          </div>
        </div>
      </div>
    </div>
  )
}

function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="slide-up"
      style={{
        position: 'fixed',
        top: 'calc(12px + var(--safe-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        width: 'min(440px, calc(100vw - 24px))',
        padding: '10px 14px',
        borderRadius: '9999px',
        border: '0.5px solid color-mix(in srgb, var(--accent-amber) 45%, transparent)',
        background: 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-elevated)',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      Connection lost. Retrying...
    </div>
  )
}

export default function App() {
  const account = useCurrentAccount()
  const { isConnecting } = useCurrentWallet()
  const [page, setPageState] = useState<Page>(() => readStoredPage())
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [switchingNetwork, setSwitchingNetwork] = useState<SuiNetwork | null>(null)
  const { toasts, addToast, removeToast } = useToast()
  const isRestoringWallet = isConnecting && !account

  const setPage = (nextPage: Page) => {
    sessionStorage.setItem(pageStorageKey(), nextPage)
    setPageState(nextPage)
  }

  useEffect(() => {
    document.title = PAGE_TITLE[page]
    sessionStorage.setItem(pageStorageKey(), page)
  }, [page])

  useEffect(() => {
    const raw = sessionStorage.getItem(NETWORK_SWITCH_TOAST_KEY)
    if (!raw) return

    sessionStorage.removeItem(NETWORK_SWITCH_TOAST_KEY)
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; type?: unknown }
      if (typeof parsed.message === 'string') {
        addToast(parsed.message, parsed.type === 'warning' || parsed.type === 'error' ? parsed.type : 'success')
      }
    } catch {
      return
    }
  }, [addToast])

  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    const onNetworkSwitching = (event: Event) => {
      const detail = (event as CustomEvent<{ network?: SuiNetwork }>).detail
      if (detail?.network) {
        setSwitchingNetwork(detail.network)
      }
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('mnemosui:network-switching', onNetworkSwitching)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('mnemosui:network-switching', onNetworkSwitching)
    }
  }, [])

  const handleDisconnected = () => {
    sessionStorage.removeItem(pageStorageKey())
    setPageState('home')
  }

  let content: ReactNode

  if (isRestoringWallet) {
    content = <LoadingScreen label="Restoring wallet session..." />
  } else if (page === 'home') {
    content = <Home onNavigate={setPage} />
  } else if (page === 'chat') {
    content = <Chat onNavigate={setPage} onDisconnected={handleDisconnected} addToast={addToast} />
  } else {
    content = <Vault onNavigate={setPage} onDisconnected={handleDisconnected} addToast={addToast} />
  }

  return (
    <>
      <div key={isRestoringWallet ? 'loading' : page} className="route-shell">
        {content}
      </div>
      {isOffline && <OfflineBanner />}
      {switchingNetwork && <NetworkSwitchOverlay network={switchingNetwork} />}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}
