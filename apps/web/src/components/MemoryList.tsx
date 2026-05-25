import type { Memory } from '../types'
import { ArrowRight, Sparkles } from 'lucide-react'
import { LogoMark } from './LogoMark'
import { MemoryCard } from './MemoryCard'
import { SkeletonCard } from './SkeletonCard'

interface Props {
  memories: Memory[]
  onDelete: (id: string) => void
  isLoading: boolean
  isMainnet?: boolean
  onOpenChat?: () => void
}

export function MemoryList({ memories, onDelete, isLoading, isMainnet = false, onOpenChat }: Props) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '420px', textAlign: 'center', padding: '18px' }}>
        <div className="app-card slide-up" style={{ width: 'min(520px, 100%)', padding: '28px', display: 'grid', justifyItems: 'center', gap: '14px', textAlign: 'center' }}>
          <div className="loading-logo" style={{ width: '56px', height: '56px', display: 'grid', placeItems: 'center' }}>
            <LogoMark size={40} />
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Sparkles size={12} />
              Vault ready
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', lineHeight: 1.2 }}>No memories saved yet</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
              Save your first trade thesis, research note, or AI decision.
            </p>
          </div>
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="hero-primary-cta"
              style={{ minWidth: '180px', height: '42px', borderRadius: '10px' }}
            >
              Open AI Chat
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {memories.map((memory, index) => (
        <div key={memory.id} style={{ animation: 'bounce-in 300ms cubic-bezier(0.16, 1, 0.3, 1)', animationDelay: `${index * 50}ms` }}>
          <MemoryCard memory={memory} onDelete={onDelete} isMainnet={isMainnet} />
        </div>
      ))}
    </div>
  )
}
