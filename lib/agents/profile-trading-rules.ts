/**
 * PROFILE TRADING RULES
 * 
 * Defines what each risk profile is allowed to trade.
 * This is the GATE before any signal gets to the agents.
 */

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';

export interface TradingRules {
  // What's allowed
  allowShares: boolean;
  allowSwingOptions: boolean;  // 2 weeks to 6 months
  allowLeaps: boolean;         // 6+ months
  allowDayTrades: boolean;     // 0DTE, same-day
  allowShorts: boolean;        // Short selling / puts
  
  // Position limits
  maxPositionPct: number;      // Max % of portfolio per position
  maxOptionsAllocation: number; // Max % of portfolio in options total
  minDTE: number;              // Minimum days to expiry for options
  maxDTE: number;              // Maximum days to expiry
  
  // Frequency
  maxTradesPerWeek: number;
  maxTradesPerDay: number;
  
  // Win rate threshold to act on signals
  minSignalWinRate: number;    // Only act on signals with this historical WR
  
  // Description for agents
  tradingStyle: string;
}

export const PROFILE_TRADING_RULES: Record<RiskProfile, TradingRules> = {
  
  // ============================================
  // CONSERVATIVE: Buy and hold, shares only
  // Goal: Preserve capital, steady growth
  // ============================================
  conservative: {
    allowShares: true,
    allowSwingOptions: false,
    allowLeaps: false,
    allowDayTrades: false,
    allowShorts: false,
    
    maxPositionPct: 5,
    maxOptionsAllocation: 0,
    minDTE: 0,
    maxDTE: 0,
    
    maxTradesPerWeek: 2,
    maxTradesPerDay: 1,
    
    minSignalWinRate: 70, // Only act on very high probability
    
    tradingStyle: `CONSERVATIVE RULES:
- Shares ONLY (no options, no day trading)
- Buy quality companies, hold long-term
- Max 5% per position
- Max 2 trades per week
- No shorting, no speculation
- Focus: Capital preservation + dividends`,
  },
  
  // ============================================
  // MODERATE: Shares + Swing options
  // Goal: Balanced growth with some active management
  // ============================================
  moderate: {
    allowShares: true,
    allowSwingOptions: true,  // 2 weeks to 6 months
    allowLeaps: true,
    allowDayTrades: false,    // No day trading
    allowShorts: false,       // No shorting
    
    maxPositionPct: 7,
    maxOptionsAllocation: 20, // Max 20% in options
    minDTE: 14,               // Minimum 2 weeks out
    maxDTE: 180,              // Max 6 months
    
    maxTradesPerWeek: 5,
    maxTradesPerDay: 2,
    
    minSignalWinRate: 60,
    
    tradingStyle: `MODERATE RULES:
- Shares + Swing options (2 weeks to 6 months)
- LEAPs allowed for long-term leverage
- NO day trading, NO shorting
- Max 7% per position
- Max 20% total in options
- Options must be 14+ DTE
- Focus: Growth with managed risk`,
  },
  
  // ============================================
  // AGGRESSIVE: Shares + Swings + LEAPs
  // Goal: Alpha generation, active trading
  // ============================================
  aggressive: {
    allowShares: true,
    allowSwingOptions: true,   // Yes - 2 weeks to 6 months
    allowLeaps: true,          // Yes - long term leverage
    allowDayTrades: false,     // NO day trading (too risky without edge)
    allowShorts: true,         // Can short via puts
    
    maxPositionPct: 12,
    maxOptionsAllocation: 40,  // Up to 40% in options
    minDTE: 14,                // Still require 2 weeks minimum
    maxDTE: 365,               // Up to 1 year
    
    maxTradesPerWeek: 10,
    maxTradesPerDay: 3,
    
    minSignalWinRate: 55,
    
    tradingStyle: `AGGRESSIVE RULES:
- Shares + Swing options + LEAPs
- Shorting allowed via puts
- NO day trading (0DTE) - swings only
- Max 12% per position
- Max 40% total in options
- Options must be 14+ DTE
- Focus: Alpha generation, concentrated bets`,
  },
  
  // ============================================
  // ULTRA AGGRESSIVE: Everything including day trades
  // Goal: Maximum income generation
  // ============================================
  ultra_aggressive: {
    allowShares: true,
    allowSwingOptions: true,
    allowLeaps: true,
    allowDayTrades: true,      // YES - 0DTE allowed (but rare, high bar)
    allowShorts: true,
    
    maxPositionPct: 20,
    maxOptionsAllocation: 70,  // Up to 70% in options
    minDTE: 0,                 // 0DTE allowed
    maxDTE: 730,               // Up to 2 years
    
    maxTradesPerWeek: 20,
    maxTradesPerDay: 5,
    
    minSignalWinRate: 65,      // HIGHER bar for day trades - must be right
    
    tradingStyle: `ULTRA AGGRESSIVE RULES:
- ALL strategies allowed including 0DTE day trades
- Day trades are RARE - only on A+ setups (65%+ WR signals)
- Shorting via puts allowed
- Max 20% per position
- Max 70% in options
- Goal: Income generation, asymmetric bets
- You MUST be right on day trades - no gambling`,
  },
};

