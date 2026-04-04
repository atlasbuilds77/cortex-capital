'use client'

import Link from 'next/link'
import { Rocket, Lock, ArrowRight, Zap, Bot, ShieldCheck } from 'lucide-react'

interface UpgradeOverlayProps {
  /** Optional: blur/dim the content behind the overlay */
  variant?: 'fullpage' | 'banner'
  featureName?: string
}

/**
 * Shown to free-tier users on locked dashboard pages.
 * - variant="fullpage" → centered overlay card (default, for main pages)
 * - variant="banner"   → top banner strip (lighter weight)
 */
export function UpgradeOverlay({
  variant = 'fullpage',
  featureName,
}: UpgradeOverlayProps) {
  if (variant === 'banner') {
    return (
      <Link
        href="https://zerogtrading.com/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-4 w-full px-5 py-3 mb-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 transition-all group"
      >
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">
              🚀 Upgrade to Cortex AI Fund
            </p>
            <p className="text-xs text-text-secondary">
              Get access to 11 AI agents managing your portfolio with institutional-grade strategies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary text-sm font-semibold shrink-0 group-hover:gap-2 transition-all">
          Upgrade Now <ArrowRight className="w-4 h-4" />
        </div>
      </Link>
    )
  }

  // fullpage overlay
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background/95 backdrop-blur-sm">
      <div className="max-w-lg w-full text-center">
        {/* Glow */}
        <div className="relative mx-auto mb-8 w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full border border-primary/30 bg-surface">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Free Tier</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          🚀 Upgrade to Cortex AI Fund
        </h1>
        <p className="text-text-secondary mb-2">
          {featureName
            ? `${featureName} is available on paid plans.`
            : 'This feature is available on paid plans.'}
        </p>
        <p className="text-text-secondary mb-8">
          Get access to <span className="text-white font-medium">11 AI agents</span> managing your
          portfolio with institutional-grade strategies.
        </p>

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-surface">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Auto-Execute</p>
              <p className="text-xs text-text-secondary">Agents trade for you 24/7</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-surface">
            <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">11 AI Agents</p>
              <p className="text-xs text-text-secondary">Specialized strategies</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-surface">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Real-Time Alerts</p>
              <p className="text-xs text-text-secondary">Instant notifications</p>
            </div>
          </div>
        </div>

        <Link
          href="https://zerogtrading.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-black font-semibold hover:bg-accent transition-colors shadow-lg shadow-primary/20 text-base"
        >
          Upgrade Now <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-3 text-xs text-text-secondary">
          Plans start at $29/mo · Cancel anytime
        </p>
      </div>
    </div>
  )
}
