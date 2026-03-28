// Agent activity feed for Cortex Capital in Fish Tank
"use client";

import { useCortexActivity } from "../hooks/useCortexData";
import type { CortexAgentActivity } from "@/lib/cortex-capital-api";
import { getAgentByRole } from "@/agents/cortex-agents";

function ActivityCard({ activity }: { activity: CortexAgentActivity }) {
  const agent = getAgentByRole(activity.agentRole as any);
  const emoji = agent?.emoji || "🤖";
  const color = agent?.color || "#6B7280";

  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${color}20`, border: `1px solid ${color}` }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">
              {activity.agentRole}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-gray-300">{activity.activity}</p>
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="px-2 py-1 bg-gray-900 rounded text-xs text-gray-400"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CortexActivityFeed({ limit = 20 }: { limit?: number }) {
  const { activity, loading, error } = useCortexActivity(limit);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-3 bg-gray-800 rounded-lg border border-gray-700 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-48"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-700">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-center">
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Agent Activity</h3>
        <span className="text-xs text-gray-500">{activity.length} events</span>
      </div>
      {activity.map((act, idx) => (
        <ActivityCard key={`${act.timestamp}-${idx}`} activity={act} />
      ))}
    </div>
  );
}
