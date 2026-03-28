// Cortex Capital Dashboard for Fish Tank
// Displays live P&L, agent activity, and recent trades
"use client";

import { CortexPnLDisplay } from "./CortexPnLDisplay";
import { CortexTradesFeed } from "./CortexTradesFeed";
import { CortexActivityFeed } from "./CortexActivityFeed";
import { AgentDiscussionPanel } from "./AgentDiscussionPanel";
import { useCortexHealth } from "../hooks/useCortexData";

function HealthIndicator() {
  const { healthy, version, error } = useCortexHealth();

  if (healthy === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
        <span className="text-xs text-gray-400">Connecting...</span>
      </div>
    );
  }

  if (!healthy || error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 rounded-lg border border-red-700">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <span className="text-xs text-red-400">
          Cortex API Offline {error && `(${error})`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg border border-green-700">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span className="text-xs text-green-400">
        Cortex Capital Live {version && `v${version}`}
      </span>
    </div>
  );
}

interface CortexDashboardProps {
  /**
   * Layout mode: full (3 columns), compact (2 columns), minimal (P&L only)
   */
  layout?: "full" | "compact" | "minimal";
  /**
   * Number of trades to display
   */
  tradesLimit?: number;
  /**
   * Number of activity events to display
   */
  activityLimit?: number;
}

export function CortexDashboard({
  layout = "full",
  tradesLimit = 10,
  activityLimit = 20,
}: CortexDashboardProps) {
  if (layout === "minimal") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Cortex Capital</h2>
          <HealthIndicator />
        </div>
        <CortexPnLDisplay />
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Cortex Capital</h2>
          <HealthIndicator />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <CortexPnLDisplay />
            <CortexTradesFeed limit={tradesLimit} />
          </div>
          <CortexActivityFeed limit={activityLimit} />
        </div>
      </div>
    );
  }

  // Full layout
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cortex Capital Fish Tank</h2>
        <HealthIndicator />
      </div>

      {/* Agent Discussion Panel - Main Feature */}
      <div className="h-96">
        <AgentDiscussionPanel maxMessages={30} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Column 1: P&L */}
        <div className="space-y-4">
          <CortexPnLDisplay />
        </div>

        {/* Column 2: Trades */}
        <div className="space-y-4">
          <CortexTradesFeed limit={tradesLimit} />
        </div>

        {/* Column 3: Activity Feed */}
        <div className="space-y-4">
          <CortexActivityFeed limit={activityLimit} />
        </div>
      </div>
    </div>
  );
}
