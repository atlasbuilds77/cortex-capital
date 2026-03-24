/**
 * CORTEX CAPITAL - USER PREFERENCES TYPES
 * Makes us BETTER than Betterment/Wealthfront/M1
 * 
 * Users don't just pick risk - they tell us what they LOVE
 * We build them a custom AI-managed portfolio
 */

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export type InvestmentGoal = 
  | 'retirement'        // Long-term, steady growth
  | 'wealth_building'   // Capital appreciation
  | 'short_term'        // <3 years, preserve capital
  | 'income'            // Dividend focus
  | 'speculation';      // High risk/reward

export type TimeHorizon = 
  | '1-3 years'
  | '3-5 years'
  | '5-10 years'
  | '10+ years';

export type DividendPreference = 
  | 'none'   // Growth only
  | 'some'   // Balanced
  | 'focus'; // Income priority

export type OptionsComfort = 
  | 'none'          // No options
  | 'leaps_only'    // Long-term LEAPS only
  | 'full_options'; // All strategies (spreads, covered calls)

/**
 * SECTORS - What industries do they care about?
 */
export const AVAILABLE_SECTORS = [
  'technology',
  'healthcare',
  'financials',
  'consumer_discretionary',
  'consumer_staples',
  'industrials',
  'energy',
  'materials',
  'real_estate',
  'utilities',
  'communication_services',
  'clean_energy',
  'biotechnology',
  'semiconductors',
  'cloud_computing',
  'cybersecurity',
  'ev_batteries',
  'space_tech',
] as const;

export type Sector = typeof AVAILABLE_SECTORS[number];

/**
 * THEMES - What narratives drive their investment thesis?
 */
export const AVAILABLE_THEMES = [
  'ai_and_ml',
  'electric_vehicles',
  'renewable_energy',
  'cloud_computing',
  'cybersecurity',
  'genomics',
  'fintech',
  'space_exploration',
  'robotics',
  'quantum_computing',
  'dividend_aristocrats',
  'value_investing',
  'growth_investing',
  'small_cap_growth',
  'turnaround_plays',
  'emerging_markets',
  'inflation_hedges',
  'crypto_exposure',
] as const;

export type Theme = typeof AVAILABLE_THEMES[number];

/**
 * EXCLUSIONS - ESG / Values-based investing
 */
export const AVAILABLE_EXCLUSIONS = [
  'fossil_fuels',
  'tobacco',
  'alcohol',
  'gambling',
  'weapons',
  'private_prisons',
  'animal_testing',
  'factory_farming',
  'controversial_countries',
] as const;

export type Exclusion = typeof AVAILABLE_EXCLUSIONS[number];

/**
 * MAIN PREFERENCES INTERFACE
 * Everything we need to build their PERFECT portfolio
 */
export interface UserPreferences {
  // === BASIC PROFILE ===
  risk_profile: RiskProfile;
  goal: InvestmentGoal;
  time_horizon: TimeHorizon;

  // === INTERESTS (What they LOVE) ===
  sectors: Sector[];           // Industries they want exposure to
  themes: Theme[];             // Investment narratives they believe in

  // === CUSTOM PICKS (The DIFFERENTIATOR) ===
  must_have_stocks: string[];  // Stocks they WANT (e.g., RIVN, SOFI, HIMS)
  excluded_stocks: string[];   // Specific stocks to AVOID
  excluded_sectors: Exclusion[]; // ESG exclusions

  // === INCOME PREFERENCES ===
  dividend_preference: DividendPreference;
  covered_calls_interest: boolean;  // Generate extra income via covered calls?

  // === OPTIONS (Tier 2-3) ===
  options_comfort: OptionsComfort;
  max_options_allocation: number;  // 0-40% (percentage of portfolio)

  // === DAY TRADING (Tier 3 only) ===
  day_trading_interest: boolean;
  max_daily_risk: number;  // 1-5% (percentage per day trade)
}

/**
 * STOCK QUALITY SCORE
 * When users add custom picks, we validate them
 */
export interface StockAnalysis {
  symbol: string;
  quality_score: number;  // 0-100
  investable: boolean;    // Can we buy this?
  
  // Fundamentals check
  fundamentals: {
    market_cap: number;
    pe_ratio: number | null;
    revenue_growth: number | null;
    debt_to_equity: number | null;
    profitability: boolean;
  };
  
