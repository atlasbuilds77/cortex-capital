'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { PnlOverlay } from '@/features/trading-floor/PnlOverlay'
import { TradesTicker } from '@/features/trading-floor/TradesTicker'

const TradingFloorShell = dynamic(
  () => import('@/features/trading-floor/TradingFloorShell').then((mod) => ({
    default: mod.TradingFloorShell,
  })),
  { ssr: false }
)

export default function DemoPage() {
  return (
    <div className="relative h-screen w-full">
      <TradingFloorShell context="demo" initialShowDiscussions={false} />
      
      {/* Back to home - top right to avoid title overlap */}
      <Link 
        href="/"
        className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2.5 backdrop-blur-xl border border-white/10 text-white hover:bg-black/80 hover:border-white/20 transition-all text-sm font-medium shadow-lg"
      >
        Exit Demo
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Link>

      {/* P&L Stats */}
      <PnlOverlay context="demo" />

      {/* Trade ticker tape */}
      <TradesTicker context="demo" />
    </div>
  )
}
