const CONNECTIONS = [
  'M60 120 C180 40 260 220 410 130 S650 80 760 190',
  'M120 470 C260 330 420 530 560 370 S780 300 920 430',
  'M760 80 C680 190 820 260 700 360 S470 430 430 560',
  'M20 330 C170 280 230 120 360 250 S600 360 900 210',
  'M310 620 C410 500 560 520 670 640 S820 650 940 560',
  'M540 30 C500 140 620 180 560 280 S360 350 250 460',
]

const NODES = [
  { x: 60, y: 120 },
  { x: 410, y: 130 },
  { x: 760, y: 190 },
  { x: 120, y: 470 },
  { x: 560, y: 370 },
  { x: 920, y: 430 },
  { x: 700, y: 360 },
  { x: 430, y: 560 },
  { x: 360, y: 250 },
  { x: 670, y: 640 },
]

export function NeuralLines() {
  return (
    <svg className="neural-lines" viewBox="0 0 960 680" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="neural-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0" />
          <stop offset="48%" stopColor="var(--accent-teal)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {CONNECTIONS.map((path, index) => (
        <path
          key={path}
          className="neural-line"
          d={path}
          stroke="url(#neural-line-gradient)"
          strokeWidth="1"
          fill="none"
          style={{
            animationDelay: `${index * -4}s`,
          }}
        />
      ))}

      {NODES.map(node => (
        <circle key={`${node.x}-${node.y}`} className="neural-node" cx={node.x} cy={node.y} r="2.5" />
      ))}
    </svg>
  )
}
