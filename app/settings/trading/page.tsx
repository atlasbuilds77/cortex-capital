'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Shield, AlertTriangle, Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const TIER_CAN_EXECUTE: Record<string, boolean> = {
  recovery: false,
  scout: true,
  operator: true,
}

const TIER_FEATURES: Record<string, string[]> = {
  recovery: ['View-only mode', 'Learn from agent discussions'],
  scout: ['Auto-execute stocks only', 'No options trading'],
  operator: ['Auto-execute stocks', 'Auto-execute options', 'LEAPS strategies'],
}

export default function TradingSettingsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [autoExecuteEnabled, setAutoExecuteEnabled] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const tier = user?.tier || 'recovery'
  const canExecute = TIER_CAN_EXECUTE[tier] || false
  const features = TIER_FEATURES[tier] || []

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user/trading-settings', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setAutoExecuteEnabled(data.auto_execute_enabled || false)
        }
      } catch (error) {
        console.error('Failed to load trading settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [token])

  const handleToggle = async () => {
    if (autoExecuteEnabled && !confirmDisable) {
      setConfirmDisable(true)
      return
    }

    setSaving(true)
    setSaved(false)
    setConfirmDisable(false)

    try {
      const res = await fetch('/api/user/trading-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ auto_execute_enabled: !autoExecuteEnabled }),
      })
      if (res.ok) {
        setAutoExecuteEnabled(!autoExecuteEnabled)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save trading settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Trading Settings</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Control how AI agents trade on your behalf
        </p>
      </div>

      {/* Auto-Execute Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-surface rounded-xl border border-white/[0.08]"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${autoExecuteEnabled ? 'bg-green-500/20' : 'bg-gray-800'}`}>
              <Zap className={`w-6 h-6 ${autoExecuteEnabled ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Auto-Execute Trades
                {!canExecute && <Lock className="w-4 h-4 text-gray-500" />}
              </h3>
              <p className="text-text-secondary text-sm mt-1 max-w-md">
                When enabled, AI agents will automatically execute trades based on their analysis. 
                All trades follow your risk profile and preferences.
              </p>
              {canExecute && features.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {features.map((f, i) => (
                    <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {canExecute ? (
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                autoExecuteEnabled ? 'bg-green-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                  autoExecuteEnabled ? 'translate-x-7' : ''
                }`}
              />
            </button>
          ) : (
            <a
              href="/pricing"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors"
            >
              Upgrade to Scout
            </a>
          )}
        </div>

        {/* Confirmation dialog */}
        {confirmDisable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-200 font-medium">Disable auto-trading?</p>
                <p className="text-orange-200/70 text-sm mt-1">
                  Your existing positions will remain open. Agents will stop executing new trades.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleToggle}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-400"
                  >
                    Yes, disable
                  </button>
                  <button
                    onClick={() => setConfirmDisable(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {saved && (
          <p className="mt-4 text-green-400 text-sm">
            ✓ Settings saved! {autoExecuteEnabled ? 'Auto-trading is now active.' : 'Auto-trading disabled.'}
          </p>
        )}
      </motion.div>

      {/* Safety Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 bg-surface rounded-xl border border-white/[0.08]"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Safety Measures</h3>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Position sizes capped based on your risk profile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Automatic stop-losses on all positions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Email notifications for every trade</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Your exclusions (sectors/stocks) are always respected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Disable anytime - existing positions stay open</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
