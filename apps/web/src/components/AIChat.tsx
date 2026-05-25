import { ArrowUp, Check, Loader2, Save, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { streamAiChat } from '../lib/api'
import { truncateAddress } from '../lib/format'
import { getStoredSuiNetwork, networkLabel } from '../lib/network'
import type { AIActionCard, ChatMessage, Memory, MemoryDraft } from '../types'
import { LogoMark } from './LogoMark'
import { NetworkBadge } from './NetworkSwitcher'

interface Props {
  memories: Memory[]
  walletAddress: string
  balances?: unknown
  saveMemory: (draft: MemoryDraft) => Promise<Memory>
}

const PROMPTS = [
  'Based on my portfolio, what should I buy?',
  'Should I stake or LP my SUI?',
  "What's my biggest portfolio risk?",
  'What mistakes should I avoid repeating?',
  'Which Sui ecosystem token fits my risk profile?',
  'Why did I buy this token?',
]

const ACTIONS: AIActionCard['action'][] = ['buy', 'sell', 'stake', 'lp', 'hold', 'research', 'other']
const RISK_LEVELS: Array<AIActionCard['risk']> = ['low', 'medium', 'high']
const CONFIDENCE_LEVELS: Array<AIActionCard['confidence']> = ['low', 'medium', 'high']

const ACTION_LABEL: Record<AIActionCard['action'], string> = {
  buy: 'Buy',
  sell: 'Sell',
  stake: 'Stake',
  lp: 'LP',
  hold: 'Hold',
  research: 'Research',
  other: 'Other',
}

type SaveState = 'saving' | 'saved' | 'error'

function normalizeAction(value: unknown): AIActionCard['action'] {
  return typeof value === 'string' && ACTIONS.includes(value as AIActionCard['action'])
    ? value as AIActionCard['action']
    : 'other'
}

function normalizeRisk(value: unknown): AIActionCard['risk'] {
  return typeof value === 'string' && RISK_LEVELS.includes(value as AIActionCard['risk'])
    ? value as AIActionCard['risk']
    : 'medium'
}

function normalizeConfidence(value: unknown): AIActionCard['confidence'] {
  return typeof value === 'string' && CONFIDENCE_LEVELS.includes(value as AIActionCard['confidence'])
    ? value as AIActionCard['confidence']
    : 'medium'
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function sanitizeAIContent(content: string) {
  return content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<tool_call>\s*(?:check_balances|check_wallet|get_balance|get_wallet)?\s*(?:\{[\s\S]*?\})?/gi, '')
    .replace(/\b(?:check_balances|check_wallet|get_balance|get_wallet)\b\s*(?:\{[\s\S]*?\})?/gi, '')
    .replace(/\s*\{[^{}]*"(?:address|wallet)"\s*:\s*"0x[^"]+"[^{}]*\}\s*/gi, '')
    .replace(/```(?:json|xml)?\s*<tool_call>[\s\S]*?<\/tool_call>\s*```/gi, '')
    .replace(/```[\s\S]*?```/g, match => {
      const inner = match.replace(/```/g, '')
      if (inner.includes('tool_call') || inner.includes('DECISION_CARD')) {
        return match
      }
      return match
    })
    .replace(/<tool_call>/gi, '')
    .replace(/<\/tool_call>/gi, '')
    .replace(/<function_call>[\s\S]*?<\/function_call>/gi, '')
    .replace(/\b(?:function|tool)\s*calls?\b[\s\S]{0,200}/gi, '')
    .trim()
}

function parseDecisionCard(content: string): { cleanContent: string; card: AIActionCard | null } {
  const marker = 'DECISION_CARD:'
  const markerIndex = content.lastIndexOf(marker)

  if (markerIndex === -1) {
    return { cleanContent: content.trim(), card: null }
  }

  const raw = content.slice(markerIndex + marker.length).trim()
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    return { cleanContent: content.trim(), card: null }
  }

  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>
    const cleanContent = content.slice(0, markerIndex).replace(/\s*---\s*$/, '').trim()

    return {
      cleanContent,
      card: {
        id: crypto.randomUUID(),
        action: normalizeAction(parsed.action),
        token: normalizeString(parsed.token),
        allocation: normalizeString(parsed.allocation),
        risk: normalizeRisk(parsed.risk),
        reason: normalizeString(parsed.reason) ?? 'AI suggested this decision.',
        confidence: normalizeConfidence(parsed.confidence),
        timestamp: new Date().toISOString(),
      },
    }
  } catch {
    return { cleanContent: content.trim(), card: null }
  }
}

function levelColor(level: AIActionCard['risk'] | AIActionCard['confidence']): string {
  if (level === 'low') return 'var(--accent-teal)'
  if (level === 'high') return 'var(--accent-coral)'
  return 'var(--accent-amber)'
}

function confidencePercent(level: AIActionCard['confidence']): number {
  if (level === 'high') return 88
  if (level === 'low') return 36
  return 62
}

function balanceCount(balances: unknown): number {
  if (Array.isArray(balances)) return balances.length
  if (balances && typeof balances === 'object' && Array.isArray((balances as { result?: unknown }).result)) {
    return ((balances as { result: unknown[] }).result).length
  }
  return 0
}

function CardStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: '0.5px solid var(--border)',
        borderRadius: '9999px',
        padding: '4px 8px',
        color: color ?? 'var(--text-secondary)',
        background: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
        fontSize: '11px',
        lineHeight: 1,
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <strong style={{ fontWeight: 600 }}>{value}</strong>
    </span>
  )
}

function TypingIndicator() {
  return (
    <div className="chat-status-note fade-in" role="status" aria-live="polite">
      <span className="chat-thinking-label">AI is thinking...</span>
      <span className="chat-thinking-dots" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    </div>
  )
}

function ActionCard({
  card,
  saveState,
  onSave,
  onDismiss,
}: {
  card: AIActionCard
  saveState?: SaveState
  onSave: (card: AIActionCard) => void
  onDismiss: (cardId: string) => void
}) {
  const isSaving = saveState === 'saving'
  const isSaved = saveState === 'saved'
  const tokenLabel = card.token ?? 'Portfolio'
  const confidence = confidencePercent(card.confidence)
  const accent = isSaved ? 'var(--accent-teal)' : 'var(--accent-blue)'

  return (
    <div
      className="app-card app-card-hover slide-up"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: isSaved
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-teal) 18%, var(--bg-surface)), color-mix(in srgb, var(--bg-surface) 95%, var(--accent-teal)))'
          : 'linear-gradient(135deg, color-mix(in srgb, var(--accent-blue) 12%, var(--bg-surface)), var(--bg-surface))',
        border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)`,
        borderRadius: '12px',
        padding: '14px',
        display: 'grid',
        gap: '12px',
        boxShadow: isSaved ? 'var(--shadow-elevated), var(--glow-teal)' : 'var(--shadow-card)',
        animation: isSaved ? 'successGlow 720ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent-blue) 18%, transparent), transparent 34%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
            <Zap size={12} />
            AI Decision
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 800, marginTop: '3px', lineHeight: 1.25 }}>
            {ACTION_LABEL[card.action]} <span style={{ color: 'var(--accent-teal)' }}>{tokenLabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(card.id)}
          aria-label="Dismiss decision card"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <CardStat label="Action" value={ACTION_LABEL[card.action]} color="var(--accent-blue)" />
        <CardStat label="Token" value={tokenLabel} />
        {card.allocation && <CardStat label="Allocation" value={card.allocation} />}
        <CardStat label="Risk" value={card.risk} color={levelColor(card.risk)} />
        <CardStat label="Confidence" value={card.confidence} color={levelColor(card.confidence)} />
      </div>

      <p style={{ position: 'relative', zIndex: 1, margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.65 }}>
        {card.reason}
      </p>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
          <span>Confidence</span>
          <span>{card.confidence.toUpperCase()}</span>
        </div>
        <div style={{ height: '7px', borderRadius: '9999px', background: 'var(--bg-elevated)', overflow: 'hidden', border: '0.5px solid var(--border)' }}>
          <div
            style={{
              width: `${confidence}%`,
              height: '100%',
              borderRadius: 'inherit',
              background: `linear-gradient(90deg, ${levelColor(card.confidence)}, var(--accent-blue))`,
              transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onSave(card)}
          disabled={isSaving || isSaved}
          style={{
            height: '34px',
            flex: '1 1 168px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            border: 'none',
            borderRadius: '8px',
            background: isSaved
              ? 'linear-gradient(135deg, var(--accent-teal), color-mix(in srgb, var(--accent-teal) 72%, var(--accent-blue)))'
              : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            color: 'white',
            padding: '0 12px',
            cursor: isSaving || isSaved ? 'default' : 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            opacity: isSaving ? 0.8 : 1,
            boxShadow: isSaved ? 'var(--glow-teal)' : 'var(--glow-blue)',
          }}
        >
          {isSaved ? <Check size={15} /> : isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isSaved ? 'Saved to Vault' : isSaving ? 'Saving...' : saveState === 'error' ? 'Retry Save' : 'Save Decision'}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(card.id)}
          style={{
            height: '34px',
            flex: '1 1 96px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: '0.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '0 10px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function friendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('429') || normalized.includes('rate')) {
    return 'Too many requests. Wait 30 seconds.'
  }

  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('failed to fetch')) {
    return 'Connection issue detected.'
  }

  if (normalized.includes('empty') || normalized.includes('no response')) {
    return 'AI could not generate a response.'
  }

  return 'Something went wrong. Please try again.'
}

export function AIChat({ memories, walletAddress, balances, saveMemory }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [responding, setResponding] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [slowProviderNotice, setSlowProviderNotice] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const [cardSaveState, setCardSaveState] = useState<Record<string, SaveState>>({})
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(() => new Set())
  const [lastError, setLastError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollEndRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)
  const savingCardsRef = useRef<Set<string>>(new Set())
  const replyIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const providerTimeoutRef = useRef<number | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const memoriesRef = useRef(memories)
  const balancesRef = useRef(balances)
  const network = getStoredSuiNetwork()
  const networkName = networkLabel(network)
  const memoryCount = memories.length
  const balanceTotal = balanceCount(balances)
  const walletSummary = useMemo(() => {
    const memoryLabel = memoryCount === 1 ? 'memory' : 'memories'
    const balanceLabel = balanceTotal === 1 ? 'balance' : 'balances'
    return `${truncateAddress(walletAddress)} | ${memoryCount} ${memoryLabel} | ${networkName} | ${balanceTotal} ${balanceLabel}`
  }, [walletAddress, memoryCount, balanceTotal, networkName])

  memoriesRef.current = memories
  balancesRef.current = balances
  messagesRef.current = messages

  const isStreaming = messages.some(message => message.streaming)
  const showEmptyState = messages.length === 0 && !responding
  const shellStyle = {
    '--keyboard-offset': `${keyboardInset}px`,
  } as CSSProperties

  useEffect(() => {
    abortControllerRef.current?.abort()
    if (providerTimeoutRef.current !== null) {
      window.clearTimeout(providerTimeoutRef.current)
      providerTimeoutRef.current = null
    }
    setMessages([])
    setCardSaveState({})
    setDismissedCards(new Set())
    setLastError(null)
    setResponding(false)
    setWaiting(false)
    setSlowProviderNotice(false)
    lockRef.current = false
  }, [walletAddress])

  useEffect(() => {
    let frame = 0
    let followUpFrame = 0

    const scrollToBottom = () => {
      const el = scrollRef.current
      if (el) {
        el.scrollTop = el.scrollHeight
      }
      scrollEndRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' })
    }

    frame = window.requestAnimationFrame(() => {
      scrollToBottom()
      followUpFrame = window.requestAnimationFrame(scrollToBottom)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(followUpFrame)
    }
  }, [messages, waiting, slowProviderNotice])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardInset(Math.round(inset))
    }

    updateKeyboardInset()
    viewport.addEventListener('resize', updateKeyboardInset)
    viewport.addEventListener('scroll', updateKeyboardInset)
    window.addEventListener('orientationchange', updateKeyboardInset)

    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset)
      viewport.removeEventListener('scroll', updateKeyboardInset)
      window.removeEventListener('orientationchange', updateKeyboardInset)
    }
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (providerTimeoutRef.current !== null) {
        window.clearTimeout(providerTimeoutRef.current)
      }
    }
  }, [])

  async function handleSaveDecision(card: AIActionCard) {
    const currentState = cardSaveState[card.id]
    if (currentState === 'saved' || currentState === 'saving' || savingCardsRef.current.has(card.id)) {
      return
    }

    if (network === 'mainnet' && !window.confirm('Mainnet Active: save this AI decision permanently to Walrus mainnet?')) {
      return
    }

    savingCardsRef.current.add(card.id)
    setCardSaveState(prev => ({ ...prev, [card.id]: 'saving' }))

    try {
      const token = card.token?.trim()
      const tokenLabel = token || 'Portfolio'
      const actionLabel = ACTION_LABEL[card.action].toUpperCase()
      const now = new Date().toISOString()
      const content = [
        `AI decision: ${actionLabel} ${tokenLabel}`,
        card.allocation ? `Allocation: ${card.allocation}` : undefined,
        `Risk: ${card.risk}`,
        `AI confidence: ${card.confidence}`,
        `AI reasoning: ${card.reason}`,
        `Wallet address: ${walletAddress}`,
        `Saved on network: ${networkName}`,
        `Originating timestamp: ${card.timestamp}`,
      ].filter(Boolean).join('\n')

      await saveMemory({
        type: 'decision',
        title: `${actionLabel} ${tokenLabel} - AI Decision`,
        content,
        tags: ['ai-decision', card.action, token?.toLowerCase()].filter((tag): tag is string => Boolean(tag)),
        source: 'ai_decision',
        metadata: {
          originatingTimestamp: card.timestamp,
          savedAt: now,
          walletAddress,
          tokenReference: token ?? null,
          action: card.action,
          allocation: card.allocation ?? null,
          aiConfidence: card.confidence,
          riskLevel: card.risk,
          aiReasoning: card.reason,
          network,
        },
      })

      setCardSaveState(prev => ({ ...prev, [card.id]: 'saved' }))
    } catch {
      setCardSaveState(prev => ({ ...prev, [card.id]: 'error' }))
    } finally {
      savingCardsRef.current.delete(card.id)
    }
  }

  function dismissCard(cardId: string) {
    setDismissedCards(prev => {
      const next = new Set(prev)
      next.add(cardId)
      return next
    })
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || lockRef.current) return

    lockRef.current = true
    setLastError(null)
    setSlowProviderNotice(false)

    if (providerTimeoutRef.current !== null) {
      window.clearTimeout(providerTimeoutRef.current)
      providerTimeoutRef.current = null
    }

    const history: ChatMessage[] = [...messagesRef.current, { role: 'user', content }]
    setMessages(history)
    setInput('')
    setResponding(true)
    setWaiting(true)

    const replyId = crypto.randomUUID()
    replyIdRef.current = replyId
    let streamChunkCount = 0
    let gotResponse = false
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    providerTimeoutRef.current = window.setTimeout(() => {
      if (!abortController.signal.aborted && replyIdRef.current === replyId) {
        setSlowProviderNotice(true)
      }
    }, 20_000)

    try {
      setMessages(prev => [
        ...prev,
        { id: replyId, role: 'assistant', content: '', streaming: true },
      ])

      await streamAiChat(
        walletAddress,
        memoriesRef.current,
        history,
        textChunk => {
          if (abortController.signal.aborted) return

          const cleanedDelta = sanitizeAIContent(textChunk)

          if (!cleanedDelta.trim()) {
            return
          }

          gotResponse = true
          setWaiting(false)
          setSlowProviderNotice(false)
          streamChunkCount++
          setMessages(prev =>
            prev.map(message =>
              message.id === replyId
                ? { ...message, content: `${message.content}${cleanedDelta}`, streaming: true }
                : message,
            ),
          )
        },
        abortController.signal,
        balancesRef.current,
        network,
      )

      if (abortController.signal.aborted) {
        return
      }

      setMessages(prev => {
        const replyMessage = prev.find(message => message.id === replyId)
        if (replyMessage && !sanitizeAIContent(replyMessage.content).trim()) {
          return prev.map(message =>
            message.id === replyId
              ? { ...message, content: 'AI could not generate a response.', streaming: false }
              : message,
          )
        }

        return prev.map(message => {
          if (message.id !== replyId) {
            return { ...message, streaming: false }
          }

          const sanitizedContent = sanitizeAIContent(message.content)
          const parsed = parseDecisionCard(sanitizedContent)
          return {
            ...message,
            content: parsed.cleanContent,
            actionCard: parsed.card ?? message.actionCard,
            streaming: false,
          }
        })
      })
    } catch (err) {
      if (abortController.signal.aborted) {
        return
      }

      const friendly = friendlyErrorMessage(err)
      setLastError(friendly)
      setMessages(prev => {
        const hasReply = prev.some(message => message.id === replyId)
        if (hasReply) {
          return prev.map(message =>
            message.id === replyId
              ? { ...message, content: friendly, streaming: false }
              : { ...message, streaming: false },
          )
        }

        return [
          ...prev,
          { role: 'assistant', content: friendly },
        ]
      })
    } finally {
      const wasAborted = abortController.signal.aborted
      abortControllerRef.current = null
      if (providerTimeoutRef.current !== null) {
        window.clearTimeout(providerTimeoutRef.current)
        providerTimeoutRef.current = null
      }

      if (!wasAborted && !gotResponse && streamChunkCount === 0) {
        setMessages(prev =>
          prev.map(message =>
            message.id === replyId && !message.content.trim()
              ? { ...message, content: 'AI could not generate a response.', streaming: false }
              : message,
          ),
        )
      }

      replyIdRef.current = null
      setResponding(false)
      setWaiting(false)
      setSlowProviderNotice(false)
      lockRef.current = false
    }
  }

  return (
    <section className="chat-shell" style={shellStyle}>
      <header className="chat-topbar fade-in">
        <div className="chat-topbar-row">
          <div className="chat-brand">
            <div className="loading-logo chat-brand-icon">
              <LogoMark size={28} />
            </div>
            <div className="chat-brand-copy">
              <div className="chat-brand-title">MnemoSui AI</div>
              <div className="chat-brand-subtitle">Wallet memory terminal</div>
            </div>
          </div>

          <div className="chat-topbar-badges">
            <NetworkBadge network={network} />
            <span className="chat-summary-pill">{walletSummary}</span>
          </div>
        </div>

        {network === 'testnet' && (
          <div className="chat-network-warning">
            Testnet data may be reset.
          </div>
        )}
      </header>

      <div
        ref={scrollRef}
        className="chat-scroll"
        style={{
          paddingBottom: 'calc(24px + var(--keyboard-offset, 0px))',
        }}
      >
        {showEmptyState ? (
          <div className="chat-empty-state slide-up">
            <div className="chat-empty-icon loading-logo">
              <LogoMark size={42} />
            </div>
            <div className="chat-empty-copy">
              <h1>Your wallet has a memory now.</h1>
              <p>Ask MnemoSui about your trades, portfolio, research, or decisions.</p>
            </div>

            <div className="chat-empty-prompts">
              {PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className="chat-prompt-chip"
                  onClick={() => void send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const showAvatar = !isUser && (idx === 0 || messages[idx - 1]?.role !== 'assistant')

              if (!isUser && msg.streaming && !msg.content.trim()) {
                return null
              }

              return (
                <div key={msg.id ?? idx} style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      gap: '10px',
                    }}
                  >
                    {!isUser && (
                      <div className="chat-avatar-wrap">
                        {showAvatar ? <LogoMark size={16} /> : null}
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: isUser ? 'min(82%, 740px)' : 'min(86%, 820px)',
                        width: 'fit-content',
                        display: 'grid',
                        gap: '10px',
                      }}
                    >
                      <div
                        className={isUser ? 'chat-bubble chat-bubble-user slide-up' : 'chat-bubble chat-bubble-assistant slide-up'}
                      >
                        {msg.content}
                        {msg.streaming ? <span className="chat-cursor" aria-hidden="true">|</span> : null}
                      </div>
                      {!isUser && msg.actionCard && !dismissedCards.has(msg.actionCard.id) && (
                        <ActionCard
                          card={msg.actionCard}
                          saveState={cardSaveState[msg.actionCard.id]}
                          onSave={card => { void handleSaveDecision(card) }}
                          onDismiss={dismissCard}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {(waiting || isStreaming) && (
              <div className="chat-status-wrap">
                <div className="chat-avatar-wrap">
                  <LogoMark size={16} />
                </div>
                <TypingIndicator />
              </div>
            )}

            {slowProviderNotice && (responding || waiting) && (
              <div className="chat-status-wrap">
                <div className="chat-avatar-wrap">
                  <LogoMark size={16} />
                </div>
                <div className="chat-status-note chat-status-note-muted fade-in">
                  <span>Still working... the AI provider may be slow.</span>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={scrollEndRef} />
      </div>

      <form
        className="chat-composer mobile-safe-bottom"
        onSubmit={event => {
          event.preventDefault()
          void send(input)
        }}
      >
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send(input)
            }
          }}
          placeholder="Ask MnemoSui anything..."
          rows={1}
          className="chat-textarea"
        />
        <button
          type="submit"
          disabled={!input.trim() || responding}
          aria-label="Send message"
          className="chat-send-button"
        >
          <ArrowUp size={16} />
        </button>
      </form>

    </section>
  )
}
