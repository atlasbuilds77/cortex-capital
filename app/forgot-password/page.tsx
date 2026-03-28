'use client'

import { useState } from 'react'
import Link from 'next/link'

const API_URL = ""; // API is same-origin

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to send reset email')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-400">
            Cortex Capital
          </h1>
          <p className="text-text-secondary mt-2">Reset your password</p>
        </div>

        {/* Form */}
        <div className="bg-surface rounded-2xl p-8 border border-gray-700">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
              
              <p className="text-text-secondary">
                We've sent a password reset link to{' '}
                <span className="text-text-primary font-medium">{email}</span>
              </p>
              
              <p className="text-sm text-text-muted">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <div className="pt-4">
                <Link
                  href="/login"
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  ← Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-surface-elevated border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-text-primary placeholder-text-muted"
                    placeholder="you@example.com"
                  />
                  <p className="mt-2 text-sm text-text-muted">
                    We'll send you a link to reset your password
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
