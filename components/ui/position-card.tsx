import { formatCurrency, formatPercent } from '@/lib/utils'

interface PositionCardProps {
  symbol: string
  shares: number
  value: number
  changePct: number
}

export function PositionCard({
  symbol,
  shares,
  value,
  changePct,
}: PositionCardProps) {
  const isPositive = changePct >= 0

  return (
    <div className="flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface-elevated transition-colors">
      <div className="flex-1">
        <div className="font-semibold text-lg">{symbol}</div>
        <div className="text-sm text-text-secondary">{shares} shares</div>
      </div>

      <div className="flex-1 text-right">
        <div className="font-semibold">{formatCurrency(value)}</div>
        <div
          className={`text-sm ${
            isPositive ? 'text-success' : 'text-danger'
          }`}
        >
          {formatPercent(changePct)}
        </div>
      </div>

      <div className="flex-1 flex justify-end">
        <div
          className="h-2 rounded-full bg-surface-elevated"
          style={{ width: '60px' }}
        >
          <div
            className={`h-full rounded-full ${
              isPositive ? 'bg-success' : 'bg-danger'
            }`}
            style={{ width: `${Math.min(Math.abs(changePct) * 5, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
