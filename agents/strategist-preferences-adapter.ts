/**
 * CORTEX CAPITAL - STRATEGIST PREFERENCES ADAPTER
 * Bridges the new preference system with the existing STRATEGIST agent
 * 
 * This adapter:
 * - Loads UserPreferences from database
 * - Converts to STRATEGIST-compatible format
 * - Injects custom picks into rebalancing logic
 * - Applies ESG exclusions
 * - Respects tier limitations
 */

import type { UserPreferences as NewUserPreferences } from '../lib/preferences';
import type { UserPreferences as OldUserPreferences } from './strategist';
import { buildPortfolio } from '../lib/portfolio-builder';
import { analyzeStock } from '../lib/stock-analyzer';

/**
 * LOAD USER PREFERENCES
 */
export async function loadUserPreferences(userId: string): Promise<NewUserPreferences> {
  // TODO: Load from database
  // SELECT * FROM user_preferences WHERE user_id = $1
  
  // Mock for now
  return {
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
}

/**
 * CONVERT TO OLD FORMAT
 * STRATEGIST still uses the old UserPreferences interface
 */
export function convertToOldFormat(
  newPrefs: NewUserPreferences
): OldUserPreferences {
  // Map time_horizon to investment_horizon
  const investment_horizon = 
    newPrefs.time_horizon === '1-3 years' ? 'short' :
    newPrefs.time_horizon === '3-5 years' ? 'medium' : 'long';
  
  return {
    risk_profile: newPrefs.risk_profile,
    investment_horizon,
    constraints: {
      never_sell: newPrefs.must_have_stocks,  // Don't sell user's custom picks
      max_position_size: 25,  // Default
      max_sector_exposure: 40,  // Default
    },
  };
}

/**
 * GET TIER FOR USER
 */
export async function getUserTier(userId: string): Promise<'scout' | 'operator' | 'partner'> {
  // TODO: Load from database
  // SELECT tier FROM users WHERE id = $1
  return 'operator';
}

/**
 * GENERATE TARGET ALLOCATION
 * Uses the new portfolio builder instead of hardcoded allocations
 */
export async function generateTargetAllocation(
  userId: string,
  newPrefs: NewUserPreferences
): Promise<{
  stocks: string[];
  allocations: Record<string, number>;
  reasoning: string[];
}> {
  const tier = await getUserTier(userId);
  const portfolio = await buildPortfolio(newPrefs, tier);
  
  const stocks: string[] = [];
  const allocations: Record<string, number> = {};
  const reasoning: string[] = [];
  
  portfolio.allocations.forEach(alloc => {
    stocks.push(alloc.symbol);
    allocations[alloc.symbol] = alloc.allocation_percentage;
    reasoning.push(`${alloc.symbol} (${alloc.allocation_percentage.toFixed(1)}%): ${alloc.reasoning}`);
  });
  
  return { stocks, allocations, reasoning };
}

/**
 * FILTER EXCLUSIONS
 * Remove stocks/sectors based on ESG preferences
 */
export function applyExclusions(
  positions: Array<{ ticker: string; sector?: string }>,
  prefs: NewUserPreferences
): Array<{ ticker: string; excluded: boolean; reason?: string }> {
  return positions.map(pos => {
    // Check excluded stocks
    if (prefs.excluded_stocks.includes(pos.ticker)) {
      return {
        ticker: pos.ticker,
        excluded: true,
        reason: 'Manually excluded by user',
      };
    }
    
    // Check excluded sectors (ESG)
    if (pos.sector && prefs.excluded_sectors.some(s => pos.sector?.toLowerCase().includes(s))) {
      return {
        ticker: pos.ticker,
        excluded: true,
        reason: `ESG exclusion: ${pos.sector}`,
      };
    }
    
    return {
      ticker: pos.ticker,
      excluded: false,
    };
  });
}

/**
 * VALIDATE CUSTOM PICKS
 * Before adding to portfolio, ensure they pass quality checks
 */
export async function validateCustomPicks(
  symbols: string[]
): Promise<Record<string, { approved: boolean; reason: string }>> {
  const results: Record<string, { approved: boolean; reason: string }> = {};
  
  for (const symbol of symbols) {
    const analysis = await analyzeStock(symbol);
    
    if (analysis.investable) {
      results[symbol] = {
        approved: true,
        reason: `Quality score: ${analysis.quality_score}/100`,
      };
    } else {
      results[symbol] = {
        approved: false,
        reason: `Quality score too low: ${analysis.quality_score}/100. ${analysis.warnings.join(', ')}`,
      };
    }
  }
  
  return results;
}

/**
 * INJECT CUSTOM PICKS INTO REBALANCING
 * Ensures user's must-have stocks are included
 */
export function injectCustomPicks(
  currentPositions: Array<{ ticker: string; shares: number; value: number }>,
  mustHaveStocks: string[],
  totalPortfolioValue: number,
  targetAllocationPerPick: number = 5  // Default 5% each
): Array<{ ticker: string; action: 'buy' | 'hold'; target_value: number; reasoning: string }> {
  const instructions: Array<{ ticker: string; action: 'buy' | 'hold'; target_value: number; reasoning: string }> = [];
  
  mustHaveStocks.forEach(ticker => {
    const currentPosition = currentPositions.find(p => p.ticker === ticker);
    const targetValue = (totalPortfolioValue * targetAllocationPerPick) / 100;
    
    if (!currentPosition) {
      // Need to buy
      instructions.push({
        ticker,
        action: 'buy',
        target_value: targetValue,
        reasoning: 'User custom pick - not currently in portfolio',
      });
    } else if (currentPosition.value < targetValue * 0.9) {
      // Underweight, buy more
      instructions.push({
        ticker,
        action: 'buy',
        target_value: targetValue,
        reasoning: 'User custom pick - currently underweight',
      });
    } else {
      // Hold
      instructions.push({
        ticker,
        action: 'hold',
        target_value: currentPosition.value,
        reasoning: 'User custom pick - at target allocation',
      });
    }
  });
  
  return instructions;
}

/**
 * MAIN ENHANCED STRATEGIST FUNCTION
 * Wraps the original STRATEGIST with preferences awareness
 */
export async function generateEnhancedRebalancingPlan(
  userId: string,
  currentPositions: Array<{ ticker: string; shares: number; value: number; sector?: string }>,
  totalPortfolioValue: number
): Promise<{
  target_allocation: Record<string, number>;
  trades: Array<{ ticker: string; action: 'buy' | 'sell'; target_value: number; reasoning: string }>;
  exclusions: Array<{ ticker: string; reason: string }>;
  custom_picks_status: Record<string, { approved: boolean; reason: string }>;
  warnings: string[];
}> {
  // Load preferences
  const prefs = await loadUserPreferences(userId);
  
  // Apply exclusions first
  const exclusionCheck = applyExclusions(currentPositions, prefs);
  const excludedPositions = exclusionCheck.filter(e => e.excluded);
  
  // Validate custom picks
  const customPicksStatus = await validateCustomPicks(prefs.must_have_stocks);
  const approvedPicks = Object.entries(customPicksStatus)
    .filter(([_, status]) => status.approved)
    .map(([symbol, _]) => symbol);
  
  // Generate target allocation using new portfolio builder
  const { stocks, allocations, reasoning } = await generateTargetAllocation(userId, prefs);
  
  // Inject custom picks
  const customPickInstructions = injectCustomPicks(
    currentPositions,
    approvedPicks,
    totalPortfolioValue
  );
  
  // Merge with target allocation - only include actionable trades (buy/sell), filter out 'hold'
  const actionableTrades = customPickInstructions
    .filter(t => t.action === 'buy')
    .map(t => ({ ...t, action: t.action as 'buy' | 'sell' }));
  
  const allTrades: Array<{ ticker: string; action: 'buy' | 'sell'; target_value: number; reasoning: string }> = [
    ...actionableTrades,
    // Add other rebalancing trades from portfolio builder
  ];
  
  // Generate warnings
  const warnings: string[] = [];
  
  if (excludedPositions.length > 0) {
    warnings.push(`${excludedPositions.length} position(s) excluded based on your preferences`);
  }
  
  const rejectedPicks = Object.entries(customPicksStatus)
    .filter(([_, status]) => !status.approved);
  
  if (rejectedPicks.length > 0) {
    warnings.push(`${rejectedPicks.length} custom pick(s) rejected due to low quality score`);
  }
  
  return {
    target_allocation: allocations,
    trades: allTrades,
    exclusions: excludedPositions.map(e => ({ ticker: e.ticker, reason: e.reason || 'Unknown' })),
    custom_picks_status: customPicksStatus,
    warnings,
  };
}

/**
 * USAGE EXAMPLE:
 * 
 * ```typescript
 * import { generateEnhancedRebalancingPlan } from './strategist-preferences-adapter';
 * 
 * const plan = await generateEnhancedRebalancingPlan(
 *   userId,
 *   currentPositions,
 *   totalPortfolioValue
 * );
 * 
 * console.log('Target allocation:', plan.target_allocation);
 * console.log('Trades:', plan.trades);
 * console.log('Exclusions:', plan.exclusions);
 * console.log('Custom picks:', plan.custom_picks_status);
 * console.log('Warnings:', plan.warnings);
 * ```
 */
