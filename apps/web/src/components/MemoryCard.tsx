import { Check, ChevronDown, Copy, ExternalLink, Trash2, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Memory } from '../types'
import { relativeDate, summarizeContent } from '../lib/format'
import { TypeBadge, typeColor, typeLabel } from './TypeBadge'

interface Props {
  memory: Memory
  onDelete: (id: string) => void
  isMainnet?: boolean
}

const CONTENT_CLAMP_LINES = 5

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function metadataItems(memory: Memory) {
  const items = [
    { label: 'Created', value: relativeDate(memory.createdAt) },
    { label: 'Updated', value: relativeDate(memory.updatedAt) },
  ]

  if (memory.blobId) {
    items.push({ label: 'Blob', value: `${memory.blobId.slice(0, 6)}...${memory.blobId.slice(-6)}` })
  }

  return items
}

export function MemoryCard({ memory, onDelete, isMainnet = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isWalrusDown = memory.content.includes('Content temporarily unavailable')
  const isDecision = memory.type === 'decision'
  const accent = typeColor(memory.type)
  const typeName = typeLabel(memory.type)
  const summary = memory.summary || summarizeContent(memory.content)
  const contentIsLong = memory.content.length > 420 || memory.content.split(/\r?\n/).length > CONTENT_CLAMP_LINES
  const meta = useMemo(() => metadataItems(memory), [memory])

  const handleDelete = () => {
    const message = isMainnet
      ? 'Mainnet Active: remove this memory from your local vault index? The Walrus record remains permanent.'
      : 'Delete this memory?'
    if (!window.confirm(message)) return
    setDeleting(true)
    window.setTimeout(() => onDelete(memory.id), 200)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(memory.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const contentStyle: CSSProperties = expanded
    ? {
        color: 'var(--text-secondary)',
        fontSize: '13px',
        lineHeight: 1.65,
        margin: 0,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }
    : {
        color: 'var(--text-secondary)',
        fontSize: '13px',
        lineHeight: 1.65,
        margin: 0,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        display: '-webkit-box',
        WebkitLineClamp: CONTENT_CLAMP_LINES,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }

  return (
    <article
      className="app-card app-card-hover"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        minHeight: '260px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: isDecision
          ? 'linear-gradient(145deg, color-mix(in srgb, var(--accent-blue) 11%, var(--bg-surface)), color-mix(in srgb, var(--accent-teal) 7%, var(--bg-surface)))'
          : 'linear-gradient(145deg, color-mix(in srgb, var(--bg-surface) 95%, var(--accent-blue)), var(--bg-surface))',
        border: `1px solid ${isDecision ? 'color-mix(in srgb, var(--accent-blue) 44%, transparent)' : hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'default',
        transform: `${hovered ? 'translateY(-2px)' : 'translateY(0)'} ${deleting ? 'scale(0.97)' : 'scale(1)'}`,
        boxShadow: hovered
          ? isDecision
            ? 'var(--shadow-elevated), var(--glow-teal)'
            : 'var(--shadow-elevated), var(--glow-blue)'
          : isDecision
            ? 'var(--shadow-card), 0 0 28px color-mix(in srgb, var(--accent-blue) 10%, transparent)'
            : 'var(--shadow-card)',
        opacity: deleting ? 0 : 1,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(circle at 12% 0%, color-mix(in srgb, ${accent} ${isDecision ? '24%' : '12%'}, transparent), transparent 34%)`,
        }}
      />
      {isDecision && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: '3px',
            background: 'linear-gradient(180deg, var(--accent-blue), var(--accent-teal))',
            boxShadow: '0 0 22px color-mix(in srgb, var(--accent-blue) 54%, transparent)',
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '14px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <TypeBadge type={memory.type} />
            {isDecision && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-teal)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <Zap size={11} />
                AI saved
              </span>
            )}
          </div>
          <time title={formattedDate(memory.createdAt)} style={{ color: 'var(--text-tertiary)', fontSize: '12px', flexShrink: 0 }}>
            {relativeDate(memory.createdAt)}
          </time>
        </div>

        <div>
          <h3
            style={{
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 750,
              lineHeight: 1.35,
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {memory.title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.55, margin: '8px 0 0' }}>
            {summary}
          </p>
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px', display: 'grid', gap: '10px' }}>
          <p style={contentStyle}>{memory.content}</p>
          {contentIsLong && (
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              aria-expanded={expanded}
              style={{
                width: 'fit-content',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                border: 'none',
                background: 'transparent',
                color: 'var(--accent-blue)',
                padding: 0,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
              <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {memory.tags.length > 0 ? memory.tags.map(tag => (
            <span
              key={tag}
              style={{
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--bg-elevated) 86%, transparent)',
                border: '0.5px solid var(--border)',
                borderRadius: '9999px',
                fontSize: '11px',
                padding: '3px 8px',
              }}
            >
              {tag}
            </span>
          )) : (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>No tags</span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '12px', marginTop: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          {meta.slice(0, 3).map(item => (
            <div key={item.label} style={{ minWidth: 0, padding: '8px', borderRadius: '8px', background: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)', border: '0.5px solid var(--border)' }}>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '10px' }}>{item.label}</span>
              <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ minHeight: '18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {memory.saved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: isWalrusDown ? 'var(--accent-amber)' : 'var(--accent-teal)', fontWeight: 600 }}>
                {isWalrusDown ? <ExternalLink size={12} /> : <Check size={12} />}
                {isWalrusDown ? 'Walrus syncing...' : 'Stored on Walrus'}
              </span>
            )}
          </div>
          <div style={{ display: 'inline-flex', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                void handleCopy()
              }}
              aria-label={`Copy ${typeName} memory content`}
              style={{
                width: '30px',
                height: '30px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '8px',
                border: '0.5px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: copied ? 'var(--accent-teal)' : 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                handleDelete()
              }}
              aria-label="Delete memory"
              style={{
                width: '30px',
                height: '30px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '8px',
                border: '0.5px solid transparent',
                background: 'transparent',
                color: hovered ? 'var(--accent-coral)' : 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
