'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function RobinhoodConnectPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/connect-robinhood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username,
          password,
          ...(needsMfa && { mfaCode }),
        }),
      })

      const data = await res.json()

      if (data.requiresMfa) {
        setNeedsMfa(true)
        setLoading(false)
        return
      }

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/settings/brokers?connected=true')
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Brokers
        </button>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-2xl border border-gray-700 p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🪶</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Connect Robinhood</h1>
            <p className="text-text-secondary text-sm">
              Enter your Robinhood credentials for full trading access
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-400">Connected!</h2>
              <p className="text-text-secondary mt-2">Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Email or Phone
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  placeholder="your@email.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* MFA Code */}
              {needsMfa && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    2FA Code
                  </label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    placeholder="123456"
                    autoFocus
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    Check your authenticator app or SMS
                  </p>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {needsMfa ? 'Verifying...' : 'Connecting...'}
                  </>
                ) : (
                  needsMfa ? 'Verify & Connect' : 'Connect Robinhood'
                )}
              </button>
            </form>
          )}

          {/* Security note */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-background rounded-xl">
            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Encrypted & Secure</p>
              <p className="text-xs text-text-secondary mt-1">
                Your credentials are encrypted with AES-256 and stored securely. We use the same security standards as financial institutions.
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Unofficial API</p>
              <p className="text-xs text-text-secondary mt-1">
                Robinhood doesn't offer an official trading API. This integration uses reverse-engineered methods and may break if Robinhood changes their systems.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
