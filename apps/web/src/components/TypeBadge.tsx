import { Zap } from 'lucide-react'
import type { MemoryType } from '../types'

const BADGE: Record<MemoryType, { color: string; label: string; icon?: 'target' }> = {
  trade_thesis: { color: 'var(--accent-amber)', label: 'Trade' },
  portfolio_snapshot: { color: 'var(--accent-teal)', label: 'Portfolio' },
  research_note: { color: 'var(--accent-purple)', label: 'Research' },
  tx_summary: { color: 'var(--accent-blue)', label: 'Transaction' },
  dao_vote: { color: 'var(--accent-coral)', label: 'DAO' },
  nft_event: { color: 'var(--accent-purple)', label: 'NFT' },
  manual_note: { color: 'var(--text-tertiary)', label: 'Note' },
  decision: { color: 'var(--accent-blue)', label: 'Decision', icon: 'target' },
}

export function typeLabel(type: MemoryType): string {
  return BADGE[type].label
}

export function typeColor(type: MemoryType): string {
  return BADGE[type].color
}

export function TypeBadge({ type }: { type: MemoryType }) {
  const badge = BADGE[type]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        width: 'fit-content',
        background: `color-mix(in srgb, ${badge.color} 15%, transparent)`,
        color: badge.color,
        fontSize: '10px',
        letterSpacing: '0.08em',
        fontWeight: 500,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: '9999px',
      }}
    >
      {badge.icon === 'target' && <Zap size={10} />}
      {badge.label}
    </span>
  )
}
