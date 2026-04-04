'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sun,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  DollarSign,
  BarChart2,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

const API_URL = ''

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeliosSignal {
  id: string
  ticker: string
  direction: 'CALL' | 'PUT'
  strike?: number
  expiry?: string
  confidence: number
  timestamp: string
  status: 'pending' | 'executed' | 'expired' | 'cancelled'
  entry_price?: number
  current_price?: number
  pnl?: number
}

interface HeliosPosition {
  id: string
  ticker: string
  direction: 'CALL' | 'PUT'
  strike: number
  expiry: string
  qty: number
  entry_price: number
  current_price: number
  pnl: number
  pnl_pct: number
  opened_at: string
}

interface HeliosStats {
  total_signals: number
  win_rate: number
  total_pnl: number
  avg_return: number
  signals_today: number
  streak: number
  streak_type: 'win' | 'loss'
  best_trade: number
  worst_trade: number
}

interface HeliosSettings {
  auto_execute: boolean
  position_size_pct: number
  tickers: { SPX: boolean; QQQ: boolean; IWM: boolean }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  const abs = Math.abs(n)
  const str = abs >= 1000
    ? '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '$' + abs.toFixed(2)
  return n < 0 ? '-' + str : str
}

function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  valueColor?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-white/10 bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueColor ?? 'text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
    </motion.div>
  )
}

