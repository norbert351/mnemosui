import { Plus, X } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { MemoryForm } from '../components/MemoryForm'
import { MemoryList } from '../components/MemoryList'
import { NetworkBadge } from '../components/NetworkSwitcher'
import { TxCard, TxEmptyState } from '../components/TxCard'
import { useMemories } from '../hooks/useMemories'
import { useWalletHistory } from '../hooks/useWalletHistory'
import { addressToHue, truncateAddress } from '../lib/format'
import { getStoredSuiNetwork } from '../lib/network'
import type { MemoryDraft, Page } from '../types'

interface Props {
  onNavigate: (page: Page) => void
  onDisconnected: () => void
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

export function Vault({ onNavigate, onDisconnected, addToast }: Props) {
  const account = useCurrentAccount()
  const walletAddress = account?.address?.toLowerCase() ?? ''
  const { memories, saveMemory, deleteMemory, isLoading, error, clearError, retryLoad } = useMemories(walletAddress)
  const { transactions, loading } = useWalletHistory(walletAddress)
  const [showForm, setShowForm] = useState(false)
  const [initialDraft, setInitialDraft] = useState<Partial<MemoryDraft> | undefined>(undefined)
  const hue = addressToHue(walletAddress)
  const network = getStoredSuiNetwork()
  const isMainnet = network === 'mainnet'

  const rightPanel = (
    <div className="slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}>Recent Activity</h2>
          <p style={{ margin: '3px 0 0', color: 'var(--text-tertiary)', fontSize: '11px' }}>Wallet events ready to save</p>
        </div>
        <NetworkBadge network={network} compact />
      </div>
      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div className="skeleton" style={{ height: '46px' }} />
          <div className="skeleton" style={{ height: '46px' }} />
          <div className="skeleton" style={{ height: '46px' }} />
        </div>
      ) : transactions.length > 0 ? (
        transactions.map((tx, index) => (
          <TxCard
            key={index}
            tx={tx}
            onSaveAsMemory={content => {
              setInitialDraft({ type: 'tx_summary', title: 'Transaction summary', content, tags: ['transaction'] })
              setShowForm(true)
            }}
          />
        ))
      ) : <TxEmptyState network={network} />}
    </div>
  )

  return (
    <Layout currentPage="vault" onNavigate={onNavigate} onDisconnected={onDisconnected} addToast={addToast} showRightPanel rightPanel={rightPanel}>
      <div style={{ padding: 'clamp(16px, 3vw, 24px)', maxWidth: '1280px', margin: '0 auto' }}>
        {error && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'color-mix(in srgb, var(--accent-coral) 12%, transparent)', border: '0.5px solid color-mix(in srgb, var(--accent-coral) 55%, transparent)', borderRadius: '10px', color: 'var(--text-primary)', padding: '10px 12px', marginBottom: '16px', animation: 'fadeSlideUp 200ms ease forwards' }}>
            <span>{error}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button onClick={retryLoad} style={{ height: '28px', border: '0.5px solid var(--border)', borderRadius: '7px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '0 9px', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
              <button onClick={clearError} aria-label="Dismiss error" style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          </div>
        )}

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 70) % 360} 80% 45%))` }} />
            <div style={{ minWidth: 0 }}>
              <div className="font-mono" style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{truncateAddress(walletAddress)}</div>
              <NetworkBadge />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent-teal)', border: '0.5px solid var(--border)', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px' }}>{memories.length} memories</span>
            <button
              onClick={() => {
                setInitialDraft(undefined)
                setShowForm(true)
              }}
              style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', borderRadius: '8px', background: 'var(--accent-blue)', color: 'var(--text-primary)', padding: '0 12px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} />
              New Memory
            </button>
          </div>
        </header>

        <MemoryList memories={memories} onDelete={deleteMemory} isLoading={isLoading} isMainnet={isMainnet} onOpenChat={() => onNavigate('chat')} />
      </div>

      {showForm && (
        <MemoryForm
          initialDraft={initialDraft}
          onSave={async draft => {
            try {
              if (isMainnet && !window.confirm('Mainnet Active: save this memory permanently to Walrus mainnet?')) {
                throw new Error('Mainnet save cancelled')
              }
              await saveMemory(draft)
              addToast('Memory saved to Walrus', 'success')
            } catch (saveError) {
              if (saveError instanceof Error && saveError.message === 'Mainnet save cancelled') {
                throw saveError
              }
              console.error('[Vault] Memory save failed', saveError)
              addToast('Failed to save memory', 'error')
              throw saveError
            }
          }}
          onClose={() => setShowForm(false)}
          isLoading={isLoading}
        />
      )}
    </Layout>
  )
}
