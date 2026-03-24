/**
 * TIER PERMISSIONS - What each tier can do
 * Based on Stripe product definitions
 */

export type Tier = 'free' | 'recovery' | 'scout' | 'operator' | 'partner';

export interface TierPermissions {
  tier: Tier;
  price: number;
  canExecuteTrades: boolean;
  allowedInstruments: string[];
  agentCount: number;
  portfolioLimit: number; // 0 = unlimited
  features: {
    autoRebalancing: boolean;
    optionsStrategies: boolean;
    taxLossHarvesting: boolean;
    customAgentTuning: boolean;
    apiAccess: boolean;
  };
}

export const TIER_PERMISSIONS: Record<Tier, TierPermissions> = {
  free: {
    tier: 'free',
    price: 0,
    canExecuteTrades: false,
    allowedInstruments: [],
    agentCount: 0,
    portfolioLimit: 10000,
    features: {
      autoRebalancing: false,
      optionsStrategies: false,
      taxLossHarvesting: false,
      customAgentTuning: false,
      apiAccess: false,
    },
  },
  recovery: {
    tier: 'recovery',
    price: 29,
    canExecuteTrades: false, // Alerts only, no execution
    allowedInstruments: [],
    agentCount: 0,
    portfolioLimit: 25000,
    features: {
      autoRebalancing: false,
      optionsStrategies: false,
      taxLossHarvesting: false,
      customAgentTuning: false,
      apiAccess: false,
    },
  },
  scout: {
    tier: 'scout',
    price: 49,
    canExecuteTrades: true, // ✅ EXECUTES basic rebalancing
    allowedInstruments: ['stocks', 'etfs'],
    agentCount: 3,
    portfolioLimit: 50000,
    features: {
      autoRebalancing: true,
      optionsStrategies: false,
      taxLossHarvesting: false,
      customAgentTuning: false,
      apiAccess: false,
    },
  },
  operator: {
    tier: 'operator',
    price: 99,
    canExecuteTrades: true, // ✅ EXECUTES with options
    allowedInstruments: ['stocks', 'etfs', 'options'],
    agentCount: 7,
    portfolioLimit: 250000,
    features: {
      autoRebalancing: true,
      optionsStrategies: true,
      taxLossHarvesting: true,
      customAgentTuning: false,
      apiAccess: false,
    },
  },
  partner: {
    tier: 'partner',
    price: 249,
    canExecuteTrades: true, // ✅ EXECUTES everything
    allowedInstruments: ['stocks', 'etfs', 'options', 'futures'],
    agentCount: 7,
    portfolioLimit: 0, // Unlimited
    features: {
      autoRebalancing: true,
      optionsStrategies: true,
      taxLossHarvesting: true,
      customAgentTuning: true,
      apiAccess: true,
    },
  },
};

/**
 * Check if a trade is allowed for this tier
 */
export function canExecuteTrade(tier: Tier, instrumentType: string): boolean {
  const permissions = TIER_PERMISSIONS[tier];
  
  if (!permissions.canExecuteTrades) {
    return false;
  }
  
  return permissions.allowedInstruments.includes(instrumentType.toLowerCase());
}

/**
 * Check if portfolio value exceeds tier limit
 */
export function isWithinPortfolioLimit(tier: Tier, portfolioValue: number): boolean {
  const permissions = TIER_PERMISSIONS[tier];
  
  if (permissions.portfolioLimit === 0) {
    return true; // Unlimited
  }
  
  return portfolioValue <= permissions.portfolioLimit;
}