function SignalBadge({ signal }: { signal: HeliosSignal }) {
  const isCall = signal.direction === 'CALL'
  const statusMap: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pending',   cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    executed:  { label: 'Executed',  cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    expired:   { label: 'Expired',   cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const { label, cls } = statusMap[signal.status] ?? statusMap.expired

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isCall ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
          {isCall
            ? <ArrowUpRight className="w-4 h-4 text-green-400" />
            : <ArrowDownRight className="w-4 h-4 text-red-400" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{signal.ticker}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {signal.direction}
            </span>
            {signal.strike && (
              <span className="text-xs text-text-secondary">${signal.strike}</span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{timeAgo(signal.timestamp)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs text-text-secondary">Confidence</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${signal.confidence}%` }}
              />
            </div>
            <span className="text-xs text-white font-medium">{signal.confidence}%</span>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${cls}`}>{label}</span>
      </div>
    </div>
  )
}

function PositionRow({ pos }: { pos: HeliosPosition }) {
  const isCall = pos.direction === 'CALL'
  const pnlPos = pos.pnl >= 0

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isCall ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
          {isCall
            ? <TrendingUp className="w-4 h-4 text-green-400" />
            : <TrendingDown className="w-4 h-4 text-red-400" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{pos.ticker}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {pos.direction}
            </span>
            <span className="text-xs text-text-secondary">${pos.strike} · {pos.expiry}</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{pos.qty} contract{pos.qty !== 1 ? 's' : ''} · entry ${pos.entry_price.toFixed(2)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold text-sm ${pnlPos ? 'text-green-400' : 'text-red-400'}`}>
          {fmt$(pos.pnl)}
        </p>
        <p className={`text-xs ${pnlPos ? 'text-green-400/70' : 'text-red-400/70'}`}>
          {fmtPct(pos.pnl_pct)}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HeliosDashboardPage() {
  const router = useRouter()
  const { token, loading: authLoading, isAuthenticated } = useAuth()

  const [signals, setSignals]   = useState<HeliosSignal[]>([])
  const [positions, setPositions] = useState<HeliosPosition[]>([])
  const [stats, setStats]       = useState<HeliosStats | null>(null)
  const [settings, setSettings] = useState<HeliosSettings>({
    auto_execute: false,
    position_size_pct: 2,
    tickers: { SPX: true, QQQ: true, IWM: false },
  })

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])

  // Fetch everything
  const fetchAll = useCallback(async () => {
    if (!token) return
    try {
      const [sigRes, posRes, statRes, setRes] = await Promise.all([
        fetch(`${API_URL}/api/helios/signals`,  { headers: authHeaders(), cache: 'no-store' }),
        fetch(`${API_URL}/api/helios/positions`, { headers: authHeaders(), cache: 'no-store' }),
        fetch(`${API_URL}/api/helios/stats`,     { headers: authHeaders(), cache: 'no-store' }),
        fetch(`${API_URL}/api/helios/settings`,  { headers: authHeaders(), cache: 'no-store' }),
      ])
      if (sigRes.ok)  setSignals((await sigRes.json()).signals ?? [])
      if (posRes.ok)  setPositions((await posRes.json()).positions ?? [])
      if (statRes.ok) setStats(await statRes.json())
      if (setRes.ok)  setSettings(await setRes.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, authHeaders])

  useEffect(() => {
    if (authLoading) return
    fetchAll()
    const id = setInterval(fetchAll, 30_000)
    return () => clearInterval(id)
  }, [authLoading, fetchAll])

  // Toggle auto-execute (inline + save)
  const toggleAutoExecute = async () => {
    const next = { ...settings, auto_execute: !settings.auto_execute }
    setSettings(next)
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/helios/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(next),
      })
    } finally {
      setSaving(false)
    }
  }

  // Update position size (debounced on blur)
  const handleSizeChange = async (val: number) => {
    const next = { ...settings, position_size_pct: val }
    setSettings(next)
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/helios/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(next),
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Helios Offline</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchAll() }}
            className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-accent font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalPnL = positions.reduce((s, p) => s + p.pnl, 0)
  const pnlColor = totalPnL >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl space-y-6"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Helios</h1>
              <p className="text-xs text-text-secondary">Options signal engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />}
            <Link
              href="/dashboard/helios/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-surface text-text-secondary hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* ── Auto-Execute + Position Size ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/10 bg-surface p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Auto-execute toggle */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={toggleAutoExecute}
                disabled={saving}
                className="flex items-center gap-3 group"
                aria-label="Toggle auto-execute"
              >
                {settings.auto_execute
                  ? <ToggleRight className="w-9 h-9 text-green-400 group-hover:text-green-300 transition-colors" />
                  : <ToggleLeft  className="w-9 h-9 text-text-secondary group-hover:text-white transition-colors" />}
                <div>
                  <p className={`font-semibold text-sm ${settings.auto_execute ? 'text-green-400' : 'text-text-secondary'}`}>
                    Auto-Execute {settings.auto_execute ? 'ON' : 'OFF'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {settings.auto_execute
                      ? 'Helios will place trades automatically'
                      : 'Signals only — no auto-trades'}
                  </p>
                </div>
              </button>
            </div>

            {/* Position size slider */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-white">Position Size</span>
                </div>
                <span className="text-sm font-bold text-primary">{settings.position_size_pct}% of account</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={settings.position_size_pct}
                onChange={(e) => setSettings(s => ({ ...s, position_size_pct: Number(e.target.value) }))}
                onMouseUp={(e) => handleSizeChange(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSizeChange(Number((e.target as HTMLInputElement).value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                <span>1%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Win Rate"
            value={stats ? `${stats.win_rate.toFixed(1)}%` : '—'}
            sub={stats ? `${stats.total_signals} total signals` : undefined}
            valueColor={stats && stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}
            delay={0.1}
          />
          <StatCard
            icon={DollarSign}
            label="Total P&L"
            value={stats ? fmt$(stats.total_pnl) : '—'}
            sub={stats ? `Avg ${fmtPct(stats.avg_return)} / trade` : undefined}
            valueColor={stats && stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}
            delay={0.15}
          />
          <StatCard
            icon={Activity}
            label="Today's Signals"
            value={stats ? String(stats.signals_today) : '—'}
            sub="SPX · QQQ · IWM"
            delay={0.2}
          />
          <StatCard
            icon={BarChart2}
            label="Current Streak"
            value={stats ? `${stats.streak} ${stats.streak_type === 'win' ? '🔥' : '❄️'}` : '—'}
            sub={stats ? (stats.streak_type === 'win' ? 'Winning streak' : 'Losing streak') : undefined}
            valueColor={stats && stats.streak_type === 'win' ? 'text-green-400' : 'text-red-400'}
            delay={0.25}
          />
        </div>

        {/* ── Signals + Positions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Signals */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/10 bg-surface p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-white">Recent Signals</h2>
              </div>
              <span className="text-xs text-text-secondary">{signals.length} signals</span>
            </div>
            {signals.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No signals yet</p>
                <p className="text-xs text-text-secondary/60 mt-1">Helios scans every 5 minutes</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {signals.slice(0, 8).map(sig => (
                  <SignalBadge key={sig.id} signal={sig} />
                ))}
              </div>
            )}
          </motion.section>

          {/* Open Positions */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-white/10 bg-surface p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-white">Open Positions</h2>
              </div>
              <span className={`text-sm font-semibold ${pnlColor}`}>
                {fmt$(totalPnL)} total
              </span>
            </div>
            {positions.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No open positions</p>
                {!settings.auto_execute && (
                  <p className="text-xs text-text-secondary/60 mt-1">Enable auto-execute to open trades</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {positions.map(pos => (
                  <PositionRow key={pos.id} pos={pos} />
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-text-secondary pb-2">
          Helios refreshes every 30s · <Link href="/dashboard/helios/settings" className="text-primary hover:underline">Configure settings →</Link>
        </p>
      </motion.div>
    </div>
  )
}
