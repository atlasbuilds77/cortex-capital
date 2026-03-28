'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Bot, Building2, DollarSign, Lock, ShieldCheck, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { ComponentType, ReactNode } from 'react'

const API_URL = ""; // API is same-origin

interface PortfolioData {
  source: string
  tier: string
  tierConfig: any
  portfolio: {
    accountValue: number
    cash: number
    todayPnL: number
    positions: any[]
  }
  tradesThisWeek?: number
  canTradeMore?: boolean
  message?: string
}

const TIER_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  free: { label: 'Free', color: 'text-gray-400', badge: 'bg-gray-500/20 border-gray-500/30' },
  recovery: { label: 'Recovery', color: 'text-blue-400', badge: 'bg-blue-500/20 border-blue-500/30' },
  scout: { label: 'Scout', color: 'text-cyan-400', badge: 'bg-cyan-500/20 border-cyan-500/30' },
  operator: { label: 'Operator', color: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30' },
  partner: { label: 'Partner', color: 'text-purple-400', badge: 'bg-purple-500/20 border-purple-500/30' },
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, token } = useAuth()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
      return
    }
    // Redirect free tier users to pricing
    if (!loading && isAuthenticated && user?.tier === 'free') {
      router.push('/pricing?upgrade=true')
    }
  }, [isAuthenticated, loading, router, user])

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/user/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setPortfolio(data) })
        .catch(() => {})
    }
  }, [token])

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background text-text-secondary">
        Loading dashboard...
      </div>
    )
  }

  const tier = user?.tier || 'free'
  const tierInfo = TIER_LABELS[tier] || TIER_LABELS.free
  
  // Derive tier capabilities directly from tier
  const tc = {
    canUsePhoneBooth: ['scout', 'operator', 'partner'].includes(tier),
    canAutoExecute: ['operator', 'partner'].includes(tier),
    canViewSignals: ['scout', 'operator', 'partner'].includes(tier),
    canCustomizeAgents: ['operator', 'partner'].includes(tier),
    alertFrequency: tier === 'operator' || tier === 'partner' ? 'realtime' : tier === 'scout' ? 'daily' : 'none',
    maxTradesPerWeek: tier === 'operator' || tier === 'partner' ? -1 : tier === 'scout' ? 10 : 0,
  }
  
  const isDemo = portfolio?.source === 'demo'
  const activeAgents = tier === 'free' ? 1 : tier === 'recovery' ? 3 : tier === 'scout' ? 7 : 10
  const todayPnL = portfolio?.todayPnL || 0
  const pnlColor = todayPnL >= 0 ? 'text-green-400' : 'text-red-400'
  const pnlSign = todayPnL >= 0 ? '+' : ''

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="rounded-xl border border-white/10 bg-surface p-5 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Cortex Command</p>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierInfo.badge} ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
                {isDemo && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                    Demo Data
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </h1>
              {isDemo && (
                <p className="mt-2 text-sm text-yellow-400/70">
                  Connect a broker in <Link href="/settings/brokers" className="underline">Settings</Link> to see your real portfolio
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/office"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-black hover:bg-accent"
            >
              Open 3D Office <ArrowRight className="h-4 w-4" />
            </Link>
            {isDemo && (
              <Link
                href="/settings/brokers"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                <Building2 className="h-4 w-4" /> Connect Broker
              </Link>
            )}
            {tc.canUsePhoneBooth ? (
              <Link
                href="/dashboard/office"
                className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-surface-elevated px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <Zap className="h-4 w-4" /> Phone Booth
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-surface-elevated px-4 py-2 text-sm text-text-secondary cursor-not-allowed opacity-50">
                <Lock className="h-4 w-4" /> Phone Booth
                <span className="text-[10px]">(Operator+)</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard 
            icon={DollarSign} 
            label="Portfolio Value" 
            value={portfolio ? `$${portfolio.accountValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'} 
            sub={portfolio ? `Buying Power: $${portfolio.buyingPower?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0'}` : 'Connect broker'} 
          />
          <MetricCard 
            icon={todayPnL >= 0 ? TrendingUp : TrendingDown}
            label="Today's P&L" 
            value={portfolio ? `${pnlSign}$${Math.abs(todayPnL).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'} 
            sub={portfolio ? `${portfolio.positions?.length || 0} open positions` : 'No data yet'}
            valueColor={pnlColor}
          />
          <MetricCard 
            icon={Bot} 
            label="Active Agents" 
            value={`${activeAgents} active`} 
            sub={tc.canAutoExecute ? 'Auto-executing' : tc.canViewSignals ? 'Signal mode' : 'Upgrade to activate'} 
          />
          <MetricCard 
            icon={ShieldCheck} 
            label="Trades This Week" 
            value={portfolio?.tradesThisWeek?.toString() || '0'} 
            sub={tc.maxTradesPerWeek === -1 ? 'Unlimited' : tc.maxTradesPerWeek ? `${tc.maxTradesPerWeek}/week limit` : 'Trading not included'}
          />
        </div>

        {/* Panels */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Your Plan Features">
            <ul className="space-y-2 text-sm">
              {(portfolio?.tierConfig || tc) && (
                <>
                  <FeatureRow enabled={tc.canViewSignals} label="View agent trade signals" />
                  <FeatureRow enabled={tc.canAutoExecute} label="Auto-execute trades" />
                  <FeatureRow enabled={tc.canUsePhoneBooth} label="Phone Booth (direct agent chat)" />
                  <FeatureRow enabled={tc.canCustomizeAgents} label="Custom agent personalities" />
                  <FeatureRow enabled={tc.alertFrequency === 'daily' || tc.alertFrequency === 'realtime'} label="Daily alerts" />
                  <FeatureRow enabled={tc.alertFrequency === 'realtime'} label="Real-time notifications" />
                </>
              )}
            </ul>
            {(tier === 'free' || tier === 'recovery' || tier === 'scout') && (
              <Link href="/settings/billing" className="mt-4 inline-block text-xs text-primary hover:underline">
                Upgrade plan →
              </Link>
            )}
          </Panel>
          <Panel title="Account">
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Tier: <span className={`font-medium capitalize ${tierInfo.color}`}>{tierInfo.label}</span></p>
              <p>Email: <span className="font-medium text-white">{user?.email}</span></p>
              <p>Data: <span className={`font-medium ${isDemo ? 'text-yellow-400' : 'text-green-400'}`}>{isDemo ? 'Demo (no broker)' : 'Live'}</span></p>
              {isDemo && (
                <Link href="/settings/brokers" className="inline-flex items-center gap-1 mt-2 text-primary hover:underline text-xs">
                  <Building2 className="h-3 w-3" /> Connect broker for live data →
                </Link>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${enabled ? 'text-white' : 'text-text-secondary/40'}`}>
      {enabled ? (
        <span className="text-green-400 text-xs font-bold">+</span>
      ) : (
        <Lock className="h-3 w-3 text-text-secondary/30" />
      )}
      {label}
    </li>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  valueColor?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueColor || 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{sub}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-surface p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}
