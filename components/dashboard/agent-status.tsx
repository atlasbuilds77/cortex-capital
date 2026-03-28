'use client'

import { useState, useEffect } from 'react'
import { Activity, Brain, TrendingUp, AlertCircle, Bot, X } from 'lucide-react'

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  current_task?: string
  last_action?: string
  uptime_hours: number
  trades_today: number
}

export function AgentStatus() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  useEffect(() => {
    // Fetch agent status from API
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/fishtank/agents')
        if (response.ok) {
          const data = await response.json()
          setAgents(data.agents || [])
        }
      } catch (err) {
        console.warn('Agent API not available:', err)
        // Mock data for development - using official agent names
        setAgents([
          {
            id: 'analyst-1',
            name: 'ANALYST',
            status: 'active',
            current_task: 'Analyzing market conditions and trends',
            last_action: 'Flagged NVDA for momentum entry',
            uptime_hours: 8.5,
            trades_today: 5,
          },
          {
            id: 'strategist-1',
            name: 'STRATEGIST',
            status: 'active',
            current_task: 'Developing portfolio strategy',
            last_action: 'Recommended sector rotation to tech',
            uptime_hours: 8.5,
            trades_today: 3,
          },
          {
            id: 'executor-1',
            name: 'EXECUTOR',
            status: 'active',
            current_task: 'Executing pending orders',
            last_action: 'Bought SPY 525C @ 2.15',
            uptime_hours: 8.5,
            trades_today: 12,
          },
          {
            id: 'reporter-1',
            name: 'REPORTER',
            status: 'idle',
            current_task: 'Generating daily report',
            uptime_hours: 8.5,
            trades_today: 0,
          },
          {
            id: 'options-1',
            name: 'OPTIONS_STRATEGIST',
            status: 'active',
            current_task: 'Scanning 0DTE opportunities',
            last_action: 'Opened QQQ 440P position',
            uptime_hours: 8.5,
            trades_today: 8,
          },
          {
            id: 'daytrader-1',
            name: 'DAY_TRADER',
            status: 'active',
            current_task: 'Monitoring intraday setups',
            last_action: 'Closed AMD scalp for +2.3%',
            uptime_hours: 8.5,
            trades_today: 15,
          },
          {
            id: 'momentum-1',
            name: 'MOMENTUM',
            status: 'idle',
            current_task: 'Waiting for momentum signal',
            uptime_hours: 8.5,
            trades_today: 2,
          },
        ])
      }
    }

    fetchAgents()
    const interval = setInterval(fetchAgents, 5000) // Update every 5s

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-success text-background'
      case 'idle':
        return 'bg-warning text-background'
      case 'error':
        return 'bg-error text-background'
      default:
        return 'bg-gray-600 text-text-secondary'
    }
  }

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="w-3 h-3" />
      case 'idle':
        return <Brain className="w-3 h-3" />
      case 'error':
        return <AlertCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AGENT STATUS</h3>
          <span className="text-xs text-text-secondary">
            {agents.filter((a) => a.status === 'active').length}/{agents.length} active
          </span>
        </div>
      </div>

      {/* Agent List */}
      <div className="divide-y divide-gray-700">
        {agents.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No agents online
          </div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="w-full p-4 hover:bg-gray-800 transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{agent.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                        agent.status
                      )}`}
                    >
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </span>
                  </div>
                  {agent.current_task && (
                    <div className="text-sm text-text-secondary truncate">
                      {agent.current_task}
                    </div>
                  )}
                  {agent.last_action && (
                    <div className="text-xs text-primary mt-1 truncate">
                      → {agent.last_action}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <TrendingUp className="w-3 h-3" />
                    {agent.trades_today}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {agent.uptime_hours.toFixed(1)}h
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="bg-surface rounded-xl border border-gray-700 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedAgent.name}</h3>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-text-secondary">Status</div>
                <div className="font-medium capitalize">{selectedAgent.status}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Current Task</div>
                <div className="font-medium">
                  {selectedAgent.current_task || 'Idle'}
                </div>
              </div>
              {selectedAgent.last_action && (
                <div>
                  <div className="text-sm text-text-secondary">Last Action</div>
                  <div className="font-medium text-primary">
                    {selectedAgent.last_action}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <div className="text-sm text-text-secondary">Uptime</div>
                  <div className="font-medium">
                    {selectedAgent.uptime_hours.toFixed(1)} hours
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary">Trades Today</div>
                  <div className="font-medium">{selectedAgent.trades_today}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
