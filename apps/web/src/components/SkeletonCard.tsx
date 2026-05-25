export function SkeletonCard() {
  return (
    <div
      className="app-card slide-up"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, var(--accent-blue)), var(--bg-surface))',
        border: '0.5px solid color-mix(in srgb, var(--accent-blue) 18%, var(--border))',
        borderRadius: '12px',
        padding: '16px',
        minHeight: '240px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent-blue) 12%, transparent), transparent 30%)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div className="skeleton" style={{ width: '72px', height: '20px', borderRadius: '9999px' }} />
        <div className="skeleton" style={{ width: '90px', height: '12px', alignSelf: 'center' }} />
      </div>
      <div style={{ position: 'relative', display: 'grid', gap: '10px' }}>
        <div className="skeleton" style={{ width: '84%', height: '16px' }} />
        <div className="skeleton" style={{ width: '100%', height: '12px' }} />
        <div className="skeleton" style={{ width: '96%', height: '12px' }} />
        <div className="skeleton" style={{ width: '74%', height: '12px' }} />
        <div className="skeleton" style={{ width: '58%', height: '12px' }} />
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: '8px', marginTop: '18px' }}>
        <div className="skeleton" style={{ width: '72px', height: '22px', borderRadius: '9999px' }} />
        <div className="skeleton" style={{ width: '88px', height: '22px', borderRadius: '9999px' }} />
      </div>
    </div>
  )
}
