'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface TradingSettings {
  auto_execute_enabled: boolean
  risk_profile: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive'
  max_position_size: number
  max_daily_loss: number
  allowed_symbols: string[]
  trading_hours: {
    start: string
    end: string
  }
}

export default function TradingSettingsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<TradingSettings>({
    auto_execute_enabled: false,
    risk_profile: 'moderate',
    max_position_size: 10000,
    max_daily_loss: 500,
    allowed_symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN'],
    trading_hours: {
      start: '09:30',
      end: '16:00'
    }
  })
  const [newSymbol, setNewSymbol] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings/trading', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (error) {
      console.error('Failed to fetch trading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/settings/trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ settings }),
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Trading settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const addSymbol = () => {
    if (newSymbol.trim() && !settings.allowed_symbols.includes(newSymbol.toUpperCase())) {
      setSettings({
        ...settings,
        allowed_symbols: [...settings.allowed_symbols, newSymbol.toUpperCase()]
      })
      setNewSymbol('')
    }
  }

  const removeSymbol = (symbol: string) => {
    setSettings({
      ...settings,
      allowed_symbols: settings.allowed_symbols.filter(s => s !== symbol)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Trading Settings</h2>
        <p className="text-text-secondary">
          Configure how your AI agents execute trades and manage risk
        </p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-700 text-green-400' 
              : 'bg-red-900/20 border-red-700 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Auto-Execution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-elevated rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Auto-Execution</h3>
          </div>
          <p className="text-text-secondary mb-6 text-sm">
            When enabled, AI agents will automatically execute approved trades. 
            When disabled, agents will still analyze and recommend trades for manual review.
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text-primary">Auto-Execute Trades</div>
              <div className="text-sm text-text-secondary">
                {settings.auto_execute_enabled 
                  ? 'Agents will execute trades automatically' 
                  : 'Agents will only recommend trades'}
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_execute_enabled: !settings.auto_execute_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_execute_enabled ? 'bg-primary' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_execute_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </motion.div>

        {/* Risk Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-elevated rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Risk Profile</h3>
          </div>
          <p className="text-text-secondary mb-6 text-sm">
            Your risk profile determines position sizing, stop losses, and take profit targets.
          </p>
          
          <div className="space-y-3">
            {[
              { 
                value: 'conservative', 
                label: 'Conservative', 
                desc: '3-5% per trade, max 3 positions',
                color: 'text-green-400',
                stats: 'Stop: 5% | TP: 10%'
              },
              { 
                value: 'moderate', 
                label: 'Moderate', 
                desc: '5-10% per trade, max 4 positions',
                color: 'text-blue-400',
                stats: 'Stop: 7% | TP: 15%'
              },
              { 
                value: 'aggressive', 
                label: 'Aggressive', 
                desc: '10-15% per trade, max 5 positions',
                color: 'text-orange-400',
                stats: 'Stop: 10% | TP: 25%'
              },
              { 
                value: 'ultra_aggressive', 
                label: 'Ultra Aggressive', 
                desc: '15-25% per trade, max 6 positions',
                color: 'text-red-400',
                stats: 'Stop: 15% | TP: 40%'
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSettings({ ...settings, risk_profile: option.value as TradingSettings['risk_profile'] })}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  settings.risk_profile === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${option.color}`}>{option.label}</div>
                    <div className="text-sm text-text-secondary">{option.desc}</div>
                    <div className="text-xs text-text-secondary mt-1">{option.stats}</div>
                  </div>
                  {settings.risk_profile === option.value && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Position Limits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-elevated rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Position Limits</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Position Size ($)
              </label>
              <input
                type="number"
                value={settings.max_position_size}
                onChange={(e) => setSettings({ ...settings, max_position_size: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-text-primary focus:outline-none focus:border-primary"
                min="100"
                max="100000"
              />
              <p className="text-xs text-text-secondary mt-2">
                Maximum amount to invest in a single position
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Daily Loss ($)
              </label>
              <input
                type="number"
                value={settings.max_daily_loss}
                onChange={(e) => setSettings({ ...settings, max_daily_loss: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-text-primary focus:outline-none focus:border-primary"
                min="10"
                max="5000"
              />
              <p className="text-xs text-text-secondary mt-2">
                Stop trading for the day if losses exceed this amount
              </p>
            </div>
          </div>
        </motion.div>

        {/* Allowed Symbols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-elevated rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Allowed Symbols</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="Add symbol (e.g., AAPL)"
                className="flex-1 px-4 py-2 bg-surface border border-gray-700 rounded-lg text-text-primary focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
              />
              <button
                onClick={addSymbol}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {settings.allowed_symbols.map((symbol) => (
              <div
                key={symbol}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-gray-700 rounded-lg"
              >
                <span className="text-text-primary">{symbol}</span>
                <button
                  onClick={() => removeSymbol(symbol)}
                  className="text-text-secondary hover:text-danger transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          {settings.allowed_symbols.length === 0 && (
            <p className="text-text-secondary text-sm mt-2">
              No symbols added. Agents will analyze all available symbols.
            </p>
          )}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 pt-6 border-t border-gray-700"
      >
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Settings
        </button>
        
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-6 py-3 bg-surface border border-gray-700 text-text-secondary rounded-lg hover:bg-surface-elevated transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Reset to Defaults
        </button>
      </motion.div>
    </div>
  )
}