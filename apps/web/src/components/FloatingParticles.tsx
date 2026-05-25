const PARTICLES = [
  { x: '8%', y: '18%', size: 2, duration: 14, delay: 0.4 },
  { x: '18%', y: '70%', size: 3, duration: 18, delay: 1.8 },
  { x: '27%', y: '28%', size: 2, duration: 16, delay: 0.9 },
  { x: '39%', y: '82%', size: 2, duration: 19, delay: 2.4 },
  { x: '52%', y: '14%', size: 3, duration: 17, delay: 1.2 },
  { x: '64%', y: '63%', size: 2, duration: 15, delay: 0.2 },
  { x: '76%', y: '24%', size: 2, duration: 20, delay: 2.8 },
  { x: '84%', y: '78%', size: 3, duration: 18, delay: 1.6 },
  { x: '91%', y: '42%', size: 2, duration: 16, delay: 3.2 },
  { x: '12%', y: '48%', size: 2, duration: 21, delay: 2.1 },
  { x: '47%', y: '46%', size: 2, duration: 19, delay: 3.7 },
  { x: '70%', y: '88%', size: 2, duration: 15, delay: 0.7 },
]

export function FloatingParticles() {
  return (
    <div className="home-particles" aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.x}-${particle.y}`}
          className="home-particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay + index * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}