/**
 * Check if a trade type is allowed for a profile
 */
export function isTradeAllowed(
  profile: RiskProfile,
  tradeType: 'shares' | 'swing_option' | 'leap' | 'day_trade' | 'short',
  signalWinRate?: number
): { allowed: boolean; reason?: string } {
  const rules = PROFILE_TRADING_RULES[profile];
  
  // Check signal win rate if provided
  if (signalWinRate !== undefined && signalWinRate < rules.minSignalWinRate) {
    return { 
      allowed: false, 
      reason: `Signal win rate ${signalWinRate}% below minimum ${rules.minSignalWinRate}% for ${profile} profile` 
    };
  }
  
  switch (tradeType) {
    case 'shares':
      return { allowed: rules.allowShares };
    case 'swing_option':
      return { allowed: rules.allowSwingOptions };
    case 'leap':
      return { allowed: rules.allowLeaps };
    case 'day_trade':
      if (!rules.allowDayTrades) {
        return { allowed: false, reason: `Day trading not allowed for ${profile} profile` };
      }
      // Extra high bar for day trades
      if (signalWinRate !== undefined && signalWinRate < 65) {
        return { allowed: false, reason: `Day trades require 65%+ win rate signal, got ${signalWinRate}%` };
      }
      return { allowed: true };
    case 'short':
      return { 
        allowed: rules.allowShorts,
        reason: rules.allowShorts ? undefined : `Shorting not allowed for ${profile} profile`
      };
    default:
      return { allowed: false, reason: 'Unknown trade type' };
  }
}

/**
 * Classify an option by DTE
 */
export function classifyOptionByDTE(dte: number): 'day_trade' | 'swing_option' | 'leap' {
  if (dte <= 1) return 'day_trade';
  if (dte <= 180) return 'swing_option';  // 6 months
  return 'leap';
}

/**
 * Check if option DTE is within profile rules
 */
export function isDTEAllowed(profile: RiskProfile, dte: number): { allowed: boolean; reason?: string } {
  const rules = PROFILE_TRADING_RULES[profile];
  
  if (dte < rules.minDTE) {
    return { 
      allowed: false, 
      reason: `DTE ${dte} below minimum ${rules.minDTE} for ${profile} profile` 
    };
  }
  
  if (dte > rules.maxDTE) {
    return { 
      allowed: false, 
      reason: `DTE ${dte} above maximum ${rules.maxDTE} for ${profile} profile` 
    };
  }
  
  return { allowed: true };
}

/**
 * Get trading rules summary for agent context
 */
export function getTradingRulesContext(profile: RiskProfile): string {
  return PROFILE_TRADING_RULES[profile].tradingStyle;
}

/**
 * Filter signals based on profile rules
 */
export function filterSignalsForProfile(
  signals: Array<{
    symbol: string;
    direction: 'long' | 'short';
    type: 'shares' | 'swing_option' | 'leap' | 'day_trade';
    winRate?: number;
    dte?: number;
  }>,
  profile: RiskProfile
): Array<{ signal: any; allowed: boolean; reason?: string }> {
  return signals.map(signal => {
    // Check if trade type allowed
    const typeCheck = isTradeAllowed(profile, signal.type, signal.winRate);
    if (!typeCheck.allowed) {
      return { signal, allowed: false, reason: typeCheck.reason };
    }
    
    // Check if shorting allowed (for short direction)
    if (signal.direction === 'short') {
      const shortCheck = isTradeAllowed(profile, 'short');
      if (!shortCheck.allowed) {
        return { signal, allowed: false, reason: shortCheck.reason };
      }
    }
    
    // Check DTE for options
    if (signal.dte !== undefined) {
      const dteCheck = isDTEAllowed(profile, signal.dte);
      if (!dteCheck.allowed) {
        return { signal, allowed: false, reason: dteCheck.reason };
      }
    }
    
    return { signal, allowed: true };
  });
}

export default {
  PROFILE_TRADING_RULES,
  isTradeAllowed,
  classifyOptionByDTE,
  isDTEAllowed,
  getTradingRulesContext,
  filterSignalsForProfile,
};
