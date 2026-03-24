'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { StepTransition } from '@/components/onboarding/step-transition'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { 
  Shield, ShieldAlert, Flame, Skull,
  Link2, ExternalLink, ArrowRight, Check,
  Search, Zap, Crown, Sparkles
} from 'lucide-react'

type Step = 'risk' | 'brokerage' | 'tier'
type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const RISK_PROFILES: {
  id: RiskProfile
  label: string
  description: string
  icon: typeof Shield
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Preserve capital. Steady, low-risk growth with minimal drawdowns.',
    icon: Shield,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Balanced approach. Accept some volatility for stronger returns.',
    icon: ShieldAlert,
    color: 'text-primary',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Maximize growth. Comfortable with significant swings.',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
  },
  {
    id: 'ultra_aggressive',
    label: 'Ultra Aggressive',
    description: 'Maximum returns. High conviction, high volatility. Not for the faint-hearted.',
    icon: Skull,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
  },
]

const TIERS = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    icon: Search,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600',
    features: [
      'Portfolio health monitoring',
      'Basic AI insights',
      '1 connected brokerage',
      'Daily market summaries',
    ],
    cta: 'Current Plan',
    current: true,
  },
  {
    id: 'scout',
    label: 'Scout',
    price: '$49',
    icon: Zap,
    color: 'text-primary',
    bgColor: 'bg-gradient-to-r from-primary to-secondary',
    features: [
      'Everything in Free',
      '3 AI trading agents',
      'Automated rebalancing',
      'Tax-loss harvesting',
      'Up to $25k portfolio',
    ],
    cta: 'Upgrade to Scout',
    current: false,
    popular: true,
  },
  {
    id: 'operator',
    label: 'Operator',
    price: '$99',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    features: [
      'Everything in Scout',
      'All 7 AI agents',
      'Options strategies',
      'Priority execution',
      'Up to $250k portfolio',
    ],
    cta: 'Upgrade to Operator',
    current: false,
  },
]

