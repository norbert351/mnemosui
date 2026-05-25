import { X } from 'lucide-react'
import type { Toast } from '../hooks/useToast'

const BORDER_COLOR: Record<Toast['type'], string> = {
  success: 'var(--accent-teal)',
  error: 'var(--accent-coral)',
  warning: 'var(--accent-amber)',
}

interface Props {
  toasts: Toast[]
  removeToast: (id: string) => void
}

export function ToastContainer({ toasts, removeToast }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(20px + var(--safe-bottom))',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast-enter"
          style={{
            width: 'min(320px, calc(100vw - 24px))',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderLeft: `3px solid ${BORDER_COLOR[toast.type]}`,
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-elevated)',
            pointerEvents: 'all',
          }}
        >
          <span style={{ lineHeight: 1.45 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '0',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
