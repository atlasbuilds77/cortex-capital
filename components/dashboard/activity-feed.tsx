'use client'

import { AgentCard } from '@/components/ui/agent-card'
import { useEffect, useState } from 'react'
import { api, AgentActivity } from '@/lib/api'
import { Bot } from 'lucide-react'

export function ActivityFeed() {
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    const response = await api.getAgentActivity(5)
    if (response.data) {
      setActivities(response.data)
    }
    setLoading(false)
  }

  // Mock data fallback
  const mockActivities: AgentActivity[] = [
    {
      id: '1',
      agent_name: 'ANALYST',
      action: 'checked portfolio health',
      timestamp: '2 hours ago',
      status: 'completed',
    },
    {
      id: '2',
      agent_name: 'STRATEGIST',
      action: 'rebalancing Monday 9:30 AM',
      timestamp: 'Scheduled',
      status: 'pending',
    },
    {
      id: '3',
      agent_name: 'MOMENTUM',
      action: 'sees XLK momentum building',
      timestamp: '4 hours ago',
      status: 'completed',
    },
  ]

  const displayActivities = activities.length > 0 ? activities : mockActivities

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Activity
        </h3>
        <button className="text-primary text-sm hover:underline">
          See All
        </button>
      </div>

      {loading ? (
        <div className="text-text-secondary text-center py-8">Loading...</div>
      ) : (
        displayActivities.map((activity) => (
          <AgentCard
            key={activity.id}
            name={activity.agent_name}
            action={activity.action}
            timestamp={activity.timestamp}
            status={activity.status}
          />
        ))
      )}
    </div>
  )
}
