'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'

const API_URL = ""; // API is same-origin

function SignupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tier, setTier] = useState<string | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(!!sessionId)

  // Verify Stripe session and get tier
  useEffect(() => {
    if (sessionId) {
      verifyStripeSession()
    }
  }, [sessionId])

  const verifyStripeSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/checkout/verify?session_id=${sessionId}`)
      const data = await response.json()
      
      if (response.ok && data.tier) {
        setTier(data.tier)
        if (data.email) {
          setEmail(data.email)
        }
      } else {
        setError('Payment verification failed. Please try again.')
      }
    } catch (err) {
      setError('Unable to verify payment. Please contact support.')
    } finally {
      setVerifyingPayment(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Require Stripe session for signup
    if (!sessionId || !tier) {
      setError('Please select a plan first')
      router.push('/pricing')
      return
    }

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          tier, // Include the paid tier
          stripeSessionId: sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store token and user
        localStorage.setItem('cortex_token', data.token)
        localStorage.setItem('cortex_user', JSON.stringify(data.user))
        
        // Hard redirect to ensure middleware picks up new auth state
        window.location.href = '/onboarding'
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // No session_id - redirect to pricing
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-4">Select a Plan First</h1>
          <p className="text-text-secondary mb-8">
            Choose a plan to get started with Cortex Capital
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-accent transition-all"
          >
            View Plans
          </Link>
        </div>
      </div>
    )
  }

  // Verifying payment
  if (verifyingPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Verifying Payment</h1>
          <p className="text-text-secondary">Just a moment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="animate-float animate-glow">
            <img src="/cortex-logo.png" alt="Cortex Capital" className="w-10 h-10" />
          </div>
          <span className="text-2xl font-semibold text-primary">Cortex Capital</span>
        </div>

        {/* Payment confirmed badge */}
        {tier && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-primary">Payment Confirmed!</p>
              <p className="text-sm text-text-secondary">
                {tier.charAt(0).toUpperCase() + tier.slice(1)} plan - Now create your account
              </p>
            </div>
          </div>
        )}

        {/* Signup form */}
        <div className="bg-surface rounded-2xl border border-gray-700 p-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary mb-8">
            Complete your registration to get started
          </p>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="••••••••"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-text-secondary">
                At least 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !tier}
              className="w-full py-4 bg-primary text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </div>

          <p className="mt-6 text-xs text-text-muted text-center">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}


export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-text-secondary">Loading...</p></div>}>
      <SignupContent />
    </Suspense>
  )
}
