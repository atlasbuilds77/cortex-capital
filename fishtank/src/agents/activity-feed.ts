// Activity Feed for Cortex Capital agents
// Receives activity events from Cortex Capital and updates agent status in Claw3D

import type { CortexAgentRole } from "./cortex-agents";

/**
 * Activity event types from Cortex Capital
 */
export type CortexActivityType =
  | "analyzing"
  | "trading"
  | "reporting"
  | "strategizing"
  | "monitoring"
  | "executing"
  | "idle";

/**
 * Activity event from Cortex Capital
 */
export interface CortexActivityEvent {
  timestamp: number;
  agentRole: CortexAgentRole;
  activityType: CortexActivityType;
  description: string;
  metadata?: {
    ticker?: string;
    action?: "BUY" | "SELL" | "ANALYZE";
    userId?: string;
    reportType?: string;
    [key: string]: any;
  };
}

/**
 * Activity feed state
 */
interface ActivityFeedState {
  events: CortexActivityEvent[];
  maxEvents: number;
  listeners: Set<(event: CortexActivityEvent) => void>;
}

const state: ActivityFeedState = {
  events: [],
  maxEvents: 100, // keep last 100 events
  listeners: new Set(),
};

/**
 * Push a new activity event
 */
export function pushActivity(event: CortexActivityEvent): void {
  state.events.push(event);
  
  // Keep only last N events
  if (state.events.length > state.maxEvents) {
    state.events.shift();
  }
  
  // Notify listeners
  state.listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Activity listener error:", error);
    }
  });
}

/**
 * Subscribe to activity events
 */
export function subscribeToActivity(
  listener: (event: CortexActivityEvent) => void
): () => void {
  state.listeners.add(listener);
  
  // Return unsubscribe function
  return () => {
    state.listeners.delete(listener);
  };
}

/**
 * Get recent activity events
 */
export function getRecentActivity(limit: number = 20): CortexActivityEvent[] {
  return state.events.slice(-limit);
}

/**
 * Get activity for specific agent role
 */
export function getAgentActivity(
  role: CortexAgentRole,
  limit: number = 10
): CortexActivityEvent[] {
  return state.events
    .filter((event) => event.agentRole === role)
    .slice(-limit);
}

/**
 * Clear all activity events
 */
export function clearActivity(): void {
  state.events = [];
}

/**
 * Helper: Create activity event
 */
export function createActivityEvent(
  agentRole: CortexAgentRole,
  activityType: CortexActivityType,
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): CortexActivityEvent {
  return {
    timestamp: Date.now(),
    agentRole,
    activityType,
    description,
    metadata,
  };
}

// ============================================================================
// EXAMPLE USAGE (for testing/demo)
// ============================================================================

/**
 * Simulate Cortex Capital activity (for testing)
 */
export function simulateCortexActivity(): void {
  const activities: Array<{
    role: CortexAgentRole;
    type: CortexActivityType;
    description: string;
    metadata?: any;
  }> = [
    {
      role: "ANALYST",
      type: "analyzing",
      description: "Reviewing portfolio for user_123",
      metadata: { userId: "user_123" },
    },
    {
      role: "EXECUTOR",
      type: "executing",
      description: "Placed BUY order for AAPL",
      metadata: { ticker: "AAPL", action: "BUY" },
    },
    {
      role: "REPORTER",
      type: "reporting",
      description: "Sent weekly summary",
      metadata: { reportType: "weekly" },
    },
    {
      role: "STRATEGIST",
      type: "strategizing",
      description: "Analyzing sector rotation patterns",
    },
    {
      role: "OPTIONS_STRATEGIST",
      type: "analyzing",
      description: "Calculating Greeks for SPY options",
      metadata: { ticker: "SPY" },
    },
    {
      role: "DAY_TRADER",
      type: "monitoring",
      description: "Watching momentum in tech sector",
    },
    {
      role: "MOMENTUM",
      type: "monitoring",
      description: "Tracking relative strength leaders",
    },
  ];

  let index = 0;
  
  // Push activities every 3 seconds
  setInterval(() => {
    const activity = activities[index % activities.length];
    pushActivity(createActivityEvent(
      activity.role,
      activity.type,
      activity.description,
      activity.metadata
    ));
    index++;
  }, 3000);
}
