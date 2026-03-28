'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Smartphone, Zap, BarChart3, TrendingUp, Bell, Rocket, Clock } from 'lucide-react'

interface NotificationSettings {
  email: {
    tradeAlerts: boolean
    dailySummary: boolean
    weeklyReport: boolean
    accountActivity: boolean
    systemUpdates: boolean
  }
  push: {
    tradeAlerts: boolean
    dailySummary: boolean
    weeklyReport: boolean
    accountActivity: boolean
    systemUpdates: boolean
  }
}

const NotificationIcon = ({ iconType }: { iconType: string }) => {
  const iconClass = "w-5 h-5 text-purple-400"
  switch (iconType) {
    case 'zap': return <Zap className={iconClass} />
    case 'chart': return <BarChart3 className={iconClass} />
    case 'trending': return <TrendingUp className={iconClass} />
    case 'bell': return <Bell className={iconClass} />
    case 'rocket': return <Rocket className={iconClass} />
    default: return <Bell className={iconClass} />
  }
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      tradeAlerts: true,
      dailySummary: true,
      weeklyReport: true,
      accountActivity: true,
      systemUpdates: false,
    },
    push: {
      tradeAlerts: true,
      dailySummary: false,
      weeklyReport: false,
      accountActivity: true,
      systemUpdates: false,
    },
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // TODO: API call to update notification settings
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  const toggleEmail = (key: keyof NotificationSettings['email']) => {
    setSettings({
      ...settings,
      email: { ...settings.email, [key]: !settings.email[key] },
    })
  }

  const togglePush = (key: keyof NotificationSettings['push']) => {
    setSettings({
      ...settings,
      push: { ...settings.push, [key]: !settings.push[key] },
    })
  }

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  )

  const notifications = [
    {
      key: 'tradeAlerts' as const,
      label: 'Trade Alerts',
      description: 'Real-time notifications when trades are executed',
      iconType: 'zap',
    },
    {
      key: 'dailySummary' as const,
      label: 'Daily Summary',
      description: 'Portfolio performance recap at end of day',
      iconType: 'chart',
    },
    {
      key: 'weeklyReport' as const,
      label: 'Weekly Report',
      description: 'Comprehensive performance analysis every Monday',
      iconType: 'trending',
    },
    {
      key: 'accountActivity' as const,
      label: 'Account Activity',
      description: 'Security alerts and important account changes',
      iconType: 'bell',
    },
    {
      key: 'systemUpdates' as const,
      label: 'System Updates',
      description: 'New features, maintenance, and announcements',
      iconType: 'rocket',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Notifications</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Control how you receive updates and alerts
        </p>
      </div>

      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-purple-400" /> Email Notifications
        </h3>
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <motion.div
              key={`email-${notification.key}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <NotificationIcon iconType={notification.iconType} />
                </div>
                <div>
                  <div className="font-medium">{notification.label}</div>
                  <div className="text-text-secondary text-sm">{notification.description}</div>
                </div>
              </div>
              <Toggle
                enabled={settings.email[notification.key]}
                onToggle={() => toggleEmail(notification.key)}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Push Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-400" /> Push Notifications
        </h3>
        <p className="text-text-secondary text-sm mb-4">
          Receive notifications on your mobile device or desktop
        </p>
        <div className="space-y-4">
          {notifications.map((notification, index) => (
            <motion.div
              key={`push-${notification.key}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + index * 0.05 }}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <NotificationIcon iconType={notification.iconType} />
                </div>
                <div>
                  <div className="font-medium">{notification.label}</div>
                  <div className="text-text-secondary text-sm">{notification.description}</div>
                </div>
              </div>
              <Toggle
                enabled={settings.push[notification.key]}
                onToggle={() => togglePush(notification.key)}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Notification Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="p-6 bg-primary/10 border border-primary/30 rounded-lg"
      >
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" /> Notification Schedule
        </h4>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Trade alerts: Real-time (during market hours)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Daily summary: 4:00 PM EST (after market close)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Weekly report: Mondays at 8:00 AM EST
          </li>
        </ul>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </motion.div>
    </div>
  )
}
