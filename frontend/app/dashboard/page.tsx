'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/ui/stat-card'
import { PortfolioChart } from '@/components/dashboard/portfolio-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { PositionsList } from '@/components/dashboard/positions-list'
import { StatCardSkeleton, ChartSkeleton, PositionCardSkeleton } from '@/components/ui/skeleton'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth'
import { api, PortfolioSnapshot } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { 
  RefreshCw, 
  ArrowDown, 
  BarChart2, 
  Bot, 
  TrendingUp, 
  Settings, 
  Calendar,
  Heart,
  Briefcase,
  DollarSign,
  Zap,
  Crown,
  Search,
  ArrowUpRight,
} from 'lucide-react'

function TierBadgeInline({ tier }: { tier: string }) {
  const config: Record<string, { label: string; icon: typeof Search; bg: string; text: string }> = {
    free: { label: 'Free', icon: Search, bg: 'bg-gray-600', text: 'text-gray-200' },
    scout: { label: 'Scout', icon: Search, bg: 'bg-cyan-600', text: 'text-white' },
    operator: { label: 'Operator', icon: Zap, bg: 'bg-purple-600', text: 'text-white' },
    partner: { label: 'Partner', icon: Crown, bg: 'bg-amber-500', text: 'text-white' },
  }
  const c = config[tier] || config.free
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

function Dashboard() {
  const router = useRouter()
  const { user, logout, token } = useAuth()
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const userTier = user?.tier || 'free'
  const isFreeTier = userTier === 'free'
  const brokerConnected = user?.broker_connected || false

  useEffect(() => {
    if (token) {
      api.setToken(token)
    }
    loadPortfolio()
  }, [token])

  const loadPortfolio = useCallback(async () => {
    try {
      const response = await api.getPortfolio()
      if (response.data) {
        setPortfolio(response.data)
      }
    } catch {
      // Portfolio fetch failed — show empty state
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPortfolio()
  }, [loadPortfolio])

  // Quick stats
  const healthScore = 85
  const positionsCount = portfolio?.positions?.length || 0
  const totalPnL = portfolio?.daily_change || 0
  const totalValue = portfolio?.total_value || 0

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <ChartSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <PositionCardSkeleton />
                <PositionCardSkeleton />
              </div>
              <div className="space-y-3">
                <PositionCardSkeleton />
                <PositionCardSkeleton />
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Welcome + Tier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">
                    {user?.email ? `Welcome back` : 'Dashboard'}
                  </h2>
                  <TierBadgeInline tier={userTier} />
                </div>
                <p className="text-text-secondary text-sm">
                  {brokerConnected 
                    ? 'Your AI agents are monitoring the market.'
                    : 'Connect a brokerage to get started with AI trading.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg bg-surface hover:bg-surface-elevated transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                {isFreeTier && (
                  <button
                    onClick={() => router.push('/settings/billing')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Upgrade
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Health Score */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 bg-surface rounded-xl"
              >
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                  <Heart className="w-4 h-4 text-green-400" />
                  HEALTH SCORE
                </div>
                <div className="text-3xl font-bold text-white">{healthScore}</div>
                <div className="mt-2 w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`h-full rounded-full ${
                      healthScore >= 80 ? 'bg-green-500' :
                      healthScore >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  />
                </div>
              </motion.div>

              {/* Portfolio Value */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-5 bg-surface rounded-xl"
              >
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  PORTFOLIO VALUE
                </div>
                <div className="text-3xl font-bold text-white">
                  {totalValue > 0 ? formatCurrency(totalValue) : '—'}
                </div>
                <div className="text-sm text-text-muted mt-1">
                  {totalValue > 0 ? 'Current value' : 'Connect brokerage'}
                </div>
              </motion.div>

              {/* Positions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 bg-surface rounded-xl"
              >
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  POSITIONS
                </div>
                <div className="text-3xl font-bold text-white">{positionsCount}</div>
                <div className="text-sm text-text-muted mt-1">
                  {positionsCount > 0 ? 'Active positions' : 'No positions yet'}
                </div>
              </motion.div>

              {/* Daily P&L */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-5 bg-surface rounded-xl"
              >
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                  <TrendingUp className={`w-4 h-4 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  DAILY P&L
                </div>
                <div className={`text-3xl font-bold ${
                  totalPnL > 0 ? 'text-green-400' :
                  totalPnL < 0 ? 'text-red-400' :
                  'text-white'
                }`}>
                  {totalPnL !== 0 ? formatCurrency(totalPnL) : '—'}
                </div>
                {portfolio?.daily_change_pct !== undefined && portfolio.daily_change_pct !== 0 && (
                  <div className={`text-sm mt-1 ${
                    portfolio.daily_change_pct >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(portfolio.daily_change_pct)}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Upgrade Banner (free tier only) */}
            {isFreeTier && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-transparent"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <Zap className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Unlock AI Trading Agents</h3>
                      <p className="text-sm text-text-secondary">
                        Upgrade to Scout for automated rebalancing, tax-loss harvesting, and 3 AI agents managing your portfolio 24/7.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/settings/billing')}
                    className="flex-shrink-0 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 text-sm"
                  >
                    Upgrade — $49/mo
                  </button>
                </div>
              </motion.div>
            )}

            {/* Portfolio Overview (if brokerage connected) */}
            {brokerConnected && portfolio && (
              <>
                <PortfolioChart />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <ActivityFeed />
                  </div>
                  <div>
                    <PositionsList />
                  </div>
                </div>
              </>
            )}

            {/* Empty state if no brokerage */}
            {!brokerConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-center py-16 px-6 bg-surface rounded-xl"
              >
                <div className="w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart2 className="w-10 h-10 text-text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Connect a Brokerage</h3>
                <p className="text-text-secondary max-w-md mx-auto mb-6">
                  Link your brokerage account to see your portfolio, positions, and let AI agents start managing your investments.
                </p>
                <button
                  onClick={() => router.push('/settings/brokers')}
                  className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
                >
                  Connect Brokerage
                </button>
              </motion.div>
            )}

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 bg-surface rounded-xl"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Upcoming
              </h3>
              <div className="space-y-3 text-text-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Monday: Weekly rebalance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>March 28: NVDA earnings (watching)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>April 1: Monthly report</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
