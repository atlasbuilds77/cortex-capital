'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { colors, shadows } from '@/lib/design-tokens'

interface FishTankEmbedProps {
  src?: string
  title?: string
  width?: number | string
  height?: number | string
  className?: string
  borderGlow?: boolean
  allowFullscreen?: boolean
  loading?: 'eager' | 'lazy'
  onLoad?: () => void
  onError?: () => void
}

export function FishTankEmbed({
  src = 'https://fishtank.live/embed', // Default Fish Tank URL
  title = 'Fish Tank Live',
  width = '100%',
  height = 450,
  className,
  borderGlow = true,
  allowFullscreen = true,
  loading = 'lazy',
  onLoad,
  onError,
}: FishTankEmbedProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  return (
    <div
      className={cn('relative rounded-2xl overflow-hidden', className)}
      style={{
        width,
        height,
        background: colors.bg.elevated,
        boxShadow: borderGlow ? shadows.glow.accent : shadows.lg,
        border: borderGlow
          ? `1px solid ${colors.accent.glow}30`
          : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Animated fish icon */}
              <span className="text-4xl animate-bounce">🐠</span>
              <div
                className="absolute -inset-4 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: colors.accent.glow }}
              />
            </div>
            <span className="text-gray-400 text-sm">Loading Fish Tank...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <span className="text-4xl">🐟💀</span>
            <span className="text-gray-400 text-sm">
              Failed to load Fish Tank embed
            </span>
            <button
              onClick={() => {
                setHasError(false)
                setIsLoading(true)
              }}
              className="text-sm text-cyan-400 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* iframe */}
      <iframe
        src={src}
        title={title}
        width="100%"
        height="100%"
        loading={loading}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen={allowFullscreen}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'border-0',
          (isLoading || hasError) && 'opacity-0'
        )}
        style={{
          transition: 'opacity 0.3s ease-in-out',
        }}
      />

      {/* Fullscreen toggle overlay */}
      {allowFullscreen && !isLoading && !hasError && (
        <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              const iframe = document.querySelector(
                `iframe[title="${title}"]`
              ) as HTMLIFrameElement
              iframe?.requestFullscreen?.()
            }}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
            title="Fullscreen"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// Fish Tank card with title and controls
export function FishTankCard({
  title = '🐠 Fish Tank Live',
  src,
  className,
}: {
  title?: string
  src?: string
  className?: string
}) {
  const [isLive, setIsLive] = useState(true)

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{
        background: colors.bg.base,
        boxShadow: shadows.lg,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{title.includes('🐠') ? '' : '🐠'}</span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-medium">LIVE</span>
            </span>
          )}
        </div>

        <a
          href="https://fishtank.live"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Open ↗
        </a>
      </div>

      {/* Embed */}
      <FishTankEmbed src={src} height={400} borderGlow={false} />
    </div>
  )
}
