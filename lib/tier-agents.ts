// Tier-based agent configuration for Cortex Capital
// ALL paying tiers get ALL agents
// Difference is trading capabilities only

import type { CortexAgentConfig } from '@/agents/cortex-agents';
import { CORTEX_AGENTS } from '@/agents/cortex-agents';

export type Tier = 'recovery' | 'scout' | 'operator' | 'partner';

// All agent IDs - everyone gets all agents
const ALL_AGENTS = [
  'cortex-reporter',
  'cortex-analyst',
  'cortex-strategist',
  'cortex-executor',
  'cortex-momentum',
  'cortex-day-trader',
  'cortex-options-strategist',
  'cortex-risk',
  'cortex-growth',
  'cortex-value',
];

/**
 * Agent IDs visible at each tier level
 * ALL TIERS GET ALL AGENTS
 */
export const TIER_AGENT_ACCESS: Record<Tier, string[]> = {
  recovery: ALL_AGENTS,
  scout: ALL_AGENTS,
  operator: ALL_AGENTS,
  partner: ALL_AGENTS,
};

/**
 * Trading capabilities per tier
 * This is what actually differs
 */
export const TIER_CAPABILITIES: Record<Tier, {
  canConnectBroker: boolean;
  canAutoTradeStocks: boolean;
  canAutoTradeOptions: boolean;
  tradingMode: 'view_only' | 'stocks_only' | 'full';
  description: string;
}> = {
  recovery: {
    canConnectBroker: true,
    canAutoTradeStocks: false,
    canAutoTradeOptions: false,
    tradingMode: 'view_only',
    description: 'Learn from agents, view-only trading',
  },
  scout: {
    canConnectBroker: true,
    canAutoTradeStocks: true,
    canAutoTradeOptions: false,
    tradingMode: 'stocks_only',
    description: 'Auto-trade stocks, no options',
  },
  operator: {
    canConnectBroker: true,
    canAutoTradeStocks: true,
    canAutoTradeOptions: true,
    tradingMode: 'full',
    description: 'Full auto-trading: stocks + options',
  },
  partner: {
    canConnectBroker: true,
    canAutoTradeStocks: true,
    canAutoTradeOptions: true,
    tradingMode: 'full',
    description: 'Full access + priority support',
  },
};

/**
 * Get agents visible for a specific tier
 * ALL TIERS GET ALL AGENTS
 */
export function getAgentsForTier(tier: Tier): CortexAgentConfig[] {
  return CORTEX_AGENTS;
}

/**
 * Get all agents - none are locked for paying users
 */
export function getAllAgentsWithAccess(tier: Tier): Array<CortexAgentConfig & { 
  locked: boolean; 
}> {
  return CORTEX_AGENTS.map(agent => ({
    ...agent,
    locked: false, // No agents locked for paying users
  }));
}

/**
 * Check if a user can see a specific agent
 * ALL PAYING USERS CAN SEE ALL AGENTS
 */
export function canAccessAgent(tier: Tier, agentId: string): boolean {
  return true; // Everyone gets all agents
}

/**
 * Filter discussions - no filtering needed, everyone sees everything
 */
export function filterDiscussionsForTier<T extends { agent?: string }>(
  discussions: T[],
  tier: Tier
): T[] {
  return discussions; // No filtering - all tiers see all agents
}

/**
 * Get tier display info
 */
export function getTierDisplayInfo(tier: Tier): {
  name: string;
  color: string;
  icon: string;
  agentCount: number;
} {
  const info: Record<Tier, { name: string; color: string; icon: string }> = {
    recovery: { name: 'Recovery', color: '#3B82F6', icon: '📚' },
    scout: { name: 'Scout', color: '#8B5CF6', icon: '🎯' },
    operator: { name: 'Operator', color: '#10B981', icon: '⚡' },
    partner: { name: 'Partner', color: '#F59E0B', icon: '🤝' },
  };
  
  return {
    ...info[tier],
    agentCount: 10, // All agents for all tiers
  };
}

/**
 * Check trading capability
 */
export function canAutoTrade(tier: Tier, assetType: 'stocks' | 'options'): boolean {
  const caps = TIER_CAPABILITIES[tier];
  if (assetType === 'stocks') return caps.canAutoTradeStocks;
  if (assetType === 'options') return caps.canAutoTradeOptions;
  return false;
}
