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

type Step = 'risk' | 'brokerage' | 'welcome'
type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive'

const API_URL = ""; // API is same-origin

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
    id: 'recovery',
    label: 'Recovery',
    tagline: 'I\'m learning',
    price: '$29',
    icon: Search,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600',
    features: [
      'Watch agent discussions',
      'Alerts and analytics',
      'Educational content',
      'See WHY trades happen',
      'No execution',
    ],
    cta: 'Start Learning',
    current: false,
  },
  {
    id: 'scout',
    label: 'Scout',
    tagline: 'I\'m trading',
    price: '$49',
    icon: Zap,
    color: 'text-primary',
    bgColor: 'bg-primary',
    features: [
      'Everything in Recovery',
      'Full agent access and phone booth',
      'Real-time signals with reasoning',
      'Priority support',
      'Your own portfolio analysis',
    ],
    cta: 'Start Trading',
    current: false,
    popular: true,
  },
  {
    id: 'operator',
    label: 'Operator',
    tagline: 'It trades for me',
    price: '$99',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    features: [
      'Everything in Scout',
      'Auto-execution (connect broker)',
      'Personal hedge fund experience',
      'Long-term portfolio management',
      'The full Cortex desk working FOR you',
    ],
    cta: 'Go Full Auto',
    current: false,
  },
]

function OnboardingFlow() {
  const router = useRouter()
  const { user, updateUser, token } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('risk')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [selectedRisk, setSelectedRisk] = useState<RiskProfile | null>(null)
  // Tier is already set from Stripe checkout - no need to select here
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const steps: Step[] = ['risk', 'brokerage', 'welcome']
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

  const handleComplete = async () => {
    // User already has a tier from signup - just go to dashboard
    window.location.href = '/dashboard'
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
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <img src="/cortex-logo.png" alt="Cortex" className="w-14 h-14" />
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
                      ? 'bg-primary text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20'
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

                {/* Available Brokers */}
                <div className="space-y-3">
                  {/* Robinhood */}
                  <div className="p-5 bg-surface rounded-xl border border-white/[0.08]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 font-bold text-lg">🪶</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">Robinhood</h3>
                        <p className="text-sm text-text-secondary">Commission-free trading</p>
                      </div>
                    </div>
                    <a
                      href="/settings/brokers"
                      className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect Robinhood
                    </a>
                  </div>

                  {/* Tradier */}
                  <div className="p-5 bg-surface rounded-xl border border-white/[0.08]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-blue-400 font-bold text-lg">T</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">Tradier</h3>
                        <p className="text-sm text-text-secondary">Commission-free stock & options</p>
                      </div>
                    </div>
                    <button
                      onClick={handleTradierConnect}
                      className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect Tradier
                    </button>
                  </div>

                  {/* Alpaca */}
                  <div className="p-5 bg-surface rounded-xl border border-white/[0.08]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-400 font-bold text-lg">🦙</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">Alpaca</h3>
                        <p className="text-sm text-text-secondary">API-first trading</p>
                      </div>
                    </div>
                    <a
                      href="/settings/brokers"
                      className="w-full py-3 px-4 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect Alpaca
                    </a>
                  </div>
                </div>

                {/* Coming soon */}
                <div className="p-4 bg-surface/50 rounded-xl border border-white/[0.05] flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">Interactive Brokers, Webull, TD Ameritrade</span>
                  </div>
                  <span className="text-xs text-text-muted bg-surface-elevated px-2 py-1 rounded">Coming Soon</span>
                </div>

                {/* Trust signals */}
                <div className="flex items-center gap-2 justify-center text-xs text-text-muted">
                  <Shield className="w-3.5 h-3.5" />
                  <span>We never store your broker credentials. OAuth only.</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep('welcome', 'forward')}
                    className="flex-1 py-4 rounded-lg font-semibold bg-surface hover:bg-surface-elevated transition-all text-text-secondary"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Welcome / You're All Set */}
            {currentStep === 'welcome' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">You&apos;re All Set!</h2>
                  <p className="text-text-secondary">
                    Your AI agents are ready to work for you
                  </p>
                </div>

                {/* Show current tier */}
                <div className="p-6 rounded-xl border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Your Plan</p>
                      <p className="text-xl font-bold text-white capitalize">
                        {user?.tier || 'Premium'} Member
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-surface border border-white/[0.08]">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-text-primary">Risk profile configured</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-surface border border-white/[0.08]">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-text-primary">
                      {selectedBroker ? `${selectedBroker.name} connected` : 'Broker setup complete'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-surface border border-white/[0.08]">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-text-primary">AI agents activated</span>
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-4 rounded-lg font-semibold bg-primary text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
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
