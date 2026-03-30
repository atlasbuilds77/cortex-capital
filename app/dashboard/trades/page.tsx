'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar, 
  Filter, 
  Download,
  ChevronDown,
  X,
  Bot,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface Trade {
  id: string
  symbol: string
  side: string
  qty: number
  price: number
  timestamp: string
  status: string
  agent?: string
}

interface TradeData {
  source: string
  trades: Trade[]
}

export default function TradesPage() {
  const { token } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('none')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('All Agents')
  const [selectedSymbol, setSelectedSymbol] = useState('All Symbols')
  const [selectedType, setSelectedType] = useState<'all' | 'BUY' | 'SELL'>('all')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch trades from API
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/user/trades', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch trades')
        const data: TradeData = await res.json()
        setSource(data.source)
        setTrades(data.trades.map(t => ({
          ...t,
          // Normalize side to uppercase for display
          side: t.side?.toUpperCase() || 'BUY',
        })))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTrades()
  }, [token])

  // Derive agent list from actual trades
  const agents = useMemo(() => {
    const agentSet = new Set(trades.map(t => t.agent).filter(Boolean))
    return ['All Agents', ...Array.from(agentSet)]
  }, [trades])

  // Derive symbol list from actual trades
  const symbols = useMemo(() => {
    const symbolSet = new Set(trades.map(t => t.symbol))
    return ['All Symbols', ...Array.from(symbolSet)]
  }, [trades])

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      // Search filter
      if (searchQuery && !trade.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Agent filter
      if (selectedAgent !== 'All Agents' && trade.agent !== selectedAgent) {
        return false
      }
      // Symbol filter
      if (selectedSymbol !== 'All Symbols' && trade.symbol !== selectedSymbol) {
        return false
      }
      // Type filter
      if (selectedType !== 'all' && trade.side !== selectedType) {
        return false
      }
      // Date filter
      if (dateRange !== 'all' && trade.timestamp) {
        const tradeDate = new Date(trade.timestamp)
        const now = new Date()
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        if (tradeDate < cutoff) return false
      }
      return true
    })
  }, [trades, searchQuery, selectedAgent, selectedSymbol, selectedType, dateRange])

  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length
    const buyTrades = filteredTrades.filter(t => t.side === 'BUY')
    const sellTrades = filteredTrades.filter(t => t.side === 'SELL')
    const totalVolume = filteredTrades.reduce((sum, t) => sum + (t.qty * t.price), 0)
    return { totalTrades, buyTrades: buyTrades.length, sellTrades: sellTrades.length, totalVolume }
  }, [filteredTrades])

  const handleExportCSV = () => {
    const headers = ['Date', 'Symbol', 'Type', 'Shares', 'Price', 'Total', 'Agent', 'Status']
    const rows = filteredTrades.map(t => [
      t.timestamp ? new Date(t.timestamp).toISOString() : '',
      t.symbol,
      t.side,
      t.qty,
      t.price,
      (t.qty * t.price).toFixed(2),
      t.agent || 'N/A',
      t.status
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedAgent('All Agents')
    setSelectedSymbol('All Symbols')
    setSelectedType('all')
    setDateRange('all')
  }

  const hasActiveFilters = searchQuery || selectedAgent !== 'All Agents' || selectedSymbol !== 'All Symbols' || selectedType !== 'all' || dateRange !== 'all'

  if (loading) {
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
          <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to Load Trades</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Trade History</h1>
            <p className="text-text-secondary mt-1">
              {source === 'demo' ? '📊 Demo Account' : 
               source === 'snaptrade' ? '🔗 Live Broker Data' : 
               source === 'user' ? '💼 Your Trades' : 
               'Complete log of all executed trades'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              source === 'demo' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : source === 'snaptrade' || source === 'user'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {source === 'demo' ? 'DEMO' : source === 'snaptrade' ? 'LIVE' : source === 'user' ? 'LIVE' : 'NO DATA'}
            </span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportCSV}
              disabled={trades.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-500 disabled:opacity-50"
            >
              <Download size={18} />
              Export CSV
            </motion.button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-surface rounded-xl border border-gray-700"
          >
            <p className="text-sm text-text-secondary mb-1">Total Trades</p>
            <p className="text-2xl font-bold text-text-primary">{stats.totalTrades}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 bg-surface rounded-xl border border-gray-700"
          >
            <p className="text-sm text-text-secondary mb-1">Buy Orders</p>
            <p className="text-2xl font-bold text-success">{stats.buyTrades}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-surface rounded-xl border border-gray-700"
          >
            <p className="text-sm text-text-secondary mb-1">Sell Orders</p>
            <p className="text-2xl font-bold text-danger">{stats.sellTrades}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-4 bg-surface rounded-xl border border-gray-700"
          >
            <p className="text-sm text-text-secondary mb-1">Total Volume</p>
            <p className="text-2xl font-bold text-text-primary">${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-xl border border-gray-700 p-4"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-secondary"
            >
              <Filter size={18} />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </button>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-3">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary focus:outline-none focus:border-primary"
              >
                {agents.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary focus:outline-none focus:border-primary"
              >
                {symbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                {(['all', 'BUY', 'SELL'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-primary text-white'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="p-2.5 text-text-secondary hover:text-danger transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary"
                  >
                    {agents.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary"
                  >
                    {symbols.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                  <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                    {(['all', 'BUY', 'SELL'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                          selectedType === type
                            ? 'bg-primary text-white'
                            : 'bg-surface-elevated text-text-secondary'
                        }`}
                      >
                        {type === 'all' ? 'All' : type}
                      </button>
                    ))}
                  </div>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-lg border border-gray-700 text-text-primary"
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full py-2 text-danger text-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Trades Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-surface rounded-xl border border-gray-700 overflow-hidden"
        >
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Symbol</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Shares</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Agent</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTrades.map((trade, index) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.02 }}
                    className="hover:bg-surface-elevated/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-text-secondary">
                      <div>
                        <p className="text-text-primary">{trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : '-'}</p>
                        <p className="text-xs">{trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                          <span className="font-bold text-purple-400 text-xs">{trade.symbol.slice(0, 2)}</span>
                        </div>
                        <span className="font-medium text-text-primary">{trade.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        trade.side === 'BUY'
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}>
                        {trade.side === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-text-primary">{trade.qty}</td>
                    <td className="px-6 py-4 text-right text-text-primary">${(Number(trade.price) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-text-primary">${(trade.qty * trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      {trade.agent ? (
                        <div className="flex items-center gap-2">
                          <Bot size={14} className="text-primary" />
                          <span className="text-text-secondary text-sm">{trade.agent}</span>
                        </div>
                      ) : (
                        <span className="text-text-secondary text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        trade.status === 'filled' || trade.status === 'executed'
                          ? 'bg-success/20 text-success'
                          : trade.status === 'pending' || trade.status === 'open'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-700">
            {filteredTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.02 }}
                className="p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      trade.side === 'BUY' ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
                      {trade.side === 'BUY' ? (
                        <ArrowUpRight className="text-success" size={20} />
                      ) : (
                        <ArrowDownRight className="text-danger" size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{trade.symbol}</p>
                      <p className="text-xs text-text-secondary">{trade.qty} shares @ ${(Number(trade.price) || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">${(trade.qty * trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-sm ${trade.side === 'BUY' ? 'text-success' : 'text-danger'}`}>
                      {trade.side}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    {trade.agent ? (
                      <>
                        <Bot size={14} className="text-primary" />
                        <span>{trade.agent}</span>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                  <span className="text-text-secondary">
                    {trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : '-'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTrades.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-text-secondary">
                {trades.length === 0 
                  ? source === 'none' 
                    ? 'Connect a broker to see your trade history'
                    : 'No trades found'
                  : 'No trades match your filters'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
              {trades.length === 0 && source === 'none' && (
                <a
                  href="/settings/brokers"
                  className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Connect Broker
                </a>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
