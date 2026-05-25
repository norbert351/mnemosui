import { useCurrentAccount } from '@mysten/dapp-kit'
import { AIChat } from '../components/AIChat'
import { Layout } from '../components/Layout'
import { useMemories } from '../hooks/useMemories'
import { useWalletHistory } from '../hooks/useWalletHistory'
import type { Page } from '../types'

interface Props {
  onNavigate: (page: Page) => void
  onDisconnected: () => void
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

export function Chat({ onNavigate, onDisconnected, addToast }: Props) {
  const account = useCurrentAccount()
  const walletAddress = account?.address?.toLowerCase()
  const { memories, saveMemory } = useMemories(walletAddress)
  const { balances } = useWalletHistory(walletAddress)

  return (
    <Layout
      currentPage="chat"
      onNavigate={onNavigate}
      onDisconnected={onDisconnected}
      addToast={addToast}
    >
      {!walletAddress ? (
        <div
          style={{
            height: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg-page)',
            color: 'var(--text-secondary)',
          }}
        >
          Restoring wallet session...
        </div>
      ) : (
        <AIChat memories={memories} walletAddress={walletAddress} balances={balances} saveMemory={saveMemory} />
      )}
    </Layout>
  )
}
