export type Page = 'home' | 'vault' | 'chat'

export type MemoryType =
  | 'trade_thesis'
  | 'portfolio_snapshot'
  | 'research_note'
  | 'tx_summary'
  | 'dao_vote'
  | 'nft_event'
  | 'manual_note'
  | 'decision'

export interface AIActionCard {
  id: string
  action: 'buy' | 'sell' | 'stake' | 'lp' | 'hold' | 'research' | 'other'
  token?: string
  allocation?: string
  risk: 'low' | 'medium' | 'high'
  reason: string
  confidence: 'low' | 'medium' | 'high'
  timestamp: string
}

export interface Memory {
  id: string
  walletAddress: string
  type: MemoryType
  title: string
  content: string
  summary: string
  tags: string[]
  txDigest?: string
  source?: 'manual' | 'ai_decision'
  metadata?: Record<string, unknown>
  blobId?: string
  saved: boolean
  createdAt: string
  updatedAt: string
}

export interface MemoryDraft {
  type: MemoryType
  title: string
  content: string
  tags: string[]
  txDigest?: string
  source?: 'manual' | 'ai_decision'
  metadata?: Record<string, unknown>
}

export interface BackendMemory {
  id: string
  walletAddress: string
  title: string
  content: string
  summary: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  actionCard?: AIActionCard
}

export interface WalletHistory {
  sent: unknown
  received: unknown
}
