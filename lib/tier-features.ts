/**
 * TIER FEATURES - What each tier gets access to
 * Single source of truth for feature gating
 */

export interface TierConfig {
  name: string;
  price: number;
  maxTradesPerWeek: number;    // -1 = unlimited
  maxOptionsPerWeek: number;   // -1 = unlimited
  maxPortfolioValue: number;   // -1 = unlimited
  canAutoExecute: boolean;     // Agents can place trades automatically
  canViewSignals: boolean;     // Can see agent trade signals
  canUsePhoneBooth: boolean;   // Direct agent chat
  canCustomizeAgents: boolean; // Modify agent personalities
  canViewOffice: boolean;      // See the 3D office
  canViewRelationships: boolean;
  alertFrequency: 'none' | 'weekly' | 'daily' | 'realtime';
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  features: string[];
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    name: 'Free',
    price: 0,
    maxTradesPerWeek: 0,
    maxOptionsPerWeek: 0,
    maxPortfolioValue: -1,
    canAutoExecute: false,
    canViewSignals: false,
    canUsePhoneBooth: false,
    canCustomizeAgents: false,
    canViewOffice: true,       // Can view demo office
    canViewRelationships: false,
    alertFrequency: 'none',
    supportLevel: 'community',
    features: ['Demo office view', 'Landing page access'],
  },
  recovery: {
    name: 'Recovery',
    price: 29,
    maxTradesPerWeek: 0,
    maxOptionsPerWeek: 0,
    maxPortfolioValue: 25000,
    canAutoExecute: false,
    canViewSignals: true,
    canUsePhoneBooth: false,
    canCustomizeAgents: false,
    canViewOffice: true,
    canViewRelationships: false,
    alertFrequency: 'weekly',
    supportLevel: 'email',
    features: [
      'Portfolio recovery analysis',
      'Loss mitigation strategies',
      'Monthly check-ins',
      'Basic alerts',
      'Up to $25k portfolio',
    ],
  },
  scout: {
    name: 'Scout',
    price: 49,
    maxTradesPerWeek: 5,
    maxOptionsPerWeek: 2,
    maxPortfolioValue: -1,
    canAutoExecute: false,
    canViewSignals: true,
    canUsePhoneBooth: false,
    canCustomizeAgents: false,
    canViewOffice: true,
    canViewRelationships: true,
    alertFrequency: 'weekly',
    supportLevel: 'email',
    features: [
      '5 trades/week',
      '1-2 options/week',
      'All 7 agents (view signals)',
      'Health score',
      'Weekly email',
    ],
  },
  operator: {
    name: 'Operator',
    price: 99,
    maxTradesPerWeek: -1,
    maxOptionsPerWeek: -1,
    maxPortfolioValue: -1,
    canAutoExecute: true,
    canViewSignals: true,
    canUsePhoneBooth: true,
    canCustomizeAgents: false,
    canViewOffice: true,
    canViewRelationships: true,
    alertFrequency: 'daily',
    supportLevel: 'priority',
    features: [
      'Unlimited trades',
      'Unlimited options',
      'All 7 agents (auto-execute)',
      'Daily alerts',
      'Priority support',
    ],
  },
  partner: {
    name: 'Partner',
    price: 149.99,
    maxTradesPerWeek: -1,
    maxOptionsPerWeek: -1,
    maxPortfolioValue: -1,
    canAutoExecute: true,
    canViewSignals: true,
    canUsePhoneBooth: true,
    canCustomizeAgents: true,
    canViewOffice: true,
    canViewRelationships: true,
    alertFrequency: 'realtime',
    supportLevel: 'dedicated',
    features: [
      'Everything in Operator',
      'Custom agent tuning',
      'Monthly strategy call',
      'Recovery check-ins',
      'Direct Slack support',
    ],
  },
};

/**
 * Check if a user's tier allows a specific feature
 */
export function canAccess(tier: string, feature: keyof TierConfig): any {
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  return config[feature];
}

/**
 * Check if user can place more trades this week
 */
export function canTradeThisWeek(tier: string, tradesThisWeek: number): boolean {
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  if (config.maxTradesPerWeek === -1) return true;
  return tradesThisWeek < config.maxTradesPerWeek;
}

/**
 * Get tier config
 */
export function getTierConfig(tier: string): TierConfig {
  return TIER_CONFIGS[tier] || TIER_CONFIGS.free;
}

/**
 * Get upgrade message for a locked feature
 */
export function getUpgradeMessage(tier: string, feature: string): string {
  const current = TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  
  const upgrades: Record<string, string> = {
    canAutoExecute: `Auto-execution requires Operator ($99/mo) or higher. You're on ${current.name}.`,
    canUsePhoneBooth: `Phone Booth requires Operator ($99/mo) or higher. You're on ${current.name}.`,
    canCustomizeAgents: `Agent customization requires Partner ($149.99/mo). You're on ${current.name}.`,
    canViewSignals: `Signal viewing requires Scout ($49/mo) or higher. You're on ${current.name}.`,
    canViewRelationships: `Relationship matrix requires Scout ($49/mo) or higher. You're on ${current.name}.`,
  };

  return upgrades[feature] || `Upgrade your plan to access this feature.`;
}
