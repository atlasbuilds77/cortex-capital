'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, Mail, MessageSquare, Smartphone, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface NotificationSettings {
  notification_email: string
  email_trade_executed: boolean
  email_stop_loss: boolean
  email_trade_signals: boolean
  email_daily_digest: boolean
  email_weekly_report: boolean
  email_account_alerts: boolean
  push_enabled: boolean
}

const NOTIFICATION_OPTIONS = [
  {
    id: 'email_trade_executed',
    label: 'Trade Executed',
    description: 'Get notified when a trade is executed on your behalf',
    icon: Mail,
    tier: 'operator',
  },
  {
    id: 'email_stop_loss',
    label: 'Stop Loss Triggered',
    description: 'Immediate alert when a stop loss is hit',
    icon: Mail,
    tier: 'operator',
  },
  {
    id: 'email_trade_signals',
    label: 'Trade Signals',
    description: 'When agents identify a trading opportunity',
    icon: Mail,
    tier: 'scout',
  },
  {
    id: 'email_daily_digest',
    label: 'Daily Digest',
    description: 'End-of-day portfolio summary',
    icon: Mail,
    tier: 'recovery',
  },
  {
    id: 'email_weekly_report',
    label: 'Weekly Report',
    description: 'Weekly performance and insights',
    icon: Mail,
    tier: 'operator',
  },
  {
    id: 'email_account_alerts',
    label: 'Account Alerts',
    description: 'Important account notifications',
    icon: Mail,
    tier: 'free',
  },
]

const TIER_HIERARCHY = { free: 0, recovery: 1, scout: 2, operator: 3, partner: 4 }

export default function NotificationsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    notification_email: '',
    email_trade_executed: true,
    email_stop_loss: true,
    email_trade_signals: true,
    email_daily_digest: true,
    email_weekly_report: true,
    email_account_alerts: true,
    push_enabled: false,
  })

  const userTierLevel = TIER_HIERARCHY[user?.tier as keyof typeof TIER_HIERARCHY] || 0

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user/notifications', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setSettings({ ...settings, ...data })
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [token])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings({ ...settings, [key]: !settings[key] })
  }

  const canAccess = (requiredTier: string) => {
    const requiredLevel = TIER_HIERARCHY[requiredTier as keyof typeof TIER_HIERARCHY] || 0
    return userTierLevel >= requiredLevel
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
        <h2 className="text-2xl font-bold hidden lg:block">Notifications</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Choose how and when you want to be notified
        </p>
      </div>

      {/* Notification Email */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Notification Email</h3>
        </div>
        <div className="p-4 rounded-lg border border-gray-700 bg-background">
          <label htmlFor="notification-email" className="block text-sm font-medium mb-2">
            Send notifications to
          </label>
          <input
            id="notification-email"
            type="email"
            value={settings.notification_email}
            onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
            placeholder={user?.email || "Enter email address"}
            className="w-full px-4 py-3 rounded-lg bg-surface border border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
          <p className="text-text-secondary text-sm mt-2">
            Leave empty to use your account email ({user?.email})
          </p>
        </div>
      </motion.div>

      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Email Alerts</h3>
        </div>
        <div className="space-y-3">
          {NOTIFICATION_OPTIONS.map((option) => {
            const hasAccess = canAccess(option.tier)
            const isEnabled = settings[option.id as keyof NotificationSettings]
            
            return (
              <div
                key={option.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  hasAccess 
                    ? 'bg-background border-gray-700' 
                    : 'bg-background/50 border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasAccess ? 'bg-primary/20' : 'bg-gray-800'
                  }`}>
                    {hasAccess ? (
                      <option.icon className="w-5 h-5 text-primary" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {option.label}
                      {!hasAccess && (
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                          {option.tier}+
                        </span>
                      )}
                    </div>
                    <div className="text-text-secondary text-sm">{option.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => hasAccess && toggleSetting(option.id as keyof NotificationSettings)}
                  disabled={!hasAccess}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    !hasAccess 
                      ? 'bg-gray-800 cursor-not-allowed'
                      : isEnabled 
                        ? 'bg-primary cursor-pointer' 
                        : 'bg-gray-700 cursor-pointer'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      isEnabled && hasAccess ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 text-text-secondary" />
          <h3 className="text-lg font-semibold text-text-secondary">More Coming Soon</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg border border-gray-800 bg-background/30 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4" />
              <span className="font-medium">Push Notifications</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800">Soon</span>
            </div>
            <p className="text-sm text-text-secondary">Browser push alerts</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-800 bg-background/30 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Telegram</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800">Soon</span>
            </div>
            <p className="text-sm text-text-secondary">Real-time alerts via Telegram</p>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Settings saved!</span>}
        </div>
      </motion.div>
    </div>
  )
}
