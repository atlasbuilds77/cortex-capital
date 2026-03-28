'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useState } from 'react'

// Mock portfolio data
const holdings = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', shares: 45, price: 875.28, avgCost: 650.00, value: 39387.60, change: 34.66, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft', shares: 30, price: 422.45, avgCost: 380.00, value: 12673.50, change: 11.17, sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet', shares: 25, price: 156.89, avgCost: 140.00, value: 3922.25, change: 12.06, sector: 'Technology' },
  { symbol: 'JPM', name: 'JP Morgan', shares: 50, price: 198.34, avgCost: 175.00, value: 9917.00, change: 13.34, sector: 'Finance' },
  { symbol: 'XOM', name: 'Exxon Mobil', shares: 75, price: 118.56, avgCost: 105.00, value: 8892.00, change: 12.91, sector: 'Energy' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', shares: 40, price: 156.78, avgCost: 160.00, value: 6271.20, change: -2.01, sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth', shares: 15, price: 492.34, avgCost: 450.00, value: 7385.10, change: 9.41, sector: 'Healthcare' },
  { symbol: 'AMZN', name: 'Amazon', shares: 55, price: 178.92, avgCost: 155.00, value: 9840.60, change: 15.43, sector: 'Technology' },
]

const sectorData = [
  { name: 'Technology', value: 65823.95, color: '#00D4AA', percentage: 66.3 },
  { name: 'Healthcare', value: 13656.30, color: '#7C3AED', percentage: 13.8 },
  { name: 'Finance', value: 9917.00, color: '#F59E0B', percentage: 10.0 },
  { name: 'Energy', value: 8892.00, color: '#EF4444', percentage: 9.0 },
  { name: 'Cash', value: 877.64, color: '#6B7280', percentage: 0.9 },
]

const totalValue = holdings.reduce((sum, h) => sum + h.value, 0) + 877.64
const totalCost = holdings.reduce((sum, h) => sum + (h.shares * h.avgCost), 0)
const totalGain = totalValue - totalCost
const totalGainPercent = ((totalGain / totalCost) * 100)

export default function PortfolioPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  
  const filteredHoldings = selectedSector 
    ? holdings.filter(h => h.sector === selectedSector)
    : holdings

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
            <p className="text-text-secondary mt-1">Your holdings breakdown and allocation</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-surface-elevated rounded-lg text-text-secondary hover:text-text-primary transition-colors border border-gray-700"
            >
              Export CSV
            </motion.button>
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
              <p className="text-2xl font-bold text-text-primary">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-surface rounded-xl border border-gray-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-green-600/5 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <TrendingUp size={18} />
                <span className="text-sm font-medium">Total Gain</span>
              </div>
              <p className="text-2xl font-bold text-success">+${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-success mt-1">+{totalGainPercent.toFixed(2)}%</p>
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
              <p className="text-2xl font-bold text-text-primary">{holdings.length}</p>
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
                <span className="text-sm font-medium">Cash Balance</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">$877.64</p>
              <p className="text-sm text-text-secondary mt-1">0.9% of portfolio</p>
            </div>
          </motion.div>
        </div>

        {/* Allocation Chart and Sector Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-surface rounded-xl border border-gray-700"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">Allocation by Sector</h2>
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
                    onClick={(data) => setSelectedSector(selectedSector === data.name ? null : data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        opacity={selectedSector && selectedSector !== entry.name ? 0.3 : 1}
                        stroke={selectedSector === entry.name ? '#fff' : 'transparent'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {sectorData.map((sector) => (
                <button
                  key={sector.name}
                  onClick={() => setSelectedSector(selectedSector === sector.name ? null : sector.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedSector === sector.name
                      ? 'bg-surface-elevated border border-primary'
                      : 'bg-surface-elevated/50 border border-transparent hover:border-gray-600'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-text-secondary">{sector.name}</span>
                  <span className="text-text-primary font-medium">{sector.percentage}%</span>
                </button>
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
            <h2 className="text-lg font-semibold text-text-primary mb-4">Performance Leaders</h2>
            <div className="space-y-3">
              {[...holdings]
                .sort((a, b) => b.change - a.change)
                .slice(0, 5)
                .map((holding, index) => (
                  <motion.div
                    key={holding.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        holding.change >= 0 ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        {holding.change >= 0 ? (
                          <ArrowUpRight className="text-success" size={18} />
                        ) : (
                          <ArrowDownRight className="text-danger" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{holding.symbol}</p>
                        <p className="text-xs text-text-secondary">{holding.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${holding.change >= 0 ? 'text-success' : 'text-danger'}`}>
                        {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                      </p>
                      <p className="text-xs text-text-secondary">${holding.value.toLocaleString()}</p>
                    </div>
                  </motion.div>
                ))}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-text-primary">
                Holdings {selectedSector && `- ${selectedSector}`}
              </h2>
              {selectedSector && (
                <button
                  onClick={() => setSelectedSector(null)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Asset</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Shares</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Cost</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Value</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">P&L</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Sector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredHoldings.map((holding, index) => {
                  const pl = (holding.price - holding.avgCost) * holding.shares
                  return (
                    <motion.tr
                      key={holding.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + index * 0.03 }}
                      className="hover:bg-surface-elevated/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <span className="font-bold text-primary text-sm">{holding.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{holding.symbol}</p>
                            <p className="text-xs text-text-secondary">{holding.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-text-primary">{holding.shares}</td>
                      <td className="px-6 py-4 text-right text-text-primary">${holding.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-text-secondary">${holding.avgCost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary">${holding.value.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pl >= 0 ? '+' : ''}${pl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`block text-xs ${holding.change >= 0 ? 'text-success' : 'text-danger'}`}>
                          {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-1 text-xs rounded-full bg-surface-elevated text-text-secondary">
                          {holding.sector}
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
            {filteredHoldings.map((holding, index) => {
              const pl = (holding.price - holding.avgCost) * holding.shares
              return (
                <motion.div
                  key={holding.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.03 }}
                  className="p-4 bg-surface-elevated rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                        <span className="font-bold text-purple-400 text-sm">{holding.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{holding.symbol}</p>
                        <p className="text-xs text-text-secondary">{holding.shares} shares</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-text-primary">${holding.value.toLocaleString()}</p>
                      <p className={`text-sm ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pl >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Price: ${holding.price.toFixed(2)}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-surface text-text-secondary">
                      {holding.sector}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
