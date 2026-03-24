'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { colors, gradients, shadows, transitions } from '@/lib/design-tokens'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  glow?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variantStyles: Record<
  ButtonVariant,
  {
    background: string
    hoverShadow: string
    textColor: string
  }
> = {
  primary: {
    background: gradients.borderGlow,
    hoverShadow: shadows.glow.primary,
    textColor: 'text-white',
  },
  secondary: {
    background: `linear-gradient(135deg, ${colors.bg.surface}, ${colors.bg.elevated})`,
    hoverShadow: '0 0 15px rgba(255,255,255,0.1)',
    textColor: 'text-white',
  },
  accent: {
    background: gradients.accent,
    hoverShadow: shadows.glow.accent,
    textColor: 'text-white',
  },
  success: {
    background: gradients.positive,
    hoverShadow: shadows.glow.success,
    textColor: 'text-white',
  },
  danger: {
    background: gradients.negative,
    hoverShadow: shadows.glow.danger,
    textColor: 'text-white',
  },
  ghost: {
    background: 'transparent',
    hoverShadow: 'none',
    textColor: 'text-gray-300 hover:text-white',
  },
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-base rounded-xl gap-2',
  lg: 'px-8 py-4 text-lg rounded-2xl gap-3',
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      glow = true,
      loading = false,
      icon,
      iconPosition = 'left',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const styles = variantStyles[variant]
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'relative inline-flex items-center justify-center font-semibold',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          'active:scale-[0.98]',
          sizeStyles[size],
          styles.textColor,
          variant === 'ghost' && 'hover:bg-white/5 border border-white/10',
          className
        )}
        style={{
          background: variant !== 'ghost' ? styles.background : undefined,
          boxShadow: glow && !isDisabled ? 'none' : undefined,
          transition: transitions.normal,
        }}
        onMouseEnter={(e) => {
          if (glow && !isDisabled && variant !== 'ghost') {
            e.currentTarget.style.boxShadow = styles.hoverShadow
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}

        {/* Content */}
        <span
          className={cn(
            'inline-flex items-center',
            sizeStyles[size].split(' ').find((s) => s.startsWith('gap-')),
            loading && 'opacity-0'
          )}
        >
          {icon && iconPosition === 'left' && <span>{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span>{icon}</span>}
        </span>
      </button>
    )
  }
)

GlowButton.displayName = 'GlowButton'

// Icon-only variant
export function GlowIconButton({
  icon,
  variant = 'secondary',
  size = 'md',
  glow = true,
  className,
  ...props
}: Omit<GlowButtonProps, 'children' | 'iconPosition'> & { icon: React.ReactNode }) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <GlowButton
      variant={variant}
      glow={glow}
      className={cn('!p-0', sizeMap[size], className)}
      {...props}
    >
      {icon}
    </GlowButton>
  )
}
