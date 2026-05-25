import { ArrowRight, Clock3 } from 'lucide-react'
import { relativeDate, txDigestFromUnknown } from '../lib/format'
import type { SuiNetwork } from '../lib/network'

interface Props {
  tx: unknown
  onSaveAsMemory: (content: string) => void
}

function txLabel(tx: unknown): string {
  const text = JSON.stringify(tx).toLowerCase()
  if (text.includes('receive')) return 'Receive'
  if (text.includes('send')) return 'Send'
  if (text.includes('move') || text.includes('call')) return 'Contract call'
  return 'Transaction'
}

function txColor(label: string): string {
  if (label === 'Receive') return 'var(--accent-teal)'
  if (label === 'Send') return 'var(--accent-coral)'
  if (label === 'Contract call') return 'var(--accent-purple)'
  return 'var(--accent-blue)'
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function txTimestamp(tx: unknown): string | null {
  const record = readRecord(tx)
  if (!record) return null

  const candidates = [
    record.timestampMs,
    record.timestamp,
    readRecord(record.transaction)?.timestampMs,
    readRecord(record.effects)?.timestampMs,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const value = Number(candidate)
      return Number.isFinite(value) ? new Date(value).toISOString() : candidate
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return new Date(candidate).toISOString()
    }
  }

  return null
}

export function TxCard({ tx, onSaveAsMemory }: Props) {
  const digest = txDigestFromUnknown(tx)
  const label = txLabel(tx)
  const color = txColor(label)
  const timestamp = txTimestamp(tx)

  return (
    <div
      className="slide-up"
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '10px 1fr auto',
        alignItems: 'center',
        gap: '10px',
        padding: '11px 10px',
        border: '0.5px solid var(--border)',
        borderRadius: '10px',
        background: 'color-mix(in srgb, var(--bg-surface) 72%, transparent)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: color, boxShadow: `0 0 14px color-mix(in srgb, ${color} 56%, transparent)` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
        <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{digest.slice(0, 12)}...</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
          <Clock3 size={11} />
          {timestamp ? relativeDate(timestamp) : 'Recent activity'}
        </div>
      </div>
      <button
        onClick={() => onSaveAsMemory(`Transaction ${digest}: ${label}. ${JSON.stringify(tx).slice(0, 400)}`)}
        style={{
          height: '30px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 9px',
          border: '0.5px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        Save
        <ArrowRight size={12} />
      </button>
    </div>
  )
}

export function TxEmptyState({ network = 'testnet' }: { network?: SuiNetwork }) {
  const isMainnet = network === 'mainnet'

  return (
    <div className="app-card fade-in" style={{ minHeight: '220px', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '18px' }}>
      <div>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="20" stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity="0.5" />
          <path d="M28 18L38 28L28 38L18 28L28 18Z" stroke="var(--accent-blue)" />
        </svg>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0 2px' }}>No recent activity</p>
        {isMainnet ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>Mainnet wallet history is quiet.</p>
        ) : (
          <a href="https://faucet.sui.io/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', fontSize: '12px', textDecoration: 'none' }}>
            Open Sui testnet faucet
          </a>
        )}
      </div>
    </div>
  )
}
