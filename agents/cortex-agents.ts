// Cortex Capital Agent Definitions for Claw3D Visualization
// Maps the 7 Cortex Capital trading agents to office visualization

import type { OfficeAgent } from "@/features/retro-office/core/types";
import type { FurnitureSeed } from "@/features/retro-office/core/types";

/**
 * Agent role definitions matching Cortex Capital architecture
 */
export type CortexAgentRole =
  | "ANALYST"
  | "STRATEGIST"
  | "EXECUTOR"
  | "REPORTER"
  | "OPTIONS_STRATEGIST"
  | "DAY_TRADER"
  | "MOMENTUM"
  | "RISK"
  | "GROWTH"
  | "VALUE";

/**
 * Cortex agent configuration with desk placement
 */
export interface CortexAgentConfig {
  id: string;
  name: string;
  role: CortexAgentRole;
  color: string; // hex color for agent avatar
  emoji?: string;
  desk: {
    x: number; // canvas grid position
    y: number; // canvas grid position
    facing: "north" | "south" | "east" | "west";
    decoration?: string; // desk decoration item
  };
}

/**
 * The 7 Cortex Capital agents
 */
export const CORTEX_AGENTS: CortexAgentConfig[] = [
  {
    id: "cortex-analyst",
    name: "Analyst",
    role: "ANALYST",
    color: "#3B82F6", // blue
    emoji: "📊",
    desk: {
      x: 5,
      y: 3,
      facing: "south",
      decoration: "analytics_screens", // near analytics/monitoring displays
    },
  },
  {
    id: "cortex-strategist",
    name: "Strategist",
    role: "STRATEGIST",
    color: "#8B5CF6", // purple
    emoji: "♟️",
    desk: {
      x: 8,
      y: 3,
      facing: "south",
      decoration: "chess_board", // chess board for strategic thinking
    },
  },
  {
    id: "cortex-executor",
    name: "Executor",
    role: "EXECUTOR",
    color: "#10B981", // green
    emoji: "⚡",
    desk: {
      x: 5,
      y: 6,
      facing: "north",
      decoration: "trading_terminal", // direct market access terminal
    },
  },
  {
    id: "cortex-reporter",
    name: "Reporter",
    role: "REPORTER",
    color: "#F59E0B", // amber
    emoji: "📝",
    desk: {
      x: 8,
      y: 6,
      facing: "north",
      decoration: "printer_email", // communication hub
    },
  },
  {
    id: "cortex-options-strategist",
    name: "Options Strategist",
    role: "OPTIONS_STRATEGIST",
    color: "#EF4444", // red
    emoji: "🎯",
    desk: {
      x: 11,
      y: 3,
      facing: "south",
      decoration: "greeks_charts", // options Greeks displays
    },
  },
  {
    id: "cortex-day-trader",
    name: "Day Trader",
    role: "DAY_TRADER",
    color: "#06B6D4", // cyan
    emoji: "📈",
    desk: {
      x: 11,
      y: 6,
      facing: "north",
      decoration: "multi_monitor", // standing desk with multiple monitors
    },
  },
  {
    id: "cortex-momentum",
    name: "Momentum",
    role: "MOMENTUM",
    color: "#EC4899", // pink
    emoji: "🚀",
    desk: {
      x: 14,
      y: 4,
      facing: "west",
      decoration: "sector_heatmap", // sector rotation heatmap
    },
  },
  {
    id: "cortex-risk",
    name: "Risk",
    role: "RISK",
    color: "#EF4444", // red
    emoji: "🛡️",
    desk: {
      x: 14,
      y: 6,
      facing: "north",
      decoration: "risk_dashboard", // risk metrics display
    },
  },
  {
    id: "cortex-growth",
    name: "Growth",
    role: "GROWTH",
    color: "#22C55E", // green
    emoji: "📈",
    desk: {
      x: 17,
      y: 3,
      facing: "south",
      decoration: "growth_charts", // growth stock screens
    },
  },
  {
    id: "cortex-value",
    name: "Value",
    role: "VALUE",
    color: "#0EA5E9", // sky blue
    emoji: "💎",
    desk: {
      x: 17,
      y: 6,
      facing: "north",
      decoration: "fundamentals", // fundamental analysis displays
    },
  },
];

/**
 * Convert Cortex agent config to OfficeAgent format
 */
export function toOfficeAgent(
  config: CortexAgentConfig,
  status: "working" | "idle" | "error" = "idle"
): OfficeAgent {
  return {
    id: config.id,
    name: config.name,
    status,
    color: config.color,
    item: "laptop", // default item for office agents
    avatarProfile: null, // Use default avatar generation
  };
}

/**
 * Generate desk furniture items for Cortex agents
 */
export function generateCortexDesks(): FurnitureSeed[] {
  return CORTEX_AGENTS.map((agent) => {
    const facingMap = {
      north: 0,
      east: 90,
      south: 180,
      west: 270,
    };

    return {
      type: "desk",
      x: agent.desk.x,
      y: agent.desk.y,
      r: facingMap[agent.desk.facing],
      color: agent.color,
      id: agent.id, // link desk to agent
    };
  });
}

/**
 * Get all Cortex agents as OfficeAgent array
 */
export function getAllCortexAgents(
  status: "working" | "idle" | "error" = "idle"
): OfficeAgent[] {
  return CORTEX_AGENTS.map((config) => toOfficeAgent(config, status));
}

/**
 * Get agent by role
 */
export function getAgentByRole(role: CortexAgentRole): CortexAgentConfig | undefined {
  return CORTEX_AGENTS.find((agent) => agent.role === role);
}

/**
 * Get agent by id
 */
export function getAgentById(id: string): CortexAgentConfig | undefined {
  return CORTEX_AGENTS.find((agent) => agent.id === id);
}
