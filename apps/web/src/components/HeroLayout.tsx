import type { ReactNode } from 'react'
import { HeroBackground } from './HeroBackground'
import { LogoMark } from './LogoMark'
import { NetworkSwitcher } from './NetworkSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { WalletConnectButton } from './WalletConnectButton'

interface HeroLayoutProps {
  children: ReactNode
}

export function HeroLayout({ children }: HeroLayoutProps) {
  return (
    <div className="homepage-container">
      <HeroBackground />

      <nav className="glass-navbar" aria-label="Primary">
        <div className="glass-navbar-logo">
          <LogoMark size={26} />
          <span>MnemoSui</span>
        </div>

        <div className="glass-navbar-right">
          <NetworkSwitcher />
          <ThemeToggle size="sm" />
          <div className="nav-connect-wrapper">
            <WalletConnectButton />
          </div>
        </div>
      </nav>

      <main className="homepage-main">{children}</main>
    </div>
  )
}
