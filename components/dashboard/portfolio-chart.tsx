'use client'

import { useState, useMemo } from 'react'
import { AreaChart } from '@tremor/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PortfolioChartProps {
  data?: Array<{ date: string; value: number }>
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M')

  // Mock data for different time ranges
  const allData = useMemo(() => ({
    '1D': [
      { date: '9:30 AM', value: 124000 },
      { date: '10:00 AM', value: 124200 },
      { date: '11:00 AM', value: 123800 },
      { date: '12:00 PM', value: 124500 },
      { date: '1:00 PM', value: 124567 },
    ],
    '1W': [
      { date: 'Mon', value: 122000 },
      { date: 'Tue', value: 123000 },
      { date: 'Wed', value: 122500 },
      { date: 'Thu', value: 123800 },
      { date: 'Fri', value: 124567 },
    ],
    '1M': [
      { date: 'Feb 21', value: 115000 },
      { date: 'Feb 28', value: 118000 },
      { date: 'Mar 7', value: 120500 },
      { date: 'Mar 14', value: 123000 },
      { date: 'Mar 21', value: 124567 },
    ],
    '3M': [
      { date: 'Dec', value: 100000 },
      { date: 'Jan', value: 110000 },
      { date: 'Feb', value: 115000 },
      { date: 'Mar', value: 124567 },
    ],
    '1Y': [
      { date: 'Mar 23', value: 80000 },
      { date: 'Jun 23', value: 85000 },
      { date: 'Sep 23', value: 95000 },
      { date: 'Dec 23', value: 100000 },
      { date: 'Mar 24', value: 124567 },
    ],
    'ALL': [
      { date: '2022', value: 50000 },
      { date: '2023', value: 80000 },
      { date: '2024', value: 100000 },
      { date: '2025', value: 124567 },
    ],
  }), [])

  const chartData = data || allData[selectedRange]

  // Calculate performance
  const startValue = chartData[0]?.value || 0
  const endValue = chartData[chartData.length - 1]?.value || 0
  const changePercent = ((endValue - startValue) / startValue) * 100
  const isPositive = changePercent >= 0

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="p-6 bg-surface rounded-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Portfolio Performance</h3>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            'text-sm font-semibold',
            isPositive ? 'text-success' : 'text-danger'
          )}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
        </motion.div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all relative',
              selectedRange === range
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {range}
            {selectedRange === range && (
              <motion.div
                layoutId="timeRangeIndicator"
                className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{range}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        key={selectedRange}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <AreaChart
          className="h-72"
          data={chartData}
          index="date"
          categories={['value']}
          colors={[isPositive ? 'emerald' : 'rose']}
          showLegend={false}
          showYAxis={true}
          showGridLines={false}
          curveType="monotone"
          showTooltip={true}
          showAnimation={true}
          animationDuration={800}
          valueFormatter={(value) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }
          customTooltip={(props) => {
            if (!props.active || !props.payload || props.payload.length === 0) return null
            
            const data = props.payload[0]
            const value = data.value as number
            const date = props.label

            return (
              <div className="bg-surface border border-gray-700 rounded-lg p-3 shadow-xl">
                <div className="text-xs text-text-secondary mb-1">{date}</div>
                <div className="text-lg font-bold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(value)}
                </div>
              </div>
            )
          }}
        />
      </motion.div>
    </motion.div>
  )
}
