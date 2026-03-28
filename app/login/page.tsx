'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const API_URL = ""; // API is same-origin

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store token and user
        localStorage.setItem('cortex_token', data.token)
        localStorage.setItem('cortex_user', JSON.stringify(data.user))
        
        // Hard redirect to ensure middleware picks up new auth state
        window.location.href = '/dashboard'
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
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

        {/* Login form */}
        <div className="bg-surface rounded-2xl border border-gray-700 p-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-text-secondary mb-8">
            Log in to access your AI trading dashboard
          </p>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-sm text-text-secondary hover:text-primary transition-colors">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
