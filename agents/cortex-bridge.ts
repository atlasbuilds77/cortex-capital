// Cortex Capital ↔ Claw3D Integration Bridge
// Receives activity from Cortex Capital and updates agent visualization

import {
  CORTEX_AGENTS,
  type CortexAgentRole,
  toOfficeAgent,
} from "./cortex-agents";
import {
  pushActivity,
  subscribeToActivity,
  type CortexActivityEvent,
  type CortexActivityType,
} from "./activity-feed";
import type { OfficeAgent } from "@/features/retro-office/core/types";

/**
 * Bridge state
 */
interface BridgeState {
  agentStatuses: Map<string, "working" | "idle" | "error">;
  activitySubscription?: () => void;
}

const state: BridgeState = {
  agentStatuses: new Map(),
};

/**
 * Map activity type to agent status
 */
function activityToStatus(
  activityType: CortexActivityType
): "working" | "idle" | "error" {
  switch (activityType) {
    case "analyzing":
    case "trading":
    case "reporting":
    case "strategizing":
    case "monitoring":
    case "executing":
      return "working";
    case "idle":
      return "idle";
    default:
      return "idle";
  }
}

/**
 * Initialize the bridge
 */
export function initCortexBridge(): void {
  // Initialize all agents as idle
  CORTEX_AGENTS.forEach((agent) => {
    state.agentStatuses.set(agent.id, "idle");
  });

  // Subscribe to activity feed
  state.activitySubscription = subscribeToActivity((event) => {
    handleActivityEvent(event);
  });

  console.log("[CortexBridge] Initialized with", CORTEX_AGENTS.length, "agents");
}

/**
 * Cleanup the bridge
 */
export function cleanupCortexBridge(): void {
  if (state.activitySubscription) {
    state.activitySubscription();
    state.activitySubscription = undefined;
  }
}

/**
 * Handle incoming activity event
 */
function handleActivityEvent(event: CortexActivityEvent): void {
  const agent = CORTEX_AGENTS.find((a) => a.role === event.agentRole);
  if (!agent) {
    console.warn("[CortexBridge] Unknown agent role:", event.agentRole);
    return;
  }

  const newStatus = activityToStatus(event.activityType);
  state.agentStatuses.set(agent.id, newStatus);

  console.log(
    `[CortexBridge] ${agent.name} (${agent.role}): ${event.description} [${newStatus}]`
  );
}

/**
 * Get current agent statuses as OfficeAgent array
 */
export function getCortexOfficeAgents(): OfficeAgent[] {
  return CORTEX_AGENTS.map((config) => {
    const status = state.agentStatuses.get(config.id) || "idle";
    return toOfficeAgent(config, status);
  });
}

/**
 * Get status for specific agent
 */
export function getAgentStatus(
  agentId: string
): "working" | "idle" | "error" | undefined {
  return state.agentStatuses.get(agentId);
}

/**
 * Manually set agent status (for testing)
 */
export function setAgentStatus(
  agentId: string,
  status: "working" | "idle" | "error"
): void {
  state.agentStatuses.set(agentId, status);
}

// ============================================================================
// INTEGRATION ENDPOINTS
// ============================================================================

/**
 * HTTP endpoint handler for receiving Cortex Capital activity
 * Usage: POST /api/cortex/activity
 * Body: CortexActivityEvent
 */
export async function handleCortexActivityWebhook(
  event: CortexActivityEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    pushActivity(event);
    return { success: true };
  } catch (error) {
    console.error("[CortexBridge] Webhook error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * File-based activity feed reader
 * Reads from a JSONL file that Cortex Capital writes to
 * 
 * Usage:
 * 1. Cortex Capital appends to: /tmp/cortex-activity.jsonl
 * 2. Claw3D polls this file every N seconds
 */
export async function pollActivityFile(
  filePath: string = "/tmp/cortex-activity.jsonl"
): Promise<void> {
  // Implementation would read file, parse JSONL, push events
  // Left as placeholder - implement based on deployment needs
  console.log("[CortexBridge] File polling not yet implemented:", filePath);
}

/**
 * WebSocket connection handler
 * Receives real-time activity from Cortex Capital via WebSocket
 */
export function handleCortexWebSocket(
  socket: WebSocket
): void {
  socket.addEventListener("message", (event) => {
    try {
      const activity: CortexActivityEvent = JSON.parse(event.data);
      pushActivity(activity);
    } catch (error) {
      console.error("[CortexBridge] WebSocket parse error:", error);
    }
  });

  socket.addEventListener("open", () => {
    console.log("[CortexBridge] WebSocket connected");
  });

  socket.addEventListener("close", () => {
    console.log("[CortexBridge] WebSocket disconnected");
  });

  socket.addEventListener("error", (error) => {
    console.error("[CortexBridge] WebSocket error:", error);
  });
}
