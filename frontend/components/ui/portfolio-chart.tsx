'use client'

import React, { useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { colors } from '@/lib/design-tokens'

interface PortfolioDataPoint {
  timestamp: Date | string
  value: number
}

interface PortfolioChartProps {
  data: PortfolioDataPoint[]
  width?: number
  height?: number
  showGrid?: boolean
  showLabels?: boolean
  showTooltip?: boolean
  className?: string
  gradientId?: string
}

export function PortfolioChart({
  data,
  width = 600,
  height = 300,
  showGrid = true,
  showLabels = true,
  className,
  gradientId = 'portfolioGradient',
}: PortfolioChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: '', areaPoints: '', minValue: 0, maxValue: 0 }

    const values = data.map((d) => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    const padding = { top: 20, right: 20, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const points = data
      .map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth
        const y =
          padding.top +
          chartHeight -
          ((d.value - minValue) / valueRange) * chartHeight
        return `${x},${y}`
      })
      .join(' ')

    // Area fill path
    const firstX = padding.left
    const lastX = padding.left + chartWidth
    const bottomY = padding.top + chartHeight
    const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`

    return { points, areaPoints, minValue, maxValue, padding, chartWidth, chartHeight }
  }, [data, width, height])

  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value
  const strokeColor = isPositive ? colors.success : colors.danger
  const gradientColor = isPositive ? colors.success : colors.danger

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-[#12121a] rounded-xl',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-gray-500">No data available</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && chartData.padding && (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = chartData.padding.top + chartData.chartHeight * (1 - ratio)
              return (
                <line
                  key={i}
                  x1={chartData.padding.left}
                  y1={y}
                  x2={chartData.padding.left + chartData.chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4,4"
                />
              )
            })}
          </g>
        )}

        {/* Area fill */}
        <polygon
          points={chartData.areaPoints}
          fill={`url(#${gradientId})`}
        />

        {/* Line */}
        <polyline
          points={chartData.points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 8px ${strokeColor})`,
          }}
        />

        {/* Y-axis labels */}
        {showLabels && chartData.padding && (
          <g>
            {[0, 0.5, 1].map((ratio, i) => {
              const y = chartData.padding.top + chartData.chartHeight * (1 - ratio)
              const value =
                chartData.minValue + (chartData.maxValue - chartData.minValue) * ratio
              return (
                <text
                  key={i}
                  x={chartData.padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill={colors.text.muted}
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {formatCurrency(value)}
                </text>
              )
            })}
          </g>
        )}

        {/* Current value indicator */}
        {data.length > 0 && chartData.padding && (
          <>
            <circle
              cx={chartData.padding.left + chartData.chartWidth}
              cy={
                chartData.padding.top +
                chartData.chartHeight -
                ((data[data.length - 1].value - chartData.minValue) /
                  (chartData.maxValue - chartData.minValue || 1)) *
                  chartData.chartHeight
              }
              r="5"
              fill={strokeColor}
              style={{
                filter: `drop-shadow(0 0 8px ${strokeColor})`,
              }}
            />
          </>
        )}
      </svg>
    </div>
  )
}
