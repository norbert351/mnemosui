import { CheckCircle2, Copy, ExternalLink, LogOut, Wallet, X } from 'lucide-react'
import { useDisconnectWallet } from '@mysten/dapp-kit'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addressToHue, truncateAddress } from '../lib/format'
import { getStoredSuiNetwork, NETWORK_CONFIGS, networkLabel } from '../lib/network'
import { NetworkBadge } from './NetworkSwitcher'

interface Props {
  address: string
  isMobile: boolean
  compact?: boolean
  onDisconnected: () => void
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

function explorerUrl(address: string): string {
  const network = getStoredSuiNetwork()
  return `${NETWORK_CONFIGS[network].explorerBaseUrl}/account/${address}`
}

export function WalletMenu({ address, isMobile, compact = false, onDisconnected, addToast }: Props) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const disconnectWallet = useDisconnectWallet()
  const hue = addressToHue(address)
  const network = getStoredSuiNetwork()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address)
    addToast('Address copied', 'success')
    setOpen(false)
  }

  const openExplorer = () => {
    window.open(explorerUrl(address), '_blank', 'noopener,noreferrer')
    addToast('Opened SuiScan', 'success')
    setOpen(false)
  }

  const disconnect = async () => {
    try {
      await disconnectWallet.mutateAsync()
      setOpen(false)
      addToast('Wallet disconnected', 'success')
      onDisconnected()
    } catch {
      addToast('Failed to disconnect wallet', 'error')
    }
  }

  const avatar = (
    <div
      style={{
        position: 'relative',
        width: compact ? '34px' : '38px',
        height: compact ? '34px' : '38px',
        borderRadius: '9999px',
        padding: '2px',
        background: `linear-gradient(135deg, hsl(${hue} 84% 58%), hsl(${(hue + 70) % 360} 84% 48%))`,
        boxShadow: 'var(--glow-teal)',
        animation: 'breathe 3s ease-in-out infinite',
        flexShrink: 0,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: '9999px', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center' }}>
        <Wallet size={compact ? 14 : 16} color="var(--accent-blue)" />
      </div>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-1px',
          bottom: '-1px',
          width: '9px',
          height: '9px',
          borderRadius: '9999px',
          background: 'var(--accent-teal)',
          border: '2px solid var(--bg-elevated)',
          animation: 'dotPulse 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        title={compact ? `${truncateAddress(address)} | ${networkLabel(network)}` : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open wallet menu"
        onClick={() => setOpen(value => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          gap: '10px',
          padding: compact ? '8px 0' : '10px',
          borderRadius: '12px',
          border: `0.5px solid ${hovered || open ? 'var(--border-hover)' : 'var(--border)'}`,
          background: hovered || open ? 'color-mix(in srgb, var(--bg-surface) 72%, transparent)' : 'color-mix(in srgb, var(--bg-surface) 44%, transparent)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'background 150ms ease, border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          boxShadow: hovered || open ? 'var(--glow-blue)' : 'none',
        }}
      >
        {avatar}
        {!compact && (
          <span style={{ minWidth: 0, textAlign: 'left' }}>
            <span className="font-mono" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '12px' }}>
              {truncateAddress(address)} | {networkLabel(network)}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-teal)', fontSize: '11px' }}>
              <CheckCircle2 size={11} />
              Connected
            </span>
          </span>
        )}
      </button>

      {open && !isMobile && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            left: compact ? '54px' : '0',
            bottom: 'calc(100% + 10px)',
            width: '260px',
            padding: '12px',
            borderRadius: '14px',
            border: '0.5px solid var(--border)',
            background: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow-elevated)',
            transformOrigin: 'bottom left',
            animation: 'fadeSlideUp 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            zIndex: 50,
          }}
        >
          <WalletMenuContent address={address} copyAddress={copyAddress} openExplorer={openExplorer} disconnect={disconnect} disconnecting={disconnectWallet.isPending} />
        </div>
      )}

      {open && isMobile && (
        <div
          role="presentation"
          onClick={event => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'color-mix(in srgb, var(--bg-page) 72%, transparent)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            role="menu"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '18px 18px 0 0',
              borderTop: '0.5px solid var(--border)',
              background: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow-elevated)',
              animation: 'fadeSlideUp 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Wallet controls</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close wallet menu" style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <WalletMenuContent address={address} copyAddress={copyAddress} openExplorer={openExplorer} disconnect={disconnect} disconnecting={disconnectWallet.isPending} />
          </div>
        </div>
      )}
    </div>
  )
}

function WalletMenuContent({
  address,
  copyAddress,
  openExplorer,
  disconnect,
  disconnecting,
}: {
  address: string
  copyAddress: () => void
  openExplorer: () => void
  disconnect: () => void
  disconnecting: boolean
}) {
  const network = getStoredSuiNetwork()

  return (
    <div>
      <div style={{ display: 'grid', gap: '10px', paddingBottom: '10px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)', fontSize: '11px', overflowWrap: 'anywhere' }}>{address}</span>
          <button type="button" onClick={copyAddress} aria-label="Copy wallet address" style={{ border: '0.5px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderRadius: '6px', width: '28px', height: '28px', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Copy size={13} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <NetworkBadge network={network} compact />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Wallet connected</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '6px', paddingTop: '10px' }}>
        <MenuAction icon={<Copy size={14} />} label="Copy Address" onClick={copyAddress} />
        <MenuAction icon={<ExternalLink size={14} />} label="View on SuiScan" onClick={openExplorer} />
        <MenuAction icon={<LogOut size={14} />} label={disconnecting ? 'Disconnecting...' : 'Disconnect Wallet'} danger onClick={disconnect} disabled={disconnecting} />
      </div>
    </div>
  )
}

function MenuAction({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '0 9px',
        border: 'none',
        borderRadius: '8px',
        background: hovered ? 'color-mix(in srgb, var(--bg-surface) 78%, transparent)' : 'transparent',
        color: danger && hovered ? 'var(--accent-coral)' : 'var(--text-secondary)',
        cursor: disabled ? 'wait' : 'pointer',
        fontSize: '12px',
        transition: 'background 150ms ease, color 150ms ease, transform 150ms ease',
        textAlign: 'left',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
