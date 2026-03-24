'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { colors, gradients, shadows } from '@/lib/design-tokens'

export type AgentStatus = 'online' | 'trading' | 'idle' | 'error' | 'offline'
export type AgentTier = 'scout' | 'operator' | 'partner'

interface AgentAvatarProps {
  name: string
  tier?: AgentTier
  status?: AgentStatus
  size?: 'sm' | 'md' | 'lg' | 'xl'
  avatarUrl?: string
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}

const statusColorMap: Record<AgentStatus, string> = {
  online: colors.success,
  trading: colors.accent.glow,
  idle: colors.warning,
  error: colors.danger,
  offline: colors.text.muted,
}

const statusDotSize = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
  xl: 'w-5 h-5',
}

const tierGradients: Record<AgentTier, string> = {
  scout: gradients.accent,
  operator: gradients.borderGlow,
  partner: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
}

export function AgentAvatar({
  name,
  tier = 'scout',
  status = 'offline',
  size = 'md',
  avatarUrl,
  className,
}: AgentAvatarProps) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isAnimated = status === 'trading' || status === 'online'

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Gradient border ring */}
      <div
        className={cn(
          'rounded-full p-[2px] transition-all duration-300',
          isAnimated && 'animate-pulse'
        )}
        style={{
          background: tierGradients[tier],
          boxShadow: isAnimated ? shadows.glow.primary : 'none',
        }}
      >
        {/* Avatar container */}
        <div
          className={cn(
            sizeMap[size],
            'rounded-full flex items-center justify-center overflow-hidden',
            'bg-slate-900'
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className={cn(
                'font-semibold text-white',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base',
                size === 'xl' && 'text-xl'
              )}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-[#0a0a0f]',
          statusDotSize[size],
          status === 'trading' && 'animate-pulse'
        )}
        style={{
          backgroundColor: statusColorMap[status],
          boxShadow: `0 0 8px ${statusColorMap[status]}`,
        }}
      />
    </div>
  )
}
