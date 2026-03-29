'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Link2, CheckCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'

export default function ConnectBrokerPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  // Check if coming back from successful connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      router.push('/dashboard')
    }
  }, [router])

  const handleConnect = async () => {
    setConnecting(true)
    setError('')

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/snaptrade/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/connect?connected=true`,
        }),
      })

      const data = await res.json()

      if (data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        setError(data.error || 'Failed to get connection portal')
        setConnecting(false)
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed')
      setConnecting(false)
    }
  }

  const supportedBrokers = [
    { name: 'Wealthsimple', emoji: '🇨🇦', region: 'Canada' },
    { name: 'Webull', emoji: '📈', region: 'US' },
    { name: 'Schwab', emoji: '💼', region: 'US' },
    { name: 'Questrade', emoji: '🍁', region: 'Canada' },
    { name: 'Interactive Brokers', emoji: '🌐', region: 'Global' },
    { name: 'Alpaca', emoji: '🦙', region: 'US' },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-gray-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Connect Your Broker</h1>
            <p className="text-text-secondary">
              Link your brokerage to enable automated trading
            </p>
          </div>

          {/* Supported Brokers */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-text-secondary mb-3">Supported Brokers</p>
            <div className="flex flex-wrap gap-2">
              {supportedBrokers.map((broker) => (
                <span
                  key={broker.name}
                  className="px-3 py-1.5 bg-background rounded-lg text-sm flex items-center gap-1.5"
                >
                  <span>{broker.emoji}</span>
                  <span className="text-text-secondary">{broker.name}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">+ 15 more via SnapTrade</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-4 bg-primary hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                Connect Broker
              </>
            )}
          </button>

          {/* Security note */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-background rounded-xl">
            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Bank-Level Security</p>
              <p className="text-xs text-text-secondary mt-1">
                Your credentials are never shared with us. You authenticate directly with your broker via SnapTrade's encrypted portal.
              </p>
            </div>
          </div>
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-text-secondary hover:text-white text-sm transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
