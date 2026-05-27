import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { useMemo } from 'react'
import { AIChat } from '../components/AIChat'
import { Layout } from '../components/Layout'
import { useMemories } from '../hooks/useMemories'
import { useWalletHistory } from '../hooks/useWalletHistory'
import { createWalrusSigner } from '../services/walrus/signer'
import type { Page } from '../types'

interface Props {
  onNavigate: (page: Page) => void
  onDisconnected: () => void
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

export function Chat({ onNavigate, onDisconnected, addToast }: Props) {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const walletAddress = account?.address?.toLowerCase()

  const walrusContext = useMemo(() => {
    if (!account || !suiClient) return undefined
    return {
      signer: createWalrusSigner(account.address, signAndExecuteTransaction, suiClient),
      suiClient,
    }
  }, [account, suiClient, signAndExecuteTransaction])

  const { memories, saveMemory } = useMemories(walletAddress, walrusContext)
  const { balances } = useWalletHistory(walletAddress)

  return (
    <Layout
      currentPage="chat"
      onNavigate={onNavigate}
      onDisconnected={onDisconnected}
      addToast={addToast}
    >
      {!walletAddress || !account ? (
        <div
          style={{
            height: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg-page)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="loading-logo" style={{ width: '42px', height: '42px', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <span>Connect wallet to start</span>
          </div>
        </div>
      ) : (
        <AIChat memories={memories} walletAddress={walletAddress} balances={balances} saveMemory={saveMemory} />
      )}
    </Layout>
  )
}
