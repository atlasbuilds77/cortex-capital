import React from 'react'
import { colors, gradients, shadows, borderRadius, spacing } from '@/lib/design-tokens'

interface GradientCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  gradient?: 'primary' | 'accent' | 'positive' | 'negative'
  onClick?: () => void
}

export function GradientCard({ 
  children, 
  className = '', 
  glow = false,
  gradient = 'primary',
  onClick 
}: GradientCardProps) {
  const gradientMap = {
    primary: gradients.borderGlow,
    accent: gradients.accent,
    positive: gradients.positive,
    negative: gradients.negative,
  }

  const glowMap = {
    primary: shadows.glow.primary,
    accent: shadows.glow.accent,
    positive: shadows.glow.success,
    negative: shadows.glow.danger,
  }

  return (
    <div
      onClick={onClick}
      className={`relative ${className}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Gradient border container */}
      <div
        className="absolute inset-0 rounded-2xl p-[1px] transition-all duration-300"
        style={{
          background: gradientMap[gradient],
          boxShadow: glow ? glowMap[gradient] : 'none',
          borderRadius: borderRadius.card,
        }}
      >
        {/* Inner card with dark background */}
        <div
          className="h-full w-full rounded-2xl backdrop-blur-sm"
          style={{
            background: colors.bg.elevated,
            borderRadius: borderRadius.card,
          }}
        />
      </div>

      {/* Content */}
      <div 
        className="relative z-10"
        style={{
          padding: spacing.card.padding,
        }}
      >
        {children}
      </div>
    </div>
  )
}