  // Liquidity check
  liquidity: {
    avg_volume: number;
    bid_ask_spread: number;
    tradeable: boolean;
  };
  
  // Options availability (for LEAPS)
  options: {
    available: boolean;
    has_weeklies: boolean;
    has_leaps: boolean;
    open_interest: number;
  };
  
  // Risk warnings
  warnings: string[];
  
  // Recommendations
  alternatives: string[];  // "You like RIVN? Consider TSLA, F"
}

/**
 * ONBOARDING PROGRESS TRACKING
 */
export interface OnboardingProgress {
  user_id: string;
  current_step: number;
  total_steps: number;
  completed_steps: string[];
  
  // Step data
  step_data: {
    basic_info?: { name: string; email: string };
    risk_assessment?: { answers: Record<string, string> };
    goals?: { goal: InvestmentGoal; time_horizon: TimeHorizon };
    sectors?: { selected: Sector[] };
    themes?: { selected: Theme[] };
    custom_stocks?: { symbols: string[] };
    exclusions?: { selected: Exclusion[] };
    income?: { 
      dividend_preference: DividendPreference;
      covered_calls_interest: boolean;
    };
    options?: { 
      comfort: OptionsComfort;
      max_allocation: number;
    };
    day_trading?: {
      interest: boolean;
      max_risk: number;
    };
  };
  
  // Generated preview
  preview_portfolio?: {
    recommended_tier: 'recovery' | 'scout' | 'operator' | 'partner';
    allocation: Record<string, number>;
    expected_return: number;
    expected_volatility: number;
    holdings_count: number;
  };
  
  created_at: Date;
  updated_at: Date;
}

/**
 * TIER REQUIREMENTS
 * What features unlock at each tier?
 */
export interface TierRequirements {
  tier: 'recovery' | 'scout' | 'operator' | 'partner';
  price: number;
  features: {
    instruments: string[];           // ['ETFs only'] vs ['stocks', 'ETFs', 'LEAPS']
    custom_picks_allowed: boolean;   // Can they add RIVN/SOFI?
    options_allowed: boolean;        // LEAPS, spreads, covered calls?
    day_trading_allowed: boolean;    // Intraday plays?
    rebalancing: string;             // 'quarterly' vs 'weekly' vs 'none'
    fishtank_access?: boolean;       // Can watch AI agents discuss (recovery tier)
    educational_content?: boolean;   // Access to educational materials (recovery tier)
    trade_execution?: boolean;       // Can execute trades (false for recovery tier)
  };
}

export const TIER_CONFIG: Record<'recovery' | 'scout' | 'operator' | 'partner', TierRequirements> = {
  recovery: {
    tier: 'recovery',
    price: 29,
    features: {
      instruments: ['View-only'],
      custom_picks_allowed: false,
      options_allowed: false,
      day_trading_allowed: false,
      rebalancing: 'none',
      fishtank_access: true,  // Can watch agents discuss
      educational_content: true,
      trade_execution: false  // No actual trading
    },
  },
  scout: {
    tier: 'scout',
    price: 49,
    features: {
      instruments: ['ETFs only'],
      custom_picks_allowed: false,
      options_allowed: false,
      day_trading_allowed: false,
      rebalancing: 'quarterly',
    },
  },
  operator: {
    tier: 'operator',
    price: 99,
    features: {
      instruments: ['ETFs', 'Stocks', 'LEAPS'],
      custom_picks_allowed: true,
      options_allowed: true,  // LEAPS only
      day_trading_allowed: false,
      rebalancing: 'monthly',
    },
  },
  partner: {
    tier: 'partner',
    price: 249,
    features: {
      instruments: ['ETFs', 'Stocks', 'LEAPS', 'Spreads', 'Covered Calls'],
      custom_picks_allowed: true,
      options_allowed: true,  // Full options
      day_trading_allowed: true,
      rebalancing: 'weekly',
    },
  },
};

/**
 * DEFAULT PREFERENCES
 * Sensible starting point
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  risk_profile: 'moderate',
  goal: 'wealth_building',
  time_horizon: '10+ years',
  sectors: ['technology', 'healthcare'],
  themes: ['ai_and_ml', 'growth_investing'],
  must_have_stocks: [],
  excluded_stocks: [],
  excluded_sectors: [],
  dividend_preference: 'some',
  covered_calls_interest: false,
  options_comfort: 'none',
  max_options_allocation: 0,
  day_trading_interest: false,
  max_daily_risk: 0,
};
