'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sun,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function HeliosSettingsPage() {
  const router = useRouter()
  const { token, loading: authLoading, isAuthenticated } = useAuth()

  const [settings, setSettings] = useState({
    helios_enabled: false,
    helios_position_size: 2,
    has_helios_role: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!token) return
    fetch('/api/helios/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setSettings({
          helios_enabled: data.helios_enabled ?? false,
          helios_position_size: data.helios_position_size ?? 2,
          has_helios_role: data.has_helios_role ?? false,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const saveSettings = async (newSettings: typeof settings) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/helios/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: newSettings.helios_enabled,
          position_size_pct: newSettings.helios_position_size,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved!' })
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  const refreshRole = async () => {
    setRefreshing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/helios/refresh-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSettings(s => ({ ...s, has_helios_role: data.has_helios_role }))
      setMessage({
        type: data.has_helios_role ? 'success' : 'error',
        text: data.message || (data.has_helios_role ? 'Role verified!' : 'Role not found'),
      })
    } catch {
      setMessage({ type: 'error', text: 'Failed to check role' })
    } finally {
      setRefreshing(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/helios"
            className="p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Helios Settings</h1>
              <p className="text-xs text-text-secondary">Configure auto-execution</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
              {message.text}
            </p>
          </motion.div>
        )}

        {/* Role Status */}
        <div className="rounded-xl border border-white/10 bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${settings.has_helios_role ? 'text-green-400' : 'text-red-400'}`} />
              <div>
                <p className="font-semibold text-white">Helios Discord Role</p>
                <p className="text-xs text-text-secondary">
                  {settings.has_helios_role
                    ? 'You have the Helios role — auto-execute available'
                    : 'Helios role required for auto-execution'}
                </p>
              </div>
            </div>
            <button
              onClick={refreshRole}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 text-sm text-text-secondary hover:text-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Auto-Execute Toggle */}
        <div className="rounded-xl border border-white/10 bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.helios_enabled ? (
                <ToggleRight className="w-8 h-8 text-green-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-text-secondary" />
              )}
              <div>
                <p className="font-semibold text-white">Auto-Execute Signals</p>
                <p className="text-xs text-text-secondary">
                  {settings.helios_enabled
                    ? 'Helios will automatically place trades'
                    : 'Signals only — manual trading'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = { ...settings, helios_enabled: !settings.helios_enabled }
                setSettings(next)
                saveSettings(next)
              }}
              disabled={saving || !settings.has_helios_role}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                settings.helios_enabled
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-surface-elevated text-text-secondary hover:text-white'
              } ${!settings.has_helios_role ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {settings.helios_enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Position Size */}
        <div className="rounded-xl border border-white/10 bg-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-white">Position Size</p>
              <p className="text-xs text-text-secondary">Percentage of account per trade</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Size</span>
              <span className="text-primary font-bold">{settings.helios_position_size}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={settings.helios_position_size}
              onChange={(e) => setSettings(s => ({ ...s, helios_position_size: Number(e.target.value) }))}
              onMouseUp={(e) => {
                const next = { ...settings, helios_position_size: Number((e.target as HTMLInputElement).value) }
                saveSettings(next)
              }}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>1% (conservative)</span>
              <span>10% (aggressive)</span>
            </div>
          </div>
        </div>

        {/* Save indicator */}
        {saving && (
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
