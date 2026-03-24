'use client'

import React from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { colors, shadows } from '@/lib/design-tokens'
import { AgentAvatar, AgentTier } from './agent-avatar'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart2, 
  Zap, 
  Scale, 
  Radio, 
  AlertTriangle,
  LucideIcon
} from 'lucide-react'

export type ActivityType =
  | 'trade_buy'
  | 'trade_sell'
  | 'analysis'
  | 'alert'
  | 'rebalance'
  | 'signal'
  | 'error'

interface AgentActivityProps {
  id: string
  agentName: string
  agentTier?: AgentTier
  type: ActivityType
  title: string
  description?: string
  symbol?: string
  amount?: number
  timestamp: Date | string
  className?: string
  onClick?: () => void
}

interface ActivityConfig {
  Icon: LucideIcon
  color: string
  bgColor: string
}

const activityConfig: Record<ActivityType, ActivityConfig> = {
  trade_buy: {
    Icon: ArrowUpRight,
    color: colors.success,
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  trade_sell: {
    Icon: ArrowDownRight,
    color: colors.danger,
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
  analysis: {
    Icon: BarChart2,
    color: colors.accent.glow,
    bgColor: 'rgba(6, 182, 212, 0.15)',
  },
  alert: {
    Icon: Zap,
    color: colors.warning,
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  rebalance: {
    Icon: Scale,
    color: colors.info,
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  signal: {
    Icon: Radio,
    color: colors.primary.via,
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
  error: {
    Icon: AlertTriangle,
    color: colors.danger,
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
}

export function AgentActivity({
  agentName,
  agentTier = 'scout',
  type,
  title,
  description,
  symbol,
  amount,
  timestamp,
  className,
  onClick,
}: AgentActivityProps) {
  const config = activityConfig[type]
  const IconComponent = config.Icon
  const timeStr =
    typeof timestamp === 'string'
      ? timestamp
      : timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 p-4',
        'bg-[#12121a] hover:bg-[#1a1a2e] transition-all duration-200',
        'border-l-2 rounded-r-lg',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        borderLeftColor: config.color,
      }}
    >
      {/* Agent Avatar */}
      <AgentAvatar
        name={agentName}
        tier={agentTier}
        status="online"
        size="sm"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Activity type icon */}
          <span
            className="flex items-center justify-center w-5 h-5 rounded"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            <IconComponent className="w-3 h-3" />
          </span>

          {/* Title */}
          <span className="font-medium text-white truncate">{title}</span>

          {/* Symbol badge */}
          {symbol && (
            <span
              className="px-2 py-0.5 rounded text-xs font-mono font-semibold"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
              }}
            >
              {symbol}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
        )}

        {/* Amount if applicable */}
        {amount !== undefined && (
          <p
            className="text-sm font-mono font-semibold mt-1"
            style={{ color: config.color }}
          >
            {formatCurrency(amount)}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 whitespace-nowrap">{timeStr}</div>
    </div>
  )
}

// Activity feed container
export function AgentActivityFeed({
  children,
  className,
  title = 'Agent Activity',
}: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{
        background: colors.bg.base,
        boxShadow: shadows.md,
      }}
    >
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  )
}
