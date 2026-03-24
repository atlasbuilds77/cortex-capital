'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { colors, gradients, shadows } from '@/lib/design-tokens'
import { Search, Zap, Crown } from 'lucide-react'

export type Tier = 'scout' | 'operator' | 'partner'

interface TierBadgeProps {
  tier: Tier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showIcon?: boolean
  glow?: boolean
  className?: string
}

const tierConfig: Record<
  Tier,
  {
    label: string
    Icon: React.ComponentType<{ className?: string }>
    bgColor: string
    shadowColor: string
    description: string
  }
> = {
  scout: {
    label: 'Scout',
    Icon: Search,
    bgColor: 'bg-cyan-600',
    shadowColor: colors.accent.glow,
    description: 'Basic trading agent',
  },
  operator: {
    label: 'Operator',
    Icon: Zap,
    bgColor: 'bg-purple-600',
    shadowColor: colors.primary.via,
    description: 'Advanced AI operator',
  },
  partner: {
    label: 'Partner',
    Icon: Crown,
    bgColor: 'bg-amber-500',
    shadowColor: '#f59e0b',
    description: 'White-glove service for sophisticated investors',
  },
}

const sizeStyles = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    iconSize: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-3 py-1',
    text: 'text-sm',
    iconSize: 'w-4 h-4',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-4 py-2',
    text: 'text-base',
    iconSize: 'w-5 h-5',
    gap: 'gap-2',
  },
}

export function TierBadge({
  tier,
  size = 'md',
  showLabel = true,
  showIcon = true,
  glow = false,
  className,
}: TierBadgeProps) {
  const config = tierConfig[tier]
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        config.bgColor,
        styles.padding,
        styles.gap,
        className
      )}
      style={{
        boxShadow: glow
          ? `0 0 20px ${config.shadowColor}40, 0 0 40px ${config.shadowColor}20`
          : 'none',
      }}
      title={config.description}
    >
      {showIcon && <config.Icon className={cn(styles.iconSize, 'text-white')} />}
      {showLabel && (
        <span className={cn(styles.text, 'text-white font-medium')}>
          {config.label}
        </span>
      )}
    </div>
  )
}

// Tier card for onboarding/selection
export function TierCard({
  tier,
  selected = false,
  onSelect,
  price,
  features = [],
  className,
}: {
  tier: Tier
  selected?: boolean
  onSelect?: () => void
  price?: string
  features?: string[]
  className?: string
}) {
  const config = tierConfig[tier]

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative p-6 rounded-2xl transition-all duration-300 cursor-pointer',
        'border-2',
        selected ? 'border-transparent' : 'border-white/10 hover:border-white/20',
        className
      )}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${colors.bg.elevated}, ${colors.bg.surface})`
          : colors.bg.elevated,
        boxShadow: selected
          ? `0 0 30px ${config.shadowColor}30, ${shadows.lg}`
          : shadows.sm,
      }}
    >
      {/* Border highlight when selected */}
      {selected && (
        <div
          className={cn(
            'absolute inset-0 rounded-2xl p-[2px] -z-10',
            config.bgColor
          )}
        />
      )}

      <div className="flex items-center gap-3 mb-4">
        <config.Icon className="w-6 h-6 text-white" />
        <div>
          <h3 className="text-lg font-bold text-white">{config.label}</h3>
          <p className="text-sm text-gray-400">{config.description}</p>
        </div>
      </div>

      {price && (
        <div className="mb-4">
          <span className="text-3xl font-bold text-white">{price}</span>
          <span className="text-gray-400 ml-2">/month</span>
        </div>
      )}

      {features.length > 0 && (
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <span style={{ color: config.shadowColor }}>✓</span>
              {feature}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
