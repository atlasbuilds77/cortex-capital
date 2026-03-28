// Tier-based agent configuration for Cortex Capital
// Different tiers see different agents and get different responses

import type { CortexAgentConfig } from '@/agents/cortex-agents';
import { CORTEX_AGENTS } from '@/agents/cortex-agents';

export type Tier = 'free' | 'recovery' | 'scout' | 'operator' | 'partner';

/**
 * Agent IDs visible at each tier level
 * Higher tiers see MORE agents and get MORE detailed responses
 */
const TIER_AGENT_ACCESS: Record<Tier, string[]> = {
  // Free: Only see Reporter (general updates, no trading info)
  free: ['cortex-reporter'],
  
  // Recovery ($29): Basic analysts for learning
  recovery: [
    'cortex-reporter',
    'cortex-analyst',
    'cortex-strategist',
  ],
  
  // Scout ($49): Trading signals, momentum
  scout: [
    'cortex-reporter',
    'cortex-analyst',
    'cortex-strategist',
    'cortex-momentum',
    'cortex-day-trader',
    'cortex-growth',
    'cortex-value',
  ],
  
  // Operator ($99): Full access including execution and risk
  operator: [
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
  ],
  
  // Partner: Same as operator (for now)
  partner: [
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
  ],
};

/**
 * Response detail level per tier
 * Affects how much information agents share
 */
export const TIER_RESPONSE_DETAIL: Record<Tier, {
  showPriceTargets: boolean;
  showEntryPoints: boolean;
  showPositionSizes: boolean;
  showRiskLevels: boolean;
  showExecutionDetails: boolean;
  conversationDepth: 'basic' | 'detailed' | 'full';
  // Trading capabilities
  canConnectBroker: boolean;
  canAutoTradeStocks: boolean;
  canAutoTradeOptions: boolean;
  tradingMode: 'view_only' | 'stocks_only' | 'full';
}> = {
  free: {
    showPriceTargets: false,
    showEntryPoints: false,
    showPositionSizes: false,
    showRiskLevels: false,
    showExecutionDetails: false,
    conversationDepth: 'basic',
    canConnectBroker: false,
    canAutoTradeStocks: false,
    canAutoTradeOptions: false,
    tradingMode: 'view_only',
  },
  recovery: {
    showPriceTargets: true,
    showEntryPoints: false,
    showPositionSizes: false,
    showRiskLevels: true,
    showExecutionDetails: false,
    conversationDepth: 'basic',
    canConnectBroker: true,     // Can connect broker
    canAutoTradeStocks: false,  // View only - no auto trading
    canAutoTradeOptions: false,
    tradingMode: 'view_only',
  },
  scout: {
    showPriceTargets: true,
    showEntryPoints: true,
    showPositionSizes: false,
    showRiskLevels: true,
    showExecutionDetails: false,
    conversationDepth: 'detailed',
    canConnectBroker: true,     // Can connect broker
    canAutoTradeStocks: true,   // Auto-trade STOCKS
    canAutoTradeOptions: false, // No options/LEAPS
    tradingMode: 'stocks_only',
  },
  operator: {
    showPriceTargets: true,
    showEntryPoints: true,
    showPositionSizes: true,
    showRiskLevels: true,
    showExecutionDetails: true,
    conversationDepth: 'full',
    canConnectBroker: true,     // Can connect broker
    canAutoTradeStocks: true,   // Auto-trade stocks
    canAutoTradeOptions: true,  // Auto-trade options + LEAPS
    tradingMode: 'full',
  },
  partner: {
    showPriceTargets: true,
    showEntryPoints: true,
    showPositionSizes: true,
    showRiskLevels: true,
    showExecutionDetails: true,
    conversationDepth: 'full',
    canConnectBroker: true,
    canAutoTradeStocks: true,
    canAutoTradeOptions: true,
    tradingMode: 'full',
  },
};

/**
 * Locked agent messages - shown when user doesn't have access
 */
const LOCKED_AGENT_MESSAGES: Record<string, string> = {
  'cortex-executor': 'Auto-execution requires Operator tier',
  'cortex-options-strategist': 'Options strategies require Operator tier',
  'cortex-risk': 'Risk management dashboard requires Operator tier',
  'cortex-momentum': 'Momentum signals require Scout tier or higher',
  'cortex-day-trader': 'Day trading signals require Scout tier or higher',
  'cortex-growth': 'Growth analysis requires Scout tier or higher',
  'cortex-value': 'Value analysis requires Scout tier or higher',
  'cortex-analyst': 'Market analysis requires Recovery tier or higher',
  'cortex-strategist': 'Trading strategies require Recovery tier or higher',
};

/**
 * Get agents visible for a specific tier
 */
export function getAgentsForTier(tier: Tier): CortexAgentConfig[] {
  const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
  return CORTEX_AGENTS.filter(agent => visibleIds.includes(agent.id));
}

/**
 * Get all agents with locked status for tier-aware UI
 */
export function getAllAgentsWithAccess(tier: Tier): Array<CortexAgentConfig & { 
  locked: boolean; 
  lockMessage?: string;
  requiredTier?: Tier;
}> {
  const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
  
  return CORTEX_AGENTS.map(agent => {
    const locked = !visibleIds.includes(agent.id);
    const requiredTier = getRequiredTierForAgent(agent.id);
    
    return {
      ...agent,
      locked,
      lockMessage: locked ? LOCKED_AGENT_MESSAGES[agent.id] : undefined,
      requiredTier: locked ? requiredTier : undefined,
    };
  });
}

/**
 * Get minimum tier required for an agent
 */
function getRequiredTierForAgent(agentId: string): Tier {
  const tiers: Tier[] = ['free', 'recovery', 'scout', 'operator', 'partner'];
  
  for (const tier of tiers) {
    if (TIER_AGENT_ACCESS[tier].includes(agentId)) {
      return tier;
    }
  }
  
  return 'operator';
}

/**
 * Check if a user can see a specific agent
 */
export function canAccessAgent(tier: Tier, agentId: string): boolean {
  const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
  return visibleIds.includes(agentId);
}

/**
 * Filter discussions to only show agents the user can access
 */
export function filterDiscussionsForTier<T extends { agent?: string }>(
  discussions: T[],
  tier: Tier
): T[] {
  const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
  
  return discussions.filter(discussion => {
    if (!discussion.agent) return true; // Allow system messages
    const agentId = `cortex-${discussion.agent.toLowerCase()}`;
    return visibleIds.includes(agentId);
  });
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
  const agentCount = TIER_AGENT_ACCESS[tier]?.length || 1;
  
  const info: Record<Tier, { name: string; color: string; icon: string }> = {
    free: { name: 'Free', color: '#6B7280', icon: '👁️' },
    recovery: { name: 'Recovery', color: '#3B82F6', icon: '📚' },
    scout: { name: 'Scout', color: '#8B5CF6', icon: '🎯' },
    operator: { name: 'Operator', color: '#10B981', icon: '⚡' },
    partner: { name: 'Partner', color: '#F59E0B', icon: '🤝' },
  };
  
  return {
    ...info[tier],
    agentCount,
  };
}
