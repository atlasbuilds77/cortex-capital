/**
 * APPROVAL CHECKER
 * 
 * Determines if a trade requires user approval based on:
 * 1. User's approval settings (toggles)
 * 2. Trade characteristics (size, type, etc.)
 */

import { db } from '../db';
import { TradeData, ApprovalReason, ApprovalSettings, DEFAULT_APPROVAL_SETTINGS } from './types';

interface ApprovalCheckResult {
  requiresApproval: boolean;
  reasons: ApprovalReason[];
}

/**
 * Get user's approval settings
 */
export async function getUserApprovalSettings(userId: string): Promise<ApprovalSettings> {
  try {
    const result = await db.query(
      `SELECT approval_settings FROM user_trading_settings WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].approval_settings) {
      return DEFAULT_APPROVAL_SETTINGS;
    }
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_APPROVAL_SETTINGS,
      ...result.rows[0].approval_settings,
    };
  } catch (error) {
    console.error('[ApprovalChecker] Error fetching settings:', error);
    return DEFAULT_APPROVAL_SETTINGS;
  }
}

/**
 * Check if user has traded this symbol before
 */
async function hasUserTradedSymbol(userId: string, symbol: string): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT 1 FROM trade_logs 
       WHERE user_id = $1 AND symbol = $2 AND status = 'executed'
       LIMIT 1`,
      [userId, symbol.toUpperCase()]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[ApprovalChecker] Error checking trade history:', error);
    return true; // Assume they have to avoid blocking
  }
}

/**
 * Check if a trade requires approval
 */
export async function checkTradeApproval(
  userId: string,
  trade: TradeData
): Promise<ApprovalCheckResult> {
  const settings = await getUserApprovalSettings(userId);
  const reasons: ApprovalReason[] = [];
  
  // Check: Options trade
  if (settings.requireOptions && trade.isOption) {
    reasons.push('options_trade');
  }
  
  // Check: Large position (>X% of portfolio)
  if (settings.requireLargePositions && trade.portfolioPercentage) {
    if (trade.portfolioPercentage > settings.largePositionThresholdPct) {
      reasons.push('large_position');
    }
  }
  
  // Check: New symbol
  if (settings.requireNewSymbols) {
    const hasTradedBefore = await hasUserTradedSymbol(userId, trade.symbol);
    if (!hasTradedBefore) {
      reasons.push('new_symbol');
    }
  }
  
  // Check: Day trade (0DTE)
  if (settings.requireDayTrades && trade.isOption && trade.dte !== undefined && trade.dte <= 1) {
    reasons.push('day_trade');
  }
  
  // Check: Short position
  if (settings.requireShorts && trade.direction === 'short') {
    reasons.push('short_position');
  }
  
  return {
    requiresApproval: reasons.length > 0,
    reasons,
  };
}

/**
 * Quick check - just returns boolean
 */
export async function needsApproval(userId: string, trade: TradeData): Promise<boolean> {
  const result = await checkTradeApproval(userId, trade);
  return result.requiresApproval;
}

export default {
  getUserApprovalSettings,
  checkTradeApproval,
  needsApproval,
};
