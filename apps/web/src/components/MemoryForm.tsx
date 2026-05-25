import { Check, Link2, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import type { MemoryDraft, MemoryType } from '../types'
import { typeColor, typeLabel } from './TypeBadge'

interface Props {
  onSave: (draft: MemoryDraft) => Promise<void>
  onClose: () => void
  isLoading: boolean
  initialDraft?: Partial<MemoryDraft>
}

const TYPES: MemoryType[] = [
  'trade_thesis',
  'portfolio_snapshot',
  'research_note',
  'tx_summary',
  'dao_vote',
  'nft_event',
  'manual_note',
  'decision',
]

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    height: '40px',
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  }
}

export function MemoryForm({ onSave, onClose, isLoading, initialDraft }: Props) {
  const [type, setType] = useState<MemoryType>(initialDraft?.type ?? 'manual_note')
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [content, setContent] = useState(initialDraft?.content ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialDraft?.tags ?? [])
  const [txDigest, setTxDigest] = useState(initialDraft?.txDigest ?? '')
  const [isClosing, setIsClosing] = useState(false)
  const [saved, setSaved] = useState(false)

  const close = () => {
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }

  const addTag = (value: string) => {
    const tag = value.trim()
    if (!tag || tags.includes(tag)) return
    setTags(prev => [...prev, tag])
    setTagInput('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim() || isLoading) return

    try {
      await onSave({
        type,
        title: title.trim(),
        content: content.trim(),
        tags,
        txDigest: txDigest.trim() || undefined,
      })
      setSaved(true)
      window.setTimeout(close, 800)
    } catch (error) {
      if (error instanceof Error && error.message === 'Mainnet save cancelled') {
        return
      }
      console.error('[MemoryForm] Save failed', error)
    }
  }

  const titleColor = title.length >= 80 ? 'var(--accent-coral)' : title.length > 60 ? 'var(--accent-amber)' : 'var(--text-tertiary)'

  return (
    <div
      onClick={event => {
        if (event.target === event.currentTarget) close()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: '18px',
        background: 'color-mix(in srgb, var(--bg-page) 86%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <form
        onSubmit={event => { void submit(event) }}
        className={isClosing ? 'modal-exit' : 'modal-enter'}
        style={{
          width: 'min(540px, 92vw)',
          maxHeight: 'min(86vh, 760px)',
          overflowY: 'auto',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>New memory</h2>
          <button type="button" onClick={close} aria-label="Close form" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ display: 'grid', gap: '6px', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Type
          <select
            value={type}
            onChange={event => setType(event.target.value as MemoryType)}
            style={inputStyle()}
            onFocus={event => {
              event.currentTarget.style.borderColor = 'var(--accent-blue)'
              event.currentTarget.style.boxShadow = 'var(--glow-blue)'
            }}
            onBlur={event => {
              event.currentTarget.style.borderColor = 'var(--border)'
              event.currentTarget.style.boxShadow = 'none'
            }}
          >
            {TYPES.map(item => <option key={item} value={item}>{typeLabel(item)}</option>)}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '6px', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            Title
            <span style={{ color: titleColor }}>{title.length}/80</span>
          </span>
          <input
            value={title}
            maxLength={80}
            onChange={event => setTitle(event.target.value)}
            placeholder="A title for this memory..."
            style={inputStyle()}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Content
          <textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            placeholder="Describe this memory in full detail..."
            style={{ ...inputStyle(), minHeight: '120px', maxHeight: '240px', resize: 'vertical', padding: '10px 12px', lineHeight: 1.6, height: 'auto' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Tags
          <input
            value={tagInput}
            onChange={event => setTagInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addTag(tagInput)
              }
              if (event.key === 'Backspace' && tagInput === '') setTags(prev => prev.slice(0, -1))
            }}
            placeholder="Add tags (press Enter or comma)"
            style={inputStyle()}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: tags.length > 0 ? '0 0 14px' : 0 }}>
          {tags.map(tag => (
            <span
              key={tag}
              className="animate-bounce-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: '9999px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                padding: '2px 10px 2px 8px',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags(prev => prev.filter(item => item !== tag))}
                aria-label={`Remove ${tag} tag`}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>

        <label style={{ display: 'grid', gap: '6px', marginBottom: '18px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Transaction link
          <span style={{ position: 'relative' }}>
            <Link2 size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-tertiary)' }} />
            <input
              value={txDigest}
              onChange={event => setTxDigest(event.target.value)}
              placeholder="Link a transaction digest (optional)"
              style={{ ...inputStyle(), paddingLeft: '36px' }}
            />
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>optional</span>
        </label>

        <button
          type="submit"
          disabled={isLoading || saved || !title.trim() || !content.trim()}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '8px',
            border: 'none',
            background: saved
              ? 'var(--accent-teal)'
              : isLoading
                ? 'linear-gradient(90deg, var(--accent-blue), var(--accent-teal), var(--accent-blue))'
                : 'var(--accent-blue)',
            backgroundSize: isLoading ? '200% 100%' : undefined,
            animation: isLoading ? 'shimmer 2s linear infinite' : undefined,
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isLoading ? 'wait' : 'pointer',
            fontWeight: 700,
          }}
        >
          {saved ? <Check size={16} /> : isLoading ? <Loader2 size={16} className="animate-spin" /> : <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: typeColor(type) }} />}
          {saved ? 'Saved to Vault' : isLoading ? 'Saving to Walrus...' : 'Save Memory'}
        </button>
      </form>
    </div>
  )
}
