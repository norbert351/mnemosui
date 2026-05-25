'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  const pillH  = size === 'sm' ? 28 : 34
  const pillW  = size === 'sm' ? 64 : 76
  const dotSz  = size === 'sm' ? 22 : 27
  const iconSz = size === 'sm' ? 12 : 14
  const offset = size === 'sm' ? 3  : 3.5

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={!isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        position: 'relative',
        width:  pillW,
        height: pillH,
        borderRadius: 9999,
        border: '1.5px solid var(--border)',
        background: isDark
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(59,110,248,0.08)',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: offset + 2,
        transition: 'background 250ms ease, border-color 250ms ease',
        flexShrink: 0,
      }}
    >
      {/* Moon icon - left side */}
      <Moon
        size={iconSz}
        style={{
          color: isDark ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          transition: 'color 250ms ease',
          zIndex: 1,
          position: 'relative',
        }}
      />

      {/* Sun icon - right side */}
      <Sun
        size={iconSz}
        style={{
          color: !isDark ? 'var(--accent-amber)' : 'var(--text-tertiary)',
          transition: 'color 250ms ease',
          zIndex: 1,
          position: 'relative',
        }}
      />

      {/* Sliding indicator dot */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: offset,
          left: isDark ? offset : pillW - dotSz - offset,
          width:  dotSz,
          height: dotSz,
          borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(135deg, #4F9EFF, #8B5CF6)'
            : 'linear-gradient(135deg, #F59E0B, #F97316)',
          boxShadow: isDark
            ? '0 2px 8px rgba(79,158,255,0.35)'
            : '0 2px 8px rgba(245,158,11,0.35)',
          transition: 'left 250ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms ease, box-shadow 300ms ease',
          zIndex: 0,
        }}
      />
    </button>
  )
}
