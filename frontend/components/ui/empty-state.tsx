import React from 'react'
import { BarChart2, Briefcase, Bot, Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  Icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ Icon = BarChart2, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Preset empty states
export function NoPositionsState({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <EmptyState
      Icon={Briefcase}
      title="No positions yet"
      description="Your portfolio is empty. Connect your broker or complete onboarding to let our agents start trading for you."
      action={
        onGetStarted
          ? {
              label: 'Get started',
              onClick: onGetStarted,
            }
          : undefined
      }
    />
  )
}

export function NoActivityState() {
  return (
    <EmptyState
      Icon={Bot}
      title="No agent activity yet"
      description="Your AI agents haven't made any moves yet. They're analyzing the market and will act when opportunities arise."
    />
  )
}

export function NoDataState({ message }: { message?: string }) {
  return (
    <EmptyState
      Icon={Inbox}
      title="No data available"
      description={message || "We couldn't find any data to display right now."}
    />
  )
}
