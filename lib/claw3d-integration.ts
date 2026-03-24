// Cortex Capital → Claw3D Integration Helper
// Send activity events to Claw3D for visualization

/**
 * Agent role types (must match claw3d/src/agents/cortex-agents.ts)
 */
export type CortexAgentRole =
  | "ANALYST"
  | "STRATEGIST"
  | "EXECUTOR"
  | "REPORTER"
  | "OPTIONS_STRATEGIST"
  | "DAY_TRADER"
  | "MOMENTUM";

/**
 * Activity types (must match claw3d/src/agents/activity-feed.ts)
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
 * Activity event structure
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
 * Claw3D integration config
 */
interface Claw3DConfig {
  enabled: boolean;
  endpoint: string; // e.g., "http://localhost:3000/api/cortex/activity"
}

const config: Claw3DConfig = {
  enabled: process.env.CLAW3D_ENABLED === "true",
  endpoint: process.env.CLAW3D_ENDPOINT || "http://localhost:3000/api/cortex/activity",
};

/**
 * Send activity event to Claw3D
 */
export async function sendToClaw3D(
  agentRole: CortexAgentRole,
  activityType: CortexActivityType,
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): Promise<void> {
  if (!config.enabled) {
    return; // Integration disabled
  }

  const event: CortexActivityEvent = {
    timestamp: Date.now(),
    agentRole,
    activityType,
    description,
    metadata,
  };

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error("[Claw3D] Failed to send activity:", response.statusText);
    }
  } catch (error) {
    console.error("[Claw3D] Network error:", error);
  }
}

/**
 * Configure Claw3D integration
 */
export function configureClaw3D(options: Partial<Claw3DConfig>): void {
  Object.assign(config, options);
}

/**
 * Check if Claw3D integration is enabled
 */
export function isClaw3DEnabled(): boolean {
  return config.enabled;
}

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

/**
 * Helper: Analyst activity
 */
export async function notifyAnalystActivity(
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): Promise<void> {
  return sendToClaw3D("ANALYST", "analyzing", description, metadata);
}

/**
 * Helper: Strategist activity
 */
export async function notifyStrategistActivity(
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): Promise<void> {
  return sendToClaw3D("STRATEGIST", "strategizing", description, metadata);
}

/**
 * Helper: Executor activity
 */
export async function notifyExecutorActivity(
  description: string,
  action?: "BUY" | "SELL",
  ticker?: string
): Promise<void> {
  return sendToClaw3D("EXECUTOR", "executing", description, {
    action,
    ticker,
  });
}

/**
 * Helper: Reporter activity
 */
export async function notifyReporterActivity(
  description: string,
  reportType?: string
): Promise<void> {
  return sendToClaw3D("REPORTER", "reporting", description, {
    reportType,
  });
}

/**
 * Helper: Options Strategist activity
 */
export async function notifyOptionsStrategistActivity(
  description: string,
  ticker?: string
): Promise<void> {
  return sendToClaw3D("OPTIONS_STRATEGIST", "analyzing", description, {
    ticker,
  });
}

/**
 * Helper: Day Trader activity
 */
export async function notifyDayTraderActivity(
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): Promise<void> {
  return sendToClaw3D("DAY_TRADER", "monitoring", description, metadata);
}

/**
 * Helper: Momentum activity
 */
export async function notifyMomentumActivity(
  description: string,
  metadata?: CortexActivityEvent["metadata"]
): Promise<void> {
  return sendToClaw3D("MOMENTUM", "monitoring", description, metadata);
}