function OnboardingFlow() {
  const router = useRouter()
  const { user, updateUser, token } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('risk')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [selectedRisk, setSelectedRisk] = useState<RiskProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const steps: Step[] = ['risk', 'brokerage', 'tier']
  const stepNames = ['Risk Profile', 'Connect Brokerage', 'Choose Plan']
  const currentStepIndex = steps.indexOf(currentStep)

  const goToStep = (step: Step, dir: 'forward' | 'backward' = 'forward') => {
    setDirection(dir)
    setError('')
    setCurrentStep(step)
  }

  const saveRiskProfile = async () => {
    if (!selectedRisk) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/profile/select`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ risk_profile: selectedRisk }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save risk profile')
      }

      updateUser({ risk_profile: selectedRisk })
      goToStep('brokerage', 'forward')
    } catch (err: any) {
      setError(err.message || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleTradierConnect = () => {
    // Redirect to Tradier OAuth flow on the backend
    window.location.href = `${API_URL}/api/broker/tradier/auth`
  }

  const handleComplete = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Cortex Capital</h1>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          currentStep={currentStepIndex}
          totalSteps={steps.length}
          stepNames={stepNames}
        />

        {/* Error */}
        {error && (
          <div className="mb-4 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Steps */}
        <StepTransition step={currentStep} direction={direction}>
          <div className="min-h-[500px]">
            {/* STEP 1: Risk Profile */}
            {currentStep === 'risk' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Welcome to Cortex</h2>
                  <p className="text-text-secondary">
                    Choose your risk profile to personalize your AI agents
                  </p>
                </div>

                <div className="space-y-3">
                  {RISK_PROFILES.map((profile) => {
                    const Icon = profile.icon
                    const isSelected = selectedRisk === profile.id
                    return (
                      <button
                        key={profile.id}
                        onClick={() => setSelectedRisk(profile.id)}
                        className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-left flex items-start gap-4 ${
                          isSelected
                            ? `${profile.borderColor} ${profile.bgColor}`
                            : 'border-white/[0.08] bg-surface hover:bg-surface-elevated hover:border-gray-600'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${isSelected ? profile.bgColor : 'bg-surface-elevated'}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? profile.color : 'text-text-secondary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                              {profile.label}
                            </h3>
                            {isSelected && (
                              <Check className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {profile.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={saveRiskProfile}
                  disabled={!selectedRisk || saving}
                  className={`w-full py-4 rounded-lg font-semibold transition-all duration-200 ${
                    selectedRisk && !saving
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20'
                      : 'bg-surface-elevated text-text-muted cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: Connect Brokerage */}
            {currentStep === 'brokerage' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Link2 className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Connect Your Brokerage</h2>
                  <p className="text-text-secondary">
                    Link your account so our AI agents can work for you
                  </p>
                </div>

                {/* Tradier OAuth */}
                <div className="p-6 bg-surface rounded-xl border border-white/[0.08]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-green-400 font-bold text-lg">T</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">Tradier</h3>
                      <p className="text-sm text-text-secondary">Commission-free stock & options trading</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleTradierConnect}
                    className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect with Tradier
                  </button>
                </div>

                {/* Coming soon brokers */}
                <div className="space-y-3 opacity-60">
                  {['Alpaca', 'Robinhood', 'Interactive Brokers'].map((broker) => (
                    <div key={broker} className="p-4 bg-surface rounded-xl border border-white/[0.08]/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                          <span className="text-text-muted font-medium">{broker[0]}</span>
                        </div>
                        <span className="text-text-secondary">{broker}</span>
                      </div>
                      <span className="text-xs text-text-muted bg-surface-elevated px-2 py-1 rounded">Coming Soon</span>
                    </div>
                  ))}
                </div>

                {/* Trust signals */}
                <div className="flex items-center gap-2 justify-center text-xs text-text-muted">
                  <Shield className="w-3.5 h-3.5" />
                  <span>We never store your broker credentials. OAuth only.</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep('tier', 'forward')}
                    className="flex-1 py-4 rounded-lg font-semibold bg-surface hover:bg-surface-elevated transition-all text-text-secondary"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Tier Comparison */}
            {currentStep === 'tier' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
                  <p className="text-text-secondary">
                    Start free, upgrade when you&apos;re ready
                  </p>
                </div>

                <div className="space-y-4">
                  {TIERS.map((tier) => {
                    const Icon = tier.icon
                    return (
                      <div
                        key={tier.id}
                        className={`p-6 rounded-xl border-2 transition-all relative ${
                          tier.current
                            ? 'border-cyan-500 bg-cyan-500/5'
                            : tier.popular
                            ? 'border-purple-500 bg-purple-500/5'
                            : 'border-white/[0.08] bg-surface'
                        }`}
                      >
                        {tier.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Most Popular
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tier.bgColor}/10`}>
                              <Icon className={`w-5 h-5 ${tier.color}`} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-white">{tier.label}</h3>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-white">{tier.price}</span>
                                <span className="text-text-muted text-sm">/month</span>
                              </div>
                            </div>
                          </div>
                          {tier.current && (
                            <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <ul className="space-y-2 mb-4">
                          {tier.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                              <Check className={`w-4 h-4 flex-shrink-0 ${tier.color}`} />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {!tier.current && (
                          <button
                            className={`w-full py-2.5 rounded-lg font-medium transition-all text-sm ${
                              tier.popular
                                ? 'bg-gradient-to-r from-primary to-secondary text-white hover:bg-purple-500'
                                : 'bg-surface-elevated text-text-primary hover:bg-gray-700'
                            }`}
                          >
                            {tier.cta}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-4 rounded-lg font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </StepTransition>

        {/* Back button */}
        {currentStepIndex > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => goToStep(steps[currentStepIndex - 1], 'backward')}
              className="text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingFlow />
    </ProtectedRoute>
  )
}
