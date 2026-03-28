'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar, 
  Filter, 
  Download,
  ChevronDown,
  X,
  Bot
} from 'lucide-react'

// Mock trade data
const trades = [
  { id: 1, symbol: 'NVDA', type: 'BUY', shares: 10, price: 850.00, total: 8500.00, date: '2024-03-21T14:32:00', agent: 'MOMENTUM', status: 'executed' },
  { id: 2, symbol: 'MSFT', type: 'BUY', shares: 15, price: 420.50, total: 6307.50, date: '2024-03-21T11:15:00', agent: 'ANALYST', status: 'executed' },
  { id: 3, symbol: 'AAPL', type: 'SELL', shares: 25, price: 178.25, total: 4456.25, date: '2024-03-20T15:45:00', agent: 'STRATEGIST', status: 'executed' },
  { id: 4, symbol: 'GOOGL', type: 'BUY', shares: 8, price: 155.00, total: 1240.00, date: '2024-03-20T10:22:00', agent: 'EXECUTOR', status: 'executed' },
  { id: 5, symbol: 'TSLA', type: 'SELL', shares: 20, price: 175.80, total: 3516.00, date: '2024-03-19T13:55:00', agent: 'MOMENTUM', status: 'executed' },
  { id: 6, symbol: 'AMD', type: 'BUY', shares: 30, price: 195.50, total: 5865.00, date: '2024-03-19T09:30:00', agent: 'DAY_TRADER', status: 'executed' },
  { id: 7, symbol: 'META', type: 'BUY', shares: 12, price: 502.75, total: 6033.00, date: '2024-03-18T14:10:00', agent: 'ANALYST', status: 'executed' },
  { id: 8, symbol: 'NFLX', type: 'SELL', shares: 8, price: 625.00, total: 5000.00, date: '2024-03-18T11:30:00', agent: 'OPTIONS_STRATEGIST', status: 'executed' },
  { id: 9, symbol: 'JPM', type: 'BUY', shares: 25, price: 196.00, total: 4900.00, date: '2024-03-17T10:00:00', agent: 'STRATEGIST', status: 'executed' },
  { id: 10, symbol: 'XOM', type: 'BUY', shares: 40, price: 115.25, total: 4610.00, date: '2024-03-17T09:35:00', agent: 'REPORTER', status: 'executed' },
  { id: 11, symbol: 'V', type: 'SELL', shares: 15, price: 282.50, total: 4237.50, date: '2024-03-15T14:20:00', agent: 'EXECUTOR', status: 'executed' },
  { id: 12, symbol: 'UNH', type: 'BUY', shares: 10, price: 488.00, total: 4880.00, date: '2024-03-15T10:45:00', agent: 'ANALYST', status: 'executed' },
]

const agents = ['All Agents', 'ANALYST', 'STRATEGIST', 'EXECUTOR', 'REPORTER', 'OPTIONS_STRATEGIST', 'DAY_TRADER', 'MOMENTUM']
const symbols = ['All Symbols', ...Array.from(new Set(trades.map(t => t.symbol)))]

export default function TradesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('All Agents')
  const [selectedSymbol, setSelectedSymbol] = useState('All Symbols')
  const [selectedType, setSelectedType] = useState<'all' | 'BUY' | 'SELL'>('all')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [showFilters, setShowFilters] = useState(false)

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
      if (selectedType !== 'all' && trade.type !== selectedType) {
        return false
      }
      // Date filter
      if (dateRange !== 'all') {
        const tradeDate = new Date(trade.date)
        const now = new Date()
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        if (tradeDate < cutoff) return false
      }
      return true
    })
  }, [searchQuery, selectedAgent, selectedSymbol, selectedType, dateRange])

  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length
    const buyTrades = filteredTrades.filter(t => t.type === 'BUY')
    const sellTrades = filteredTrades.filter(t => t.type === 'SELL')
    const totalVolume = filteredTrades.reduce((sum, t) => sum + t.total, 0)
    return { totalTrades, buyTrades: buyTrades.length, sellTrades: sellTrades.length, totalVolume }
  }, [filteredTrades])

  const handleExportCSV = () => {
    const headers = ['Date', 'Symbol', 'Type', 'Shares', 'Price', 'Total', 'Agent', 'Status']
    const rows = filteredTrades.map(t => [
      new Date(t.date).toISOString(),
      t.symbol,
      t.type,
      t.shares,
      t.price,
      t.total,
      t.agent,
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
            <p className="text-text-secondary mt-1">Complete log of all executed trades</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-500"
          >
            <Download size={18} />
            Export CSV
          </motion.button>
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
            <p className="text-2xl font-bold text-text-primary">${stats.totalVolume.toLocaleString()}</p>
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
                        <p className="text-text-primary">{new Date(trade.date).toLocaleDateString()}</p>
                        <p className="text-xs">{new Date(trade.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
                        trade.type === 'BUY'
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}>
                        {trade.type === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-text-primary">{trade.shares}</td>
                    <td className="px-6 py-4 text-right text-text-primary">${trade.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-text-primary">${trade.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-primary" />
                        <span className="text-text-secondary text-sm">{trade.agent}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/20 text-success capitalize">
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
                      trade.type === 'BUY' ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
                      {trade.type === 'BUY' ? (
                        <ArrowUpRight className="text-success" size={20} />
                      ) : (
                        <ArrowDownRight className="text-danger" size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{trade.symbol}</p>
                      <p className="text-xs text-text-secondary">{trade.shares} shares @ ${trade.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">${trade.total.toLocaleString()}</p>
                    <p className={`text-sm ${trade.type === 'BUY' ? 'text-success' : 'text-danger'}`}>
                      {trade.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Bot size={14} className="text-primary" />
                    <span>{trade.agent}</span>
                  </div>
                  <span className="text-text-secondary">
                    {new Date(trade.date).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTrades.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-text-secondary">No trades match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-primary hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
