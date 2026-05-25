import { ArrowUpRight, Brain, Database, MessageSquare, Sparkles, WalletCards } from 'lucide-react'

const MEMORIES = [
  { title: 'SUI thesis after volume spike', tag: 'research', tone: 'blue', time: '2m ago' },
  { title: 'Cetus LP rebalanced at 0.74', tag: 'trade', tone: 'teal', time: '18m ago' },
  { title: 'Saved wallet pattern from DAO vote', tag: 'governance', tone: 'purple', time: '1h ago' },
]

const TIMELINE = [
  { label: 'Swap routed', value: '+3.2 SUI' },
  { label: 'Memory sealed', value: 'Walrus' },
  { label: 'AI summary', value: 'Ready' },
]

export function DashboardPreview() {
  return (
    <section className="dashboard-preview-section" aria-label="MnemoSui product preview">
      <div className="dashboard-preview-shell">
        <div className="dashboard-preview-topbar">
          <div>
            <span className="preview-kicker">Live Memory Vault</span>
            <strong>Wallet Intelligence</strong>
          </div>
          <div className="preview-window-controls" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="dashboard-preview-grid">
          <div className="preview-panel preview-memory-panel">
            <div className="preview-panel-heading">
              <Brain size={16} />
              <span>Memory Stream</span>
            </div>
            <div className="preview-memory-list">
              {MEMORIES.map(memory => (
                <article key={memory.title} className={`preview-memory-card preview-memory-${memory.tone}`}>
                  <div>
                    <strong>{memory.title}</strong>
                    <span>{memory.time}</span>
                  </div>
                  <em>{memory.tag}</em>
                </article>
              ))}
            </div>
          </div>

          <div className="preview-panel preview-chat-panel">
            <div className="preview-panel-heading">
              <MessageSquare size={16} />
              <span>AI Recall</span>
            </div>
            <div className="preview-chat-bubble preview-user-bubble">
              What did I learn before my last SUI buy?
            </div>
            <div className="preview-chat-bubble preview-ai-bubble">
              <Sparkles size={14} />
              <span>You saved a thesis about volume expansion, Cetus liquidity, and a 48h support level.</span>
            </div>
          </div>

          <div className="preview-panel preview-analytics-panel">
            <div className="preview-panel-heading">
              <WalletCards size={16} />
              <span>Onchain Timeline</span>
            </div>
            <div className="preview-chart" aria-hidden="true">
              <span style={{ height: '38%' }} />
              <span style={{ height: '62%' }} />
              <span style={{ height: '46%' }} />
              <span style={{ height: '84%' }} />
              <span style={{ height: '58%' }} />
              <span style={{ height: '72%' }} />
              <span style={{ height: '51%' }} />
            </div>
            <div className="preview-timeline">
              {TIMELINE.map(item => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="preview-panel preview-storage-panel">
            <div className="preview-panel-heading">
              <Database size={16} />
              <span>Permanent Storage</span>
            </div>
            <div className="preview-storage-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <button type="button" className="preview-link-button">
              Inspect blob
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
