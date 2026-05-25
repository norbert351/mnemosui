import { AlertTriangle, House, LayoutDashboard, MessageSquare } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import type { SuiNetwork } from '../lib/network'
import { getStoredSuiNetwork } from '../lib/network'
import type { Page } from '../types'
import { LogoMark } from './LogoMark'
import { NetworkBadge, NetworkSwitcher } from './NetworkSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { WalletMenu } from './WalletMenu'

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
  onDisconnected: () => void
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void
  showRightPanel?: boolean
  rightPanel?: React.ReactNode
  children: React.ReactNode
}

function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return width
}

function NavButton({ active, icon, label, collapsed, onClick }: {
  active: boolean
  icon: React.ReactNode
  label: string
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="sidebar-item"
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '10px',
        padding: collapsed ? '0' : '0 14px',
        border: 'none',
        borderRadius: '10px',
        background: active ? 'color-mix(in srgb, var(--accent-blue) 13%, transparent)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: '9px',
          bottom: '9px',
          width: '3px',
          borderRadius: '9999px',
          background: 'var(--accent-blue)',
          opacity: active ? 1 : 0,
          transform: active ? 'scaleY(1)' : 'scaleY(0.4)',
          transition: 'var(--transition-premium)',
        }}
      />
      {icon}
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  )
}

function TestnetWarning() {
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 10px',
        borderRadius: '10px',
        border: '0.5px solid color-mix(in srgb, var(--accent-amber) 32%, transparent)',
        background: 'color-mix(in srgb, var(--accent-amber) 10%, transparent)',
        color: 'var(--text-secondary)',
        fontSize: '11px',
        lineHeight: 1.35,
      }}
    >
      <AlertTriangle size={13} color="var(--accent-amber)" />
      <span>Testnet data may be reset.</span>
    </div>
  )
}

export function Layout({ currentPage, onNavigate, onDisconnected, addToast, showRightPanel = false, rightPanel, children }: Props) {
  const account = useCurrentAccount()
  const width = useViewport()
  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1024
  const collapsed = isTablet
  const address = account?.address ?? ''
  const network = getStoredSuiNetwork()
  const onSwitching = (nextNetwork: SuiNetwork) => {
    addToast(`Switching to Sui ${nextNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}...`, 'warning')
  }

  return (
    <div className="app-page" style={{ display: 'flex' }}>
      {!isMobile && (
        <aside
          style={{
            width: collapsed ? '68px' : '252px',
            borderRight: '0.5px solid var(--border)',
            background: 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 200ms ease',
            boxShadow: '8px 0 32px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ height: '68px', display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '0 18px' : '0 20px' }}>
            <LogoMark size={22} className="logo-breathe" />
            {!collapsed && <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>MnemoSui</span>}
          </div>

          <div style={{ padding: collapsed ? '0 12px 12px' : '0 16px 14px', display: 'grid', gap: '10px', justifyItems: collapsed ? 'center' : 'stretch' }}>
            <NetworkSwitcher compact={collapsed} addToast={addToast} onSwitching={onSwitching} />
            {!collapsed && <NetworkBadge network={network} />}
            {!collapsed && network === 'testnet' && <TestnetWarning />}
          </div>

          <nav aria-label="App navigation" style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px' }}>
            <NavButton active={currentPage === 'home'} icon={<House size={18} />} label="Home" collapsed={collapsed} onClick={() => onNavigate('home')} />
            <NavButton active={currentPage === 'vault'} icon={<LayoutDashboard size={18} />} label="Vault" collapsed={collapsed} onClick={() => onNavigate('vault')} />
            <NavButton active={currentPage === 'chat'} icon={<MessageSquare size={18} />} label="Chat" collapsed={collapsed} onClick={() => onNavigate('chat')} />
          </nav>

          <div style={{ height: '1px', background: 'var(--border)', margin: '10px 16px 0' }} />

          <div style={{ marginTop: 'auto', padding: collapsed ? '12px 10px' : '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {address && (
              <WalletMenu
                address={address}
                isMobile={isMobile}
                compact={collapsed}
                addToast={addToast}
                onDisconnected={onDisconnected}
              />
            )}
            {!collapsed && (
              <>
                <div style={{ height: '1px', background: 'var(--border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Appearance</span>
                  <ThemeToggle size="sm" />
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0, paddingBottom: isMobile ? 'calc(76px + var(--safe-bottom))' : 0 }}>
        {children}
      </main>

      {!isMobile && showRightPanel && (
        <aside
          style={{
            width: width < 1280 ? '292px' : '332px',
            borderLeft: '0.5px solid var(--border)',
            background: 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
            padding: '18px',
            overflowY: 'auto',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.06)',
          }}
        >
          {rightPanel}
        </aside>
      )}

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            minHeight: '68px',
            background: 'color-mix(in srgb, var(--bg-elevated) 96%, transparent)',
            borderTop: '0.5px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr auto auto',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px calc(8px + var(--safe-bottom))',
            zIndex: 20,
            boxShadow: '0 -14px 40px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <NavButton active={currentPage === 'home'} icon={<House size={18} />} label="Home" collapsed={width < 480} onClick={() => onNavigate('home')} />
          <NavButton active={currentPage === 'vault'} icon={<LayoutDashboard size={18} />} label="Vault" collapsed={width < 480} onClick={() => onNavigate('vault')} />
          <NavButton active={currentPage === 'chat'} icon={<MessageSquare size={18} />} label="Chat" collapsed={width < 480} onClick={() => onNavigate('chat')} />
          <NetworkSwitcher compact addToast={addToast} onSwitching={onSwitching} />
          {address ? (
            <WalletMenu address={address} isMobile addToast={addToast} onDisconnected={onDisconnected} compact />
          ) : (
            <ThemeToggle />
          )}
        </div>
      )}
    </div>
  )
}
