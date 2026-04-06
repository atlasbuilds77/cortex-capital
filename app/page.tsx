'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// Animated terminal cursor
function TerminalCursor() {
  return (
    <motion.span
      className="inline-block w-[3px] h-[1.1em] bg-primary ml-1 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "steps(1)" }}
    />
  )
}

// Typing effect hook
function useTypewriter(text: string, speed = 50, delay = 0) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
        } else {
          setDone(true)
          clearInterval(interval)
        }
      }, speed)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [text, speed, delay])

  return { displayed, done }
}

// Floating particles background
function ParticleField() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Terminal-style log lines
function TerminalLines() {
  const lines = [
    { text: '> initializing cortex network...', delay: 1500 },
    { text: '> loading agent protocols...', delay: 3000 },
    { text: '> calibrating trading models...', delay: 4500 },
    { text: '> syncing market feeds...', delay: 6000 },
    { text: '> system status: PREPARING', delay: 7500 },
  ]

  return (
    <div className="font-mono text-xs sm:text-sm space-y-2 text-primary/40">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: line.delay / 1000, duration: 0.5 }}
        >
          {line.text}
        </motion.div>
      ))}
    </div>
  )
}

export default function ComingSoonPage() {
  const router = useRouter()
  const { displayed: heading, done: headingDone } = useTypewriter('CORTEX CAPITAL', 80, 500)
  const { displayed: tagline, done: taglineDone } = useTypewriter(
    'Your personal hedge fund is loading...',
    40,
    2000
  )

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem('cortex_token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <motion.div
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.05] rounded-full blur-[100px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-secondary/[0.04] rounded-full blur-[100px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ParticleField />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 200, 5, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 200, 5, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/cortex-logo.png"
              alt="Cortex Capital"
              className="w-10 h-10 drop-shadow-[0_0_12px_rgba(0,200,5,0.4)]"
            />
            <span className="text-xl font-semibold text-primary">Cortex</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2.5 text-sm font-medium text-text-secondary border border-white/[0.1] rounded-xl hover:border-primary/30 hover:text-primary transition-all duration-300"
          >
            Member Login
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 -mt-16">
        <div className="max-w-3xl w-full text-center space-y-10">
          {/* Logo pulse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex justify-center mb-2"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/cortex-logo.png"
                alt="Cortex"
                className="w-20 h-20 relative z-10 drop-shadow-[0_0_20px_rgba(0,200,5,0.5)]"
              />
            </div>
          </motion.div>

          {/* Heading with typewriter */}
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight font-mono">
              <span className="text-primary">{heading}</span>
              {!headingDone && <TerminalCursor />}
            </h1>
          </div>

          {/* Tagline */}
          <div className="min-h-[2rem]">
            {headingDone && (
              <p className="text-lg sm:text-xl md:text-2xl text-text-secondary font-mono">
                {tagline}
                {!taglineDone && <TerminalCursor />}
              </p>
            )}
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 4, duration: 1, ease: 'easeOut' }}
            className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto w-full max-w-md"
          />

          {/* Coming Soon badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4.5, duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface-elevated border border-primary/20 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-sm font-semibold text-primary tracking-wider uppercase">
                Coming Soon
              </span>
            </div>

            <p className="text-text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              AI-powered trading agents. Automated execution. Portfolio intelligence.
              <br className="hidden sm:block" />
              The future of personal investing is almost here.
            </p>
          </motion.div>

          {/* Discord CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 5.2, duration: 0.6 }}
            className="pt-4"
          >
            <a
              href="https://discord.gg/syUMEaQW63"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#5865F2]/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Join the Discord
            </a>
            <p className="text-text-muted text-xs mt-3">
              Get early access & updates
            </p>
          </motion.div>

          {/* Terminal lines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 6, duration: 1 }}
            className="pt-8"
          >
            <TerminalLines />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} Cortex Capital Group</span>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</a>
            <button
              onClick={() => router.push('/login')}
              className="hover:text-primary transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
