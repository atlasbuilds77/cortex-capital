'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

interface Position {
  symbol: string
  quantity: number
  averageCost: number
  currentPrice: number
  todayChange: number
  unrealizedPnL: number
}

interface PortfolioData {
  source: string
  accountValue: number
  buyingPower: number
  todayPnL: number
  openPositions: number
  positions: Position[]
}

export default function PortfolioPage() {
  const { token } = useAuth()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch('/api/user/portfolio', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch portfolio')
        const data = await res.json()
        setPortfolio(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPortfolio()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to Load Portfolio</h2>
          <p className="text-text-secondary mb-6">{error || 'Something went wrong. Please try again.'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              Retry
            </button>
            <a
              href="/settings/brokers"
              className="px-4 py-2 bg-surface border border-gray-700 text-text-secondary rounded-lg hover:bg-surface-elevated transition-colors"
            >
              Check Connection
            </a>
          </div>
        </div>
      </div>
    )
  }

  const { positions, accountValue, buyingPower, todayPnL } = portfolio
  const totalCost = positions.reduce((sum, p) => sum + (p.quantity * p.averageCost), 0)
  const totalGain = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0)
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
  const cashBalance = buyingPower

  // Calculate sector data (simplified - just use "Equity" for now since we don't have sector info)
  const investedValue = positions.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0)
  const cashPercent = accountValue > 0 ? (cashBalance / accountValue) * 100 : 0
  const equityPercent = 100 - cashPercent

  const sectorData = [
    { name: 'Equity', value: investedValue, color: '#00D4AA', percentage: equityPercent.toFixed(1) },
    { name: 'Cash', value: cashBalance, color: '#6B7280', percentage: cashPercent.toFixed(1) },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Portfolio</h1>
            <p className="text-text-secondary mt-1">
              {portfolio.source === 'demo' ? '📊 Demo Account (Alpaca Paper)' : 'Live Portfolio'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              portfolio.source === 'demo' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {portfolio.source === 'demo' ? 'DEMO' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-surface rounded-xl border border-gray-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-purple-600/5 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Wallet size={18} />
                <span className="text-sm font-medium">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                ${accountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-surface rounded-xl border border-gray-700 relative overflow-hidden"
          >
            <div className={`absolute inset-0 ${totalGain >= 0 ? 'bg-green-600/5' : 'bg-red-600/5'} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                {totalGain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                <span className="text-sm font-medium">Unrealized P&L</span>
              </div>
              <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm mt-1 ${totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 bg-surface rounded-xl border border-gray-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <BarChart3 size={18} />
                <span className="text-sm font-medium">Positions</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{positions.length}</p>
              <p className="text-sm text-text-secondary mt-1">Active holdings</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 bg-surface rounded-xl border border-gray-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-yellow-600/5 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <Wallet size={18} />
                <span className="text-sm font-medium">Buying Power</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                ${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Allocation Chart and Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-surface rounded-xl border border-gray-700"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">Allocation</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #6366F1',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{
                      color: '#E5E7EB',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                    labelStyle={{
                      color: '#9CA3AF',
                      marginBottom: '4px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `$${value.toLocaleString()}`, 
                      props.payload.name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {sectorData.map((sector) => (
                <div key={sector.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/50 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-text-secondary">{sector.name}</span>
                  <span className="text-text-primary font-medium">{sector.percentage}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 bg-surface rounded-xl border border-gray-700"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">Performance</h2>
            <div className="space-y-3">
              {[...positions]
                .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
                .slice(0, 5)
                .map((position, index) => {
                  const pnlPercent = position.averageCost > 0 
                    ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
                    : 0
                  return (
                    <motion.div
                      key={position.symbol}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          position.unrealizedPnL >= 0 ? 'bg-success/20' : 'bg-danger/20'
                        }`}>
                          {position.unrealizedPnL >= 0 ? (
                            <ArrowUpRight className="text-success" size={18} />
                          ) : (
                            <ArrowDownRight className="text-danger" size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{position.symbol}</p>
                          <p className="text-xs text-text-secondary">{position.quantity} shares</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                          {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                        </p>
                        <p className={`text-xs ${pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              {positions.length === 0 && (
                <p className="text-text-secondary text-center py-8">No positions</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Holdings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface rounded-xl border border-gray-700 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-text-primary">Holdings</h2>
          </div>
          
          {positions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-secondary">No positions in portfolio</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-elevated">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Symbol</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Shares</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Cost</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Value</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {positions.map((position, index) => {
                      const value = position.quantity * position.currentPrice
                      const pnlPercent = position.averageCost > 0 
                        ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
                        : 0
                      return (
                        <motion.tr
                          key={position.symbol}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45 + index * 0.03 }}
                          className="hover:bg-surface-elevated/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                <span className="font-bold text-primary text-sm">{position.symbol.slice(0, 2)}</span>
                              </div>
                              <p className="font-medium text-text-primary">{position.symbol}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-text-primary">{position.quantity}</td>
                          <td className="px-6 py-4 text-right text-text-primary">${position.currentPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-text-secondary">${position.averageCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-medium text-text-primary">${value.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                              {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                            </span>
                            <span className={`block text-xs ${pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                              {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-4 space-y-3">
                {positions.map((position, index) => {
                  const value = position.quantity * position.currentPrice
                  const pnlPercent = position.averageCost > 0 
                    ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
                    : 0
                  return (
                    <motion.div
                      key={position.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + index * 0.03 }}
                      className="p-4 bg-surface-elevated rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <span className="font-bold text-purple-400 text-sm">{position.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{position.symbol}</p>
                            <p className="text-xs text-text-secondary">{position.quantity} shares</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-text-primary">${value.toLocaleString()}</p>
                          <p className={`text-sm ${position.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-text-secondary">
                        <span>Price: ${position.currentPrice.toFixed(2)}</span>
                        <span>Avg: ${position.averageCost.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
