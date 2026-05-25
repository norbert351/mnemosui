import { useMemo, useState } from 'react'
import {
  getStoredSuiNetwork,
  NETWORK_SWITCH_TOAST_KEY,
  networkBadgeColor,
  networkLabel,
  setStoredSuiNetwork,
  type SuiNetwork,
} from '../lib/network'

interface NetworkSwitcherProps {
  compact?: boolean
  addToast?: (message: string, type?: 'success' | 'error' | 'warning') => void
  onSwitching?: (network: SuiNetwork) => void
}

interface NetworkBadgeProps {
  network?: SuiNetwork
  compact?: boolean
}

const NETWORKS: SuiNetwork[] = ['testnet', 'mainnet']

function networkSwitchToast(network: SuiNetwork): string {
  return `Connected to Sui ${networkLabel(network).toLowerCase().replace(/^\w/, letter => letter.toUpperCase())}`
}

function switchNetwork(
  nextNetwork: SuiNetwork,
  addToast?: (message: string, type?: 'success' | 'error' | 'warning') => void,
  onSwitching?: (network: SuiNetwork) => void,
) {
  const current = getStoredSuiNetwork()
  if (nextNetwork === current) return

  if (nextNetwork === 'mainnet') {
    const confirmed = window.confirm('Switch to Sui mainnet? Permanent saves will use mainnet Walrus.')
    if (!confirmed) return
  }

  onSwitching?.(nextNetwork)
  window.dispatchEvent(new CustomEvent('mnemosui:network-switching', {
    detail: { network: nextNetwork },
  }))
  setStoredSuiNetwork(nextNetwork)
  const message = networkSwitchToast(nextNetwork)
  sessionStorage.setItem(NETWORK_SWITCH_TOAST_KEY, JSON.stringify({ message, type: 'success' }))
  addToast?.(message, 'success')
  window.setTimeout(() => {
    window.location.reload()
  }, 250)
}

export function NetworkBadge({ network, compact = false }: NetworkBadgeProps) {
  const activeNetwork = network ?? getStoredSuiNetwork()
  const color = networkBadgeColor(activeNetwork)
  const label = networkLabel(activeNetwork)

  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minHeight: compact ? '22px' : '26px',
        padding: compact ? '0 7px' : '0 9px',
        borderRadius: '9999px',
        border: `0.5px solid color-mix(in srgb, ${color} 38%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        fontSize: compact ? '10px' : '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          background: color,
          boxShadow: `0 0 14px color-mix(in srgb, ${color} 65%, transparent)`,
        }}
      />
      {compact ? networkLabel(activeNetwork) : label}
    </span>
  )
}

export function NetworkSwitcher({ compact = false, addToast, onSwitching }: NetworkSwitcherProps) {
  const [activeNetwork] = useState<SuiNetwork>(() => getStoredSuiNetwork())
  const activeColor = useMemo(() => networkBadgeColor(activeNetwork), [activeNetwork])

  if (compact) {
    return (
      <button
        type="button"
        title={`Switch network. Current: ${networkLabel(activeNetwork)}`}
        aria-label={`Switch to ${activeNetwork === 'testnet' ? 'mainnet' : 'testnet'}`}
        onClick={() => switchNetwork(activeNetwork === 'testnet' ? 'mainnet' : 'testnet', addToast, onSwitching)}
        style={{
          width: '38px',
          height: '30px',
          borderRadius: '8px',
          border: `0.5px solid color-mix(in srgb, ${activeColor} 34%, transparent)`,
          background: `color-mix(in srgb, ${activeColor} 10%, transparent)`,
          color: activeColor,
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: 700,
        }}
      >
        {activeNetwork === 'mainnet' ? 'M' : 'T'}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Sui network"
      style={{
        display: 'inline-grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '32px',
        border: '0.5px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'color-mix(in srgb, var(--bg-surface) 62%, transparent)',
      }}
    >
      {NETWORKS.map(network => {
        const selected = network === activeNetwork
        const color = networkBadgeColor(network)

        return (
          <button
            key={network}
            type="button"
            aria-label={`Switch to ${networkLabel(network)}`}
            onClick={() => switchNetwork(network, addToast, onSwitching)}
            aria-pressed={selected}
            style={{
              minWidth: '72px',
              height: '32px',
              border: 'none',
              borderRight: network === 'testnet' ? '0.5px solid var(--border)' : 'none',
              background: selected ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
              color: selected ? color : 'var(--text-tertiary)',
              cursor: selected ? 'default' : 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {networkLabel(network)}
          </button>
        )
      })}
    </div>
  )
}
