'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ConfettiProps {
  active?: boolean
  count?: number
}

export function Confetti({ active = true, count = 50 }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; rotation: number; color: string }>>([])

  useEffect(() => {
    if (!active) return

    const colors = ['#00d4ff', '#7c3aed', '#00ff88', '#ffaa00']
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    setParticles(newParticles)
  }, [active, count])

  if (!active || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: '-10%',
          }}
          initial={{
            y: 0,
            rotate: particle.rotation,
            opacity: 1,
          }}
          animate={{
            y: window.innerHeight + 100,
            rotate: particle.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: 'easeIn',
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  )
}
