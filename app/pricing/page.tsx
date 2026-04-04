'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowLeft, Loader2, Shield, Lock, Eye, Zap } from 'lucide-react'

const TIERS = [
  {
    id: 'recovery',
    name: 'Recovery',
    price: 29,
    tagline: "I'm learning",
    description: 'Perfect for getting started with AI-assisted trading',
    features: [
      'AI trade alerts',
      'Basic portfolio tracking',
      'Email support',
      '1 connected broker',
    ],
    popular: false,
  },
  {
    id: 'scout',
    name: 'Scout',
    price: 49,
    tagline: "I'm trading",
    description: 'For active traders who want AI insights',
    features: [
      'Everything in Recovery',
      'Real-time AI signals',
      'Advanced analytics',
      '3 connected brokers',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'operator',
    name: 'Operator',
    price: 99,
    tagline: 'It trades for me',
    description: 'Full autonomous AI trading',
    features: [
      'Everything in Scout',
      'Autonomous trading',
      'Custom strategies',
      'Unlimited brokers',
      'Dedicated support',
      'API access',
    ],
    popular: false,
  },
]

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isUpgrade = searchParams.get('upgrade') === 'true'
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectTier = async (tierId: string) => {
    setLoading(tierId)
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setLoading(null)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link href="/login" className="text-text-secondary hover:text-white transition-colors">
            Already have an account? Sign In
          </Link>
        </div>
      </nav>

      {/* Pricing Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">
            {isUpgrade ? 'Upgrade Your Account' : 'Choose Your Plan'}
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            {isUpgrade 
              ? 'Select a plan to unlock full access to Cortex Capital'
              : 'Start with AI-powered trading today. Cancel anytime.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-8 transition-all ${
                tier.popular
                  ? 'border-primary bg-primary/5 scale-105'
                  : 'border-white/10 bg-surface hover:border-white/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-black text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-1">{tier.name}</h3>
                <p className="text-sm text-text-secondary">{tier.tagline}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-text-secondary">/month</span>
              </div>

              <p className="text-text-secondary text-sm mb-6">
                {tier.description}
              </p>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectTier(tier.id)}
                disabled={loading !== null}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  tier.popular
                    ? 'bg-primary text-black hover:bg-accent'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-text-secondary text-sm mt-12">
          Cancel anytime. No long-term commitments.
        </p>

        {/* Helios Members Card */}
        <div className="mt-16 relative rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-primary/5 p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-semibold mb-4">
                <Zap className="w-3 h-3" />
                Helios Members
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Already in Helios Discord?</h3>
              <p className="text-text-secondary">
                Free auto-execution included with your Helios Discord membership. Connect your broker and let signals execute themselves.
              </p>
              <ul className="mt-4 space-y-2">
                {['Auto-execute Helios options signals', 'No extra subscription needed', 'Connect any broker via SnapTrade'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <button
                onClick={() => window.location.href = '/api/auth/discord'}
                className="px-8 py-3 bg-[#5865F2] text-white font-semibold rounded-xl hover:bg-[#4752C4] transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.036.055a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Sign in with Discord
              </button>
              <p className="text-xs text-text-muted text-center">Helios membership verified automatically</p>
            </div>
          </div>
        </div>

        {/* Connect Any Broker / SnapTrade Section */}
        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">Connect Any Broker</h2>
            <p className="text-text-secondary">
              Powered by{' '}
              <a href="https://snaptrade.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                SnapTrade
              </a>
              {' '}— 300+ supported brokers, zero credential storage.
            </p>
          </div>

          {/* Supported brokers grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {[
              { name: 'Schwab', color: 'from-blue-900/40 to-blue-800/20' },
              { name: 'Fidelity', color: 'from-green-900/40 to-green-800/20' },
              { name: 'Robinhood', color: 'from-green-900/40 to-emerald-800/20' },
              { name: 'TD Ameritrade', color: 'from-green-900/40 to-teal-800/20' },
              { name: 'IBKR', color: 'from-red-900/40 to-red-800/20' },
              { name: 'Webull', color: 'from-cyan-900/40 to-cyan-800/20' },
            ].map((broker) => (
              <div
                key={broker.name}
                className={`bg-gradient-to-br ${broker.color} border border-white/[0.08] rounded-xl p-4 flex items-center justify-center text-center`}
              >
                <span className="text-xs font-semibold text-text-secondary">{broker.name}</span>
              </div>
            ))}
          </div>

          {/* Security badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Lock, label: '256-bit Encryption', desc: 'Military-grade AES encryption on all connections' },
              { icon: Shield, label: 'SOC 2 Compliant', desc: 'Independently audited security practices' },
              { icon: Eye, label: 'Read-Only Option', desc: 'Connect your broker without giving trading permissions' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{label}</p>
                  <p className="text-text-muted text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-text-muted text-xs mt-6">
            Your credentials are never stored by Cortex — you authenticate directly with your broker via SnapTrade.
          </p>
        </div>
      </div>
    </div>
  )
}


export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-text-secondary">Loading...</p></div>}>
      <PricingContent />
    </Suspense>
  )
}
