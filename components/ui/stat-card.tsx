'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { Sparkline } from './sparkline'

interface StatCardProps {
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  className?: string
  numericValue?: number
  sparklineData?: number[]
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  className,
  numericValue,
  sparklineData,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-text-secondary',
  }

  const sparklineColors = {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
  }

  // Animate numeric value if provided
  const animatedValue = useAnimatedNumber(numericValue || 0, { duration: 800 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('p-6 bg-surface rounded-xl relative overflow-hidden', className)}
    >
      {/* Background sparkline (subtle) */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="absolute inset-0 opacity-5 flex items-center justify-center">
          <Sparkline 
            data={sparklineData} 
            color={sparklineColors[changeType]} 
            width={300}
            height={120}
          />
        </div>
      )}

      <div className="relative z-10">
        <div className="text-text-secondary text-sm mb-2 uppercase tracking-wide">
          {label}
        </div>
        
        <motion.div
          key={value}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-bold mb-1"
        >
          {value}
        </motion.div>

        {change && (
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={cn('text-sm font-medium flex items-center gap-1', changeColors[changeType])}
            >
              {changeType === 'positive' && '↑'}
              {changeType === 'negative' && '↓'}
              {change}
            </motion.div>

            {/* Mini sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <div className="w-16 h-6">
                <Sparkline 
                  data={sparklineData} 
                  color={sparklineColors[changeType]}
                  width={64}
                  height={24}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
