import { FloatingParticles } from './FloatingParticles'
import { NeuralLines } from './NeuralLines'

export function HeroBackground() {
  return (
    <div className="home-background" aria-hidden="true">
      <div className="home-base-gradient" />
      <div className="home-aurora-layer" />
      <div className="home-grid-layer" />
      <div className="home-noise-layer" />
      <NeuralLines />
      <FloatingParticles />
      <div className="home-vignette" />
    </div>
  )
}
