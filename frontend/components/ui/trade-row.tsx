'use client'

import React from 'react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { colors } from '@/lib/design-tokens'

export type TradeType = 'buy' | 'sell'
export type TradeStatus = 'filled' | 'pending' | 'cancelled' | 'partial'

interface TradeRowProps {
  id: string
  symbol: string
  type: TradeType
  quantity: number
  price: number
  total: number
  status: TradeStatus
  timestamp: Date | string
  agentName?: string
  className?: string
  onClick?: () => void
}

const statusStyles: Record<TradeStatus, { color: string; label: string }> = {
  filled: { color: colors.success, label: 'Filled' },
  pending: { color: colors.warning, label: 'Pending' },
  cancelled: { color: colors.text.muted, label: 'Cancelled' },
  partial: { color: colors.info, label: 'Partial' },
}

export function TradeRow({
  id,
  symbol,
  type,
  quantity,
  price,
  total,
  status,
  timestamp,
  agentName,
  className,
  onClick,
}: TradeRowProps) {
  const isBuy = type === 'buy'
  const statusConfig = statusStyles[status]
  const timeStr =
    typeof timestamp === 'string'
      ? timestamp
      : timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })

  return (
    <div
      onClick={onClick}
      className={cn(
        'grid grid-cols-7 gap-4 items-center px-4 py-3',
        'bg-[#12121a] hover:bg-[#1a1a2e] transition-colors duration-200',
        'border-b border-white/5 last:border-b-0',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Symbol */}
      <div className="font-semibold text-white">{symbol}</div>

      {/* Type */}
      <div>
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium uppercase',
            isBuy
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          )}
        >
          {type}
        </span>
      </div>

      {/* Quantity */}
      <div className="text-white font-mono">{formatNumber(quantity)}</div>

      {/* Price */}
      <div className="text-gray-300 font-mono">{formatCurrency(price)}</div>

      {/* Total */}
      <div className="text-white font-semibold font-mono">
        {formatCurrency(total)}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusConfig.color }}
        />
        <span className="text-sm text-gray-400">{statusConfig.label}</span>
      </div>

      {/* Time & Agent */}
      <div className="text-right">
        <div className="text-sm text-gray-400 font-mono">{timeStr}</div>
        {agentName && (
          <div className="text-xs text-gray-500 truncate">{agentName}</div>
        )}
      </div>
    </div>
  )
}

// Table header component for consistency
export function TradeRowHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-7 gap-4 px-4 py-2 bg-[#0a0a0f] text-xs uppercase tracking-wider text-gray-500 font-medium',
        className
      )}
    >
      <div>Symbol</div>
      <div>Type</div>
      <div>Qty</div>
      <div>Price</div>
      <div>Total</div>
      <div>Status</div>
      <div className="text-right">Time</div>
    </div>
  )
}
