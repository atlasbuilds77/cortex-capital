'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { AgentStatus } from '@/components/dashboard/agent-status'

interface LiveStats {
  pnl: number
  pnl_pct: number
  total_value: number
  agents_active: number
  trades_today: number
  win_rate: number
  sharpe_ratio: number
}

interface ActivityItem {
  id: string
  timestamp: string
  agent: string
  action: string
  symbol: string
  outcome?: string
  pnl?: number
}

export default function FishTankPage() {
  const router = useRouter()
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    // Skip auth check - allow demo access
    // For production, you'd check: localStorage.getItem('cortex_token')

    // Fetch live stats
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/fishtank/live')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        console.warn('Fish Tank API not available:', err)
        // Mock data
        setStats({
          pnl: 1234.56,
          pnl_pct: 2.4,
          total_value: 52456.78,
          agents_active: 3,
          trades_today: 18,
          win_rate: 67.5,
          sharpe_ratio: 2.8,
        })
      }
    }

    // Fetch activity feed
    const fetchActivity = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/cortex/activity')
        if (response.ok) {
          const data = await response.json()
          setActivity(data.activity || [])
        }
      } catch (err) {
        console.warn('Activity API not available:', err)
        // Mock data
        setActivity([
          {
            id: '1',
            timestamp: new Date().toISOString(),
            agent: 'OPTIONS_STRATEGIST',
            action: 'BUY',
            symbol: 'SPY 525C',
            outcome: 'OPEN',
            pnl: 0,
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            agent: 'STRATEGIST',
            action: 'SELL',
            symbol: 'QQQ 440P',
            outcome: 'WIN',
            pnl: 156.50,
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            agent: 'DAY_TRADER',
            action: 'SELL',
            symbol: 'SPY 524P',
            outcome: 'LOSS',
            pnl: -45.20,
          },
        ])
      }
    }

    fetchStats()
    fetchActivity()

    const statsInterval = setInterval(fetchStats, 2000)
    const activityInterval = setInterval(fetchActivity, 5000)

    return () => {
      clearInterval(statsInterval)
      clearInterval(activityInterval)
    }
  }, [router])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-700 bg-surface sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐟</span>
                <h1 className="text-2xl font-bold text-purple-400">
                  FISH TANK
                </h1>
              </div>
              {stats && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4 text-success" />
                    <span className="text-text-secondary">
                      {stats.agents_active} agents
                    </span>
                  </div>
                  <div className="text-text-secondary">
                    {stats.trades_today} trades today
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Left Sidebar - Stats */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto">
            {stats && (
              <>
                {/* P&L Card */}
                <div className="bg-surface rounded-xl p-6 border border-gray-700">
                  <div className="text-sm text-text-secondary mb-2">Live P&L</div>
                  <div
                    className={`text-3xl font-bold mb-1 ${
                      stats.pnl >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {stats.pnl >= 0 ? '+' : ''}
                    {stats.pnl.toFixed(2)}
                  </div>
                  <div
                    className={`text-lg ${
                      stats.pnl_pct >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {stats.pnl_pct >= 0 ? '+' : ''}
                    {stats.pnl_pct.toFixed(2)}%
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-text-secondary">Total Value</div>
                    <div className="text-lg font-semibold">
                      ${stats.total_value.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-surface rounded-xl p-6 border border-gray-700">
                  <h3 className="text-sm font-semibold mb-4 text-text-secondary">
                    PERFORMANCE
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-text-secondary">Win Rate</div>
                      <div className="text-xl font-semibold">
                        {stats.win_rate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Sharpe Ratio</div>
                      <div className="text-xl font-semibold">
                        {stats.sharpe_ratio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Trades Today</div>
                      <div className="text-xl font-semibold">{stats.trades_today}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Agent Status */}
            <AgentStatus />
          </div>

          {/* Center - P&L Dashboard */}
          <div className="lg:col-span-2 bg-surface rounded-xl border border-gray-700 overflow-hidden p-6">
            {stats ? (
              <div className="h-full flex flex-col gap-6">
                {/* Main P&L Card */}
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-sm text-text-secondary mb-2">Total Portfolio Value</div>
                  <div className="text-4xl font-bold text-white mb-4">
                    ${stats.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 text-2xl font-semibold ${stats.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                      {stats.pnl >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                      ${Math.abs(stats.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xl ${stats.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                      ({stats.pnl >= 0 ? '+' : ''}{stats.pnl_pct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface-elevated rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-text-secondary mb-1">Active Agents</div>
                    <div className="text-2xl font-bold text-primary">{stats.agents_active}</div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-text-secondary mb-1">Trades Today</div>
                    <div className="text-2xl font-bold text-white">{stats.trades_today}</div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-text-secondary mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-success">{stats.win_rate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-text-secondary mb-1">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-accent">{stats.sharpe_ratio.toFixed(2)}</div>
                  </div>
                </div>

                {/* Live Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                  </span>
                  LIVE DATA - Real trades executing
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary">
                Loading portfolio data...
              </div>
            )}
          </div>

          {/* Right Sidebar - Activity Feed */}
          <div className="lg:col-span-1 bg-surface rounded-xl border border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                LIVE ACTIVITY
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activity.length === 0 ? (
                <div className="text-center text-text-secondary py-8">
                  Waiting for activity...
                </div>
              ) : (
                activity.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-background rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-400">
                          {item.agent}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            item.action === 'BUY' ? 'text-success' : 'text-warning'
                          }`}
                        >
                          {item.action}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    <div className="font-mono text-sm mb-2">{item.symbol}</div>
                    {item.outcome && (
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium ${
                            item.outcome === 'WIN'
                              ? 'text-success'
                              : item.outcome === 'LOSS'
                              ? 'text-error'
                              : 'text-text-secondary'
                          }`}
                        >
                          {item.outcome}
                        </span>
                        {item.pnl !== undefined && item.pnl !== 0 && (
                          <div
                            className={`flex items-center gap-1 text-sm font-semibold ${
                              item.pnl >= 0 ? 'text-success' : 'text-error'
                            }`}
                          >
                            {item.pnl >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {item.pnl >= 0 ? '+' : ''}
                            {item.pnl.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
