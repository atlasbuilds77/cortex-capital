/**
 * AGENT CONFIG - Single source of truth for agent data
 * Used across: fishtank, office, relationships, admin, discussions
 */

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;       // Path to avatar image
  emoji: string;        // Fallback emoji
  color: string;        // Brand color
  personality: string;  // Brief personality description
}

export const AGENTS: Record<string, AgentConfig> = {
  ANALYST: {
    id: 'ANALYST',
    name: 'Analyst',
    role: 'Market Analyst',
    description: 'Analyzes market conditions, trends, and data patterns',
    avatar: '/avatars/analyst.jpg',
    emoji: '',
    color: '#3B82F6',
    personality: 'Data-driven, thorough, presents facts before opinions',
  },
  STRATEGIST: {
    id: 'STRATEGIST',
    name: 'Strategist',
    role: 'Chief Strategist',
    description: 'Develops trading strategies and big-picture planning',
    avatar: '/avatars/strategist.jpg',
    emoji: '',
    color: '#8B5CF6',
    personality: 'Big picture thinker, challenges assumptions, risk-aware',
  },
  DAY_TRADER: {
    id: 'DAY_TRADER',
    name: 'Day Trader',
    role: 'Day Trader',
    description: 'Quick decisions, momentum focused, intraday execution',
    avatar: '/avatars/day_trader.jpg',
    emoji: '',
    color: '#F59E0B',
    personality: 'Action-oriented, quick decisions, momentum focused',
  },
  MOMENTUM: {
    id: 'MOMENTUM',
    name: 'Momentum',
    role: 'Momentum Trader',
    description: 'Identifies and rides strong market trends',
    avatar: '/avatars/momentum.jpg',
    emoji: '',
    color: '#EF4444',
    personality: 'Trend follower, aggressive entries, lets winners run',
  },
  OPTIONS_STRATEGIST: {
    id: 'OPTIONS_STRATEGIST',
    name: 'Options Pro',
    role: 'Options Strategist',
    description: 'Specializes in options flow, Greeks, and complex strategies',
    avatar: '/avatars/options_strategist.jpg',
    emoji: '',
    color: '#10B981',
    personality: 'Analytical, probability-focused, hedging expert',
  },
  RISK: {
    id: 'RISK',
    name: 'Risk',
    role: 'Risk Manager',
    description: 'Protects capital, manages position sizing and stop losses',
    avatar: '/avatars/risk.jpg',
    emoji: '',
    color: '#DC2626',
    personality: 'Conservative, protective, always asks "what if wrong?"',
  },
  EXECUTOR: {
    id: 'EXECUTOR',
    name: 'Executor',
    role: 'Trade Executor',
    description: 'Executes trades with optimal timing and minimal slippage',
    avatar: '/avatars/executor.jpg',
    emoji: '',
    color: '#6366F1',
    personality: 'Calm under pressure, precise, action-oriented',
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    role: 'Growth Investor',
    description: 'Finds high-growth opportunities and emerging trends',
    avatar: '/avatars/growth.jpg',
    emoji: '',
    color: '#22C55E',
    personality: 'Optimistic, forward-looking, loves innovation',
  },
  VALUE: {
    id: 'VALUE',
    name: 'Value',
    role: 'Value Investor',
    description: 'Finds undervalued assets with strong fundamentals',
    avatar: '/avatars/value.jpg',
    emoji: '',
    color: '#1E40AF',
    personality: 'Patient, contrarian, fundamental analysis focused',
  },
};

// Helper functions
export function getAgent(id: string): AgentConfig | undefined {
  return AGENTS[id.toUpperCase()];
}

export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}

export function getAgentAvatar(id: string): string {
  const agent = getAgent(id);
  return agent?.avatar || '/avatars/default.jpg';
}

export function getAgentColor(id: string): string {
  const agent = getAgent(id);
  return agent?.color || '#6B7280';
}

export function getAgentEmoji(id: string): string {
  const agent = getAgent(id);
  return agent?.emoji || '🤖';
}

// For the collaborative daemon
export const AGENT_IDS = Object.keys(AGENTS);
