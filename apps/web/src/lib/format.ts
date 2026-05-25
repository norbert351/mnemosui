export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function addressToHue(address: string): number {
  const seed = Number.parseInt(address.slice(2, 8), 16) || 0
  return seed % 360
}

export function relativeDate(value: string): string {
  const timestamp = new Date(value).getTime()
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = minute * 60
  const day = hour * 24

  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function summarizeContent(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed
}

export function txDigestFromUnknown(tx: unknown): string {
  if (typeof tx === 'object' && tx !== null) {
    const record = tx as Record<string, unknown>
    if (typeof record.digest === 'string') return record.digest
    if (typeof record.transactionDigest === 'string') return record.transactionDigest
  }

  return 'unknown'
}
