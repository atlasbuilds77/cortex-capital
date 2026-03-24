'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bot, Zap, BarChart3 } from 'lucide-react'

export default function DemoPage() {
  const router = useRouter()
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="text-lg font-bold">Cortex Demo</span>
          </button>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
            >
              {isFullscreen ? (
                <>
                  <span>↙</span>
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <span>↗</span>
                  Fullscreen
                </>
              )}
            </button>
            
            <button
              onClick={() => router.push('/signup')}
              className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition-all"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* Demo Content */}
      <main className={`transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-6'}`}>
        <div className={`${isFullscreen ? '' : 'max-w-7xl mx-auto'}`}>
          {!isFullscreen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h1 className="text-3xl font-bold mb-2">Live Fish Tank Demo</h1>
              <p className="text-text-secondary">
                Watch your AI agents execute trades in real-time. This is a live simulation of the Cortex trading system.
              </p>
            </motion.div>
          )}
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`
              rounded-2xl overflow-hidden border border-white/10
              ${isFullscreen ? 'h-[calc(100vh-73px)]' : 'aspect-video'}
            `}
          >
            <iframe
              src="http://localhost:3003/trading"
              className="w-full h-full border-0 bg-background"
              title="Cortex Fish Tank Demo"
              allow="fullscreen"
            />
          </motion.div>
          
          {!isFullscreen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="p-6 rounded-xl bg-slate-900 border border-white/10">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">7 AI Agents</h3>
                <p className="text-sm text-text-secondary">
                  Each agent specializes in a different aspect of portfolio management, from rebalancing to tax optimization.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-slate-900 border border-white/10">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Real-Time Execution</h3>
                <p className="text-sm text-text-secondary">
                  Watch trades execute in milliseconds. See how agents respond to market conditions instantly.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-slate-900 border border-white/10">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Live Analytics</h3>
                <p className="text-sm text-text-secondary">
                  Performance metrics, risk analysis, and portfolio composition — all updated in real-time.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
