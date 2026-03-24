import { CheckCircle, RefreshCw, XCircle } from 'lucide-react'

interface AgentCardProps {
  name: string
  action: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
}

export function AgentCard({ name, action, timestamp, status }: AgentCardProps) {
  const statusConfig = {
    completed: {
      Icon: CheckCircle,
      color: 'text-green-500',
    },
    pending: {
      Icon: RefreshCw,
      color: 'text-yellow-500',
    },
    failed: {
      Icon: XCircle,
      color: 'text-red-500',
    },
  }

  const { Icon, color } = statusConfig[status]

  return (
    <div className="flex items-start gap-3 p-4 bg-surface rounded-lg">
      <Icon className={`w-6 h-6 ${color}`} />
      <div className="flex-1">
        <div className="font-medium">
          {name} {action}
        </div>
        <div className="text-sm text-text-secondary">{timestamp}</div>
      </div>
    </div>
  )
}
