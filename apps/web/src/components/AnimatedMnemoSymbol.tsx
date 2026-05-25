const FLOATING_LABELS = [
  { label: 'Walrus Storage', position: 'top-left' },
  { label: 'Sui Powered', position: 'top-right' },
  { label: 'AI Memory', position: 'bottom-left' },
  { label: 'Permanent', position: 'bottom-right' },
]

export function AnimatedMnemoSymbol() {
  return (
    <div className="mnemo-symbol-wrap" aria-hidden="true">
      <div className="mnemo-orbit mnemo-orbit-one" />
      <div className="mnemo-orbit mnemo-orbit-two" />
      <div className="mnemo-halo" />

      <svg className="mnemo-symbol" viewBox="0 0 220 220" fill="none">
        <defs>
          <linearGradient id="mnemo-diamond-gradient" x1="33" y1="24" x2="187" y2="196" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7CC8FF" />
            <stop offset="0.48" stopColor="#9B7CFF" />
            <stop offset="1" stopColor="#2EE7BE" />
          </linearGradient>
          <radialGradient id="mnemo-core-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 110) rotate(90) scale(58)">
            <stop stopColor="#FFFFFF" stopOpacity="0.92" />
            <stop offset="0.38" stopColor="#4F9EFF" stopOpacity="0.88" />
            <stop offset="0.72" stopColor="#1DB897" stopOpacity="0.42" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
          <filter id="mnemo-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.31 0 0 0 0 0.62 0 0 0 0 1 0 0 0 0.5 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path className="mnemo-ring-path" d="M110 20L190 110L110 200L30 110L110 20Z" stroke="url(#mnemo-diamond-gradient)" strokeWidth="1.8" />
        <path className="mnemo-ring-path mnemo-ring-path-inner" d="M110 52L158 110L110 168L62 110L110 52Z" stroke="url(#mnemo-diamond-gradient)" strokeWidth="1.2" />

        <path className="mnemo-neural-path" d="M110 31C129 59 130 83 112 101" />
        <path className="mnemo-neural-path" d="M183 110C154 92 132 92 116 108" />
        <path className="mnemo-neural-path" d="M110 188C91 160 90 136 108 119" />
        <path className="mnemo-neural-path" d="M37 110C66 128 88 128 104 112" />
        <path className="mnemo-neural-path mnemo-neural-path-alt" d="M72 74C96 78 124 78 148 74" />
        <path className="mnemo-neural-path mnemo-neural-path-alt" d="M72 146C96 142 124 142 148 146" />

        <circle className="mnemo-node mnemo-node-blue" cx="110" cy="20" r="5" />
        <circle className="mnemo-node mnemo-node-teal" cx="190" cy="110" r="5" />
        <circle className="mnemo-node mnemo-node-purple" cx="110" cy="200" r="5" />
        <circle className="mnemo-node mnemo-node-teal" cx="30" cy="110" r="5" />
        <circle className="mnemo-node mnemo-node-blue" cx="72" cy="74" r="4" />
        <circle className="mnemo-node mnemo-node-purple" cx="148" cy="74" r="4" />
        <circle className="mnemo-node mnemo-node-purple" cx="72" cy="146" r="4" />
        <circle className="mnemo-node mnemo-node-blue" cx="148" cy="146" r="4" />

        <circle className="mnemo-core-aura" cx="110" cy="110" r="52" fill="url(#mnemo-core-gradient)" />
        <circle className="mnemo-core" cx="110" cy="110" r="16" filter="url(#mnemo-glow)" />
        <ellipse className="mnemo-eye" cx="110" cy="110" rx="24" ry="11" />
        <circle cx="110" cy="110" r="4" fill="#FFFFFF" opacity="0.95" />
      </svg>

      {FLOATING_LABELS.map(({ label, position }) => (
        <span key={label} className={`mnemo-floating-label mnemo-label-${position}`}>
          {label}
        </span>
      ))}
    </div>
  )
}
