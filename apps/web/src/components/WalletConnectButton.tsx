import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { useCallback, useState } from 'react'

const triggerButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
  color: 'white',
  padding: '8px 18px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const connectedStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  borderRadius: '8px',
  border: '0.5px solid color-mix(in srgb, var(--accent-teal) 34%, transparent)',
  background: 'color-mix(in srgb, var(--accent-teal) 10%, transparent)',
  padding: '6px 14px',
  fontSize: '13px',
  color: 'var(--accent-teal)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const disconnectButtonStyle: React.CSSProperties = {
  border: '0.5px solid var(--border)',
  borderRadius: '8px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  padding: '6px 12px',
  fontSize: '12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export function WalletConnectButton() {
  const currentAccount = useCurrentAccount()
  const [open, setOpen] = useState(false)
  const { mutate: disconnect } = useDisconnectWallet()

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
  }, [])

  if (currentAccount) {
    const display = currentAccount.label ?? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={connectedStyle}>{display}</span>
        <button type="button" onClick={() => disconnect()} style={disconnectButtonStyle}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <ConnectModal
      trigger={
        <button type="button" onClick={() => setOpen(true)} style={triggerButtonStyle}>
          Connect Wallet
        </button>
      }
      open={open}
      onOpenChange={handleOpenChange}
    />
  )
}
