'use client'

import { useState, useEffect } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

interface FishTankData {
  pnl: number
  pnl_pct: number
  total_value: number
  agents_active: number
  last_trade?: {
    symbol: string
    action: string
    timestamp: string
  }
}

export function FishTankEmbed() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [data, setData] = useState<FishTankData | null>(null)

  useEffect(() => {
    // Connect to live data feed
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/fishtank/live')
        if (response.ok) {
          const liveData = await response.json()
          setData(liveData)
        }
      } catch (err) {
        console.warn('Fish Tank API not available:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000) // Update every 2s

    return () => clearInterval(interval)
  }, [])

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 bg-surface hover:bg-gray-700 rounded-lg transition-colors"
            title="Exit fullscreen"
          >
            <Minimize2 className="w-5 h-5 text-text-primary" />
          </button>
        </div>
        <iframe
          src="http://localhost:3000"
          className="w-full h-full border-none"
          title="Fish Tank 3D - Full Screen"
        />
      </div>
    )
  }

  return (
    <div className="relative bg-surface rounded-xl overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐟</span>
          <h3 className="text-lg font-semibold">FISH TANK</h3>
          {data && (
            <span className="text-xs text-text-secondary">
              {data.agents_active} agents active
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Expand to fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-text-secondary hover:text-text-primary" />
        </button>
      </div>

      {/* Embedded View */}
      <div className="relative aspect-video">
        <iframe
          src="http://localhost:3000"
          className="w-full h-full border-none"
          title="Fish Tank 3D"
        />
        
        {/* Live Data Overlay */}
        {data && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm text-text-secondary">Live P&L</div>
                <div className={`text-2xl font-bold ${data.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                  {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(2)}
                </div>
                <div className={`text-xs ${data.pnl_pct >= 0 ? 'text-success' : 'text-error'}`}>
                  {data.pnl_pct >= 0 ? '+' : ''}{data.pnl_pct.toFixed(2)}%
                </div>
              </div>
              {data.last_trade && (
                <div className="text-right">
                  <div className="text-xs text-text-secondary">Last Trade</div>
                  <div className="text-sm font-mono">
                    {data.last_trade.action} {data.last_trade.symbol}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
