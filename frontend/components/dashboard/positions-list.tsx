'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { api, Position } from '@/lib/api'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

type SortOption = 'default' | 'gainLoss' | 'size'

export function PositionsList() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadPositions()
  }, [])

  const loadPositions = async () => {
    const response = await api.getPositions()
    if (response.data) {
      setPositions(response.data)
    }
    setLoading(false)
  }

  // Mock data fallback
  const mockPositions: Position[] = [
    {
      symbol: 'NVDA',
      shares: 50,
      value: 44500,
      change_pct: 12.3,
      cost_basis: 39600,
    },
    {
      symbol: 'AAPL',
      shares: 200,
      value: 34400,
      change_pct: 4.2,
      cost_basis: 33020,
    },
    {
      symbol: 'QQQ',
      shares: 50,
      value: 24250,
      change_pct: 2.1,
      cost_basis: 23750,
    },
    {
      symbol: 'TSLA',
      shares: 100,
      value: 17500,
      change_pct: -2.8,
      cost_basis: 18000,
    },
  ]

  const displayPositions = positions.length > 0 ? positions : mockPositions

  // Sort positions
  const sortedPositions = [...displayPositions].sort((a, b) => {
    switch (sortBy) {
      case 'gainLoss':
        return b.change_pct - a.change_pct
      case 'size':
        return b.value - a.value
      default:
        return 0
    }
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Positions
        </h3>
        
        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-sm bg-surface border border-gray-700 rounded px-3 py-1 text-text-secondary focus:outline-none focus:border-primary"
        >
          <option value="default">Default</option>
          <option value="gainLoss">Gain/Loss</option>
          <option value="size">Size</option>
        </select>
      </div>

      {loading ? (
        <div className="text-text-secondary text-center py-8">Loading...</div>
      ) : (
        <AnimatePresence mode="popLayout">
          {sortedPositions.map((position) => (
            <PositionCard
              key={position.symbol}
              position={position}
              isExpanded={expandedId === position.symbol}
              onToggleExpand={() => 
                setExpandedId(expandedId === position.symbol ? null : position.symbol)
              }
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

interface PositionCardProps {
  position: Position
  isExpanded: boolean
  onToggleExpand: () => void
}

function PositionCard({ position, isExpanded, onToggleExpand }: PositionCardProps) {
  const [dragX, setDragX] = useState(0)
  const [showSellButton, setShowSellButton] = useState(false)

  const isPositive = position.change_pct >= 0
  const gainLoss = position.value - position.cost_basis

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      setShowSellButton(true)
      setDragX(-80)
    } else {
      setShowSellButton(false)
      setDragX(0)
    }
  }

  const handleSell = () => {
    // Sell functionality - to be implemented with backend integration
    alert(`Sell ${position.symbol} - Feature coming soon`)
    setShowSellButton(false)
    setDragX(0)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative overflow-hidden"
    >
      {/* Sell button background (appears when swiped) */}
      <AnimatePresence>
        {showSellButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-danger rounded-xl flex items-center justify-end pr-6"
            onClick={handleSell}
          >
            <span className="text-white font-semibold">Sell</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        animate={{ x: dragX }}
        onClick={onToggleExpand}
        className="relative bg-surface rounded-xl cursor-pointer"
      >
        <div className="p-4">
          {/* Main row */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-lg flex items-center gap-2">
                {position.symbol}
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="text-xs text-text-secondary"
                >
                  ▼
                </motion.span>
              </div>
              <div className="text-sm text-text-secondary">{position.shares} shares</div>
            </div>

            <div className="text-right">
              <div className="font-semibold">{formatCurrency(position.value)}</div>
              <div
                className={cn(
                  'text-sm font-medium flex items-center gap-1 justify-end',
                  isPositive ? 'text-success' : 'text-danger'
                )}
              >
                {isPositive ? '↑' : '↓'} {formatPercent(Math.abs(position.change_pct))}
              </div>
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Cost Basis:</span>
                    <span className="font-medium">{formatCurrency(position.cost_basis)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Gain/Loss:</span>
                    <span
                      className={cn(
                        'font-medium',
                        gainLoss >= 0 ? 'text-success' : 'text-danger'
                      )}
                    >
                      {formatCurrency(Math.abs(gainLoss))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Avg Price:</span>
                    <span className="font-medium">
                      {formatCurrency(position.cost_basis / position.shares)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Current Price:</span>
                    <span className="font-medium">
                      {formatCurrency(position.value / position.shares)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                      Buy More
                    </button>
                    <button className="flex-1 py-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors text-sm font-medium">
                      Sell
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
