import { useCurrentAccount } from '@mysten/dapp-kit'
import {
  ArrowRight,
  Brain,
  Database,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  WalletCards,
  WandSparkles,
} from 'lucide-react'
import { AnimatedMnemoSymbol } from '../components/AnimatedMnemoSymbol'
import { DashboardPreview } from '../components/DashboardPreview'
import { HeroLayout } from '../components/HeroLayout'
import { ThemeToggle } from '../components/ThemeToggle'
import { WalletConnectButton } from '../components/WalletConnectButton'
import { addressToHue, truncateAddress } from '../lib/format'
import { useTheme } from '../hooks/useTheme'
import type { Page } from '../types'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Memory Engine',
    description: 'Translate wallet behavior into persistent context, summaries, and recall that actually compounds over time.',
    accent: 'purple',
  },
  {
    icon: Database,
    title: 'Permanent Storage',
    description: 'Walrus-backed archives keep notes, trades, and research sealed into durable onchain memory.',
    accent: 'teal',
  },
  {
    icon: WalletCards,
    title: 'Onchain Intelligence',
    description: 'Track holdings, patterns, and history with a memory layer built for real crypto workflows.',
    accent: 'blue',
  },
]

const BUILT_WITH = ['Sui', 'Walrus', 'Anthropic', 'TypeScript']

interface Props {
  onNavigate: (page: Page) => void
}

function WalletConnectBlock() {
  return (
    <div className="hero-wallet-panel">
      <div className="hero-wallet-shell">
        <div className="hero-wallet-ambient" />
        <div className="hero-wallet-copy">
          <span className="hero-kicker">
            <WandSparkles size={14} />
            AI memory protocol
          </span>
          <h2>Connect to build your vault.</h2>
          <p>Store trades, research, and wallet context in a permanent memory layer that MnemoSui can recall instantly.</p>
        </div>
        <div className="hero-connect-wrap">
          <WalletConnectButton />
        </div>
        <div className="hero-trust-row" aria-label="Platform trust badges">
          <span><Shield size={12} /> Powered by Sui</span>
          <span><Database size={12} /> Stored on Walrus</span>
          <span><Sparkles size={12} /> AI companion</span>
        </div>
      </div>
    </div>
  )
}

function ConnectedWalletCard({ address, onNavigate }: { address: string; onNavigate: (page: Page) => void }) {
  const hue = addressToHue(address)

  return (
    <div className="hero-account-card">
      <div className="hero-account-glow" />
      <div className="hero-account-top">
        <div className="hero-avatar" style={{ background: `linear-gradient(135deg, hsl(${hue} 86% 62%), hsl(${(hue + 72) % 360} 84% 48%))` }}>
          <span>{address.slice(2, 4).toUpperCase()}</span>
          <i />
        </div>
        <div>
          <span className="hero-kicker">
            <span className="hero-status-dot" />
            Wallet connected
          </span>
          <strong>{truncateAddress(address)}</strong>
          <p>Your AI memory vault is online and ready for recall.</p>
        </div>
      </div>
      <div className="hero-account-meta">
        <div>
          <span>Vault status</span>
          <strong>Synced</strong>
        </div>
        <div>
          <span>Memory mode</span>
          <strong>AI active</strong>
        </div>
      </div>
      <div className="hero-account-actions">
        <button type="button" className="hero-primary-cta" onClick={() => onNavigate('vault')}>
          Enter Vault
          <ArrowRight size={16} />
        </button>
        <button type="button" className="hero-secondary-cta" onClick={() => onNavigate('chat')}>
          Open AI Chat
          <MessageSquare size={15} />
        </button>
      </div>
    </div>
  )
}

function Home({ onNavigate }: Props) {
  const account = useCurrentAccount()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <HeroLayout>
      <section className="hero-stage">
        <div className="hero-content">
          <div className="hero-symbol-column">
            <AnimatedMnemoSymbol />
          </div>

          <div className="hero-copy-column">
            <span className="hero-topline">
              <Lock size={14} />
              AI-powered onchain memory protocol
            </span>

            <h1 className="hero-headline">
              Your Wallet Has Memory.
            </h1>

            <p className="hero-subheadline">
              MnemoSui turns your wallet activity, trades, research, and onchain moments into permanent{' '}
              <span>AI memory</span>.
            </p>

            <div className="hero-highlight-row">
              <span>AI memory</span>
              <span>Walrus storage</span>
              <span>Sui execution</span>
            </div>

            {account ? (
              <ConnectedWalletCard address={account.address} onNavigate={onNavigate} />
            ) : (
              <WalletConnectBlock />
            )}
          </div>
        </div>
      </section>

      <DashboardPreview />

      <section className="feature-section">
        <div className="feature-section-head">
          <span className="hero-kicker">
            <Brain size={14} />
            Product surface
          </span>
          <h2>Built like infrastructure, presented like a premium product.</h2>
          <p>Every layer is designed to make the memory protocol feel real, durable, and investable at first glance.</p>
        </div>

        <div className="feature-grid">
          {FEATURES.map(feature => {
            const Icon = feature.icon

            return (
              <article key={feature.title} className={`feature-card feature-card-${feature.accent}`}>
                <div className="feature-card-glow" />
                <div className="feature-card-icon">
                  <Icon size={18} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="built-with-section">
        <div className="built-with-copy">
          <span className="hero-kicker">
            <Sparkles size={14} />
            Built With
          </span>
          <h2>Built for the future of autonomous onchain memory.</h2>
        </div>
        <div className="built-with-pills" role="list" aria-label="Technology stack">
          {BUILT_WITH.map(item => (
            <span key={item} role="listitem" className="tech-pill">
              {item}
            </span>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <span>AI memory infrastructure for crypto.</span>
        <div className="home-footer-controls">
          <ThemeToggle size="sm" />
          <span className={`theme-indicator ${isDark ? 'theme-indicator-dark' : 'theme-indicator-light'}`}>
            {isDark ? 'Dark mode' : 'Light mode'}
          </span>
        </div>
      </footer>
    </HeroLayout>
  )
}

export { Home }
export default Home
