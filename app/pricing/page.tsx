'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowLeft, Loader2 } from 'lucide-react'

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
