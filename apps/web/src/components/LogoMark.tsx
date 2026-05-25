interface Props {
  size?: number
  className?: string
}

export function LogoMark({ size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ color: 'var(--accent-blue)' }}
    >
      <path
        d="M32 5L59 32L32 59L5 32L32 5Z"
        fill="color-mix(in srgb, var(--accent-blue) 14%, transparent)"
        stroke="var(--accent-teal)"
        strokeWidth="2"
      />
      <path d="M20 25C24 17 40 17 44 25" stroke="var(--accent-blue)" strokeWidth="1.5" />
      <path d="M20 39C24 47 40 47 44 39" stroke="var(--accent-blue)" strokeWidth="1.5" />
      <path d="M18 32C25 28 39 28 46 32" stroke="var(--accent-purple)" strokeWidth="1.2" />
      <path d="M18 32C25 36 39 36 46 32" stroke="var(--accent-purple)" strokeWidth="1.2" />
      <circle cx="20" cy="25" r="4" fill="var(--accent-blue)" />
      <circle cx="44" cy="25" r="4" fill="var(--accent-blue)" />
      <circle cx="18" cy="32" r="4" fill="var(--accent-teal)" />
      <circle cx="46" cy="32" r="4" fill="var(--accent-teal)" />
      <circle cx="20" cy="39" r="4" fill="var(--accent-purple)" />
      <circle cx="44" cy="39" r="4" fill="var(--accent-purple)" />
      <circle cx="32" cy="32" r="6" fill="var(--accent-teal)" style={{ filter: 'drop-shadow(var(--glow-teal))' }} />
    </svg>
  )
}
