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
      
      {/* Back to home */}
      <Link 
        href="/"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur-sm border border-white/5 text-white/40 hover:text-white hover:bg-black/40 transition-all text-xs"
      >
        ← Back
      </Link>

      {/* P&L Stats */}
      <PnlOverlay />

      {/* Trade ticker tape */}
      <TradesTicker />
    </div>
  )
}
