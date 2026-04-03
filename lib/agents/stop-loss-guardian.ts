/**
 * STOP LOSS GUARDIAN
 * 
 * Intelligent stop loss enforcement that respects trading style:
 * - Conservative/Moderate: Long-term focus, wider stops, daily checks
 * - Aggressive: Swing trades, moderate stops, hourly checks
 * - Ultra Aggressive: Day trades + LEAPs, tight intraday / wide on LEAPs
 * 
 * NO SPAM: Only notifies on actual stop triggers or near-stop warnings (once per day)
 */

import { query } from '../db';
import * as brokerService from '../services/broker-service';
import { getQuote } from '../polygon-data';
import { notifyTradeExecution } from '../notifications/trade-notifier';
import { loadUserPreferences, getPositionSizeGuidance } from './user-preferences-context';

/**
 * STOP LOSS CONFIGURATION
 * 
 * Philosophy:
 * - 0DTE day trades: -35% hard stop (moves fast, entries must be A+)
 * - Swing options (2-3 weeks): -50% hard stop, need full trade plan
 * - LEAPs (90+ DTE): WARN ONLY at -40%, no auto-stop (let them recover)
 * - Shares: WARN ONLY at -25%, no auto-stop (long-term holds)
 * 
 * Account size matters:
 * - Small accounts (<$2k): More lenient on allocation (can't diversify anyway)
 * - Medium accounts ($2k-$25k): Standard rules
 * - Large accounts (>$25k): Enforce diversification
 */

const STOP_LOSS_CONFIG = {
  // 0DTE / Same-day options - fast movers, need good entries
  dayTrade: { 
    stopPct: 35,      // Hard stop at -35%
    warnPct: 20,      // Warn at -20%
    autoStop: true,   // YES auto-execute
  },
  
  // Swing options (7-45 DTE) - need trade plan
  swingOption: { 
    stopPct: 50,      // Hard stop at -50%
    warnPct: 30,      // Warn at -30%
    autoStop: true,   // YES auto-execute
  },
  
  // LEAPs (90+ DTE) - let them breathe
  leap: { 
    stopPct: null,    // NO auto-stop
    warnPct: 40,      // Warn at -40%
    autoStop: false,  // WARN ONLY - user decides
  },
  
  // Shares - long-term holds
  stock: { 
    stopPct: null,    // NO auto-stop
    warnPct: 25,      // Warn at -25%
    autoStop: false,  // WARN ONLY - user decides
  },
};

// Account size thresholds for allocation flexibility
const ACCOUNT_SIZE_RULES = {
  micro: {      // < $500
    threshold: 500,
    maxPositionPct: 50,     // Can go 50% in one position
    maxPositions: 2,
  },
  small: {      // $500 - $2,000
    threshold: 2000,
    maxPositionPct: 35,     // 35% max per position
    maxPositions: 3,
  },
  medium: {     // $2,000 - $25,000
    threshold: 25000,
    maxPositionPct: 20,     // 20% max per position
    maxPositions: 5,
  },
  large: {      // > $25,000
    threshold: Infinity,
    maxPositionPct: 10,     // 10% max, enforce diversification
    maxPositions: 10,
  },
};

// Check interval - run every 15 min during market hours
// (catches 0DTE moves, LEAPs/shares only get warned not stopped)
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Track last warning sent to avoid spam
const lastWarnings: Map<string, number> = new Map();
const WARNING_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnlPct: number;
  assetType: 'stock' | 'option';
  openedAt?: string;
}

/**
 * Determine option DTE category
 */
function getOptionDTE(symbol: string): number {
  const match = symbol.match(/(\d{6})[CP]/);
  if (!match) return 30; // Default to swing
  
  const dateStr = match[1];
  const year = 2000 + parseInt(dateStr.slice(0, 2));
  const month = parseInt(dateStr.slice(2, 4)) - 1;
  const day = parseInt(dateStr.slice(4, 6));
  
  const expiry = new Date(year, month, day);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get position type for stop loss rules
 */
function getPositionType(position: Position): 'dayTrade' | 'swingOption' | 'leap' | 'stock' {
  // Stocks are simple
  if (position.assetType === 'stock') {
    return 'stock';
  }
  
  // Options - categorize by DTE
  const dte = getOptionDTE(position.symbol);
  
  if (dte <= 1) {
    return 'dayTrade';  // 0-1 DTE = day trade
  } else if (dte >= 90) {
    return 'leap';      // 90+ DTE = LEAP
  } else {
    return 'swingOption'; // 2-89 DTE = swing
  }
}

/**
 * Get the appropriate stop loss config for a position
 */
function getStopConfig(position: Position): { 
  stopPct: number | null; 
  warnPct: number; 
  autoStop: boolean;
  positionType: string;
} {
  const positionType = getPositionType(position);
  const config = STOP_LOSS_CONFIG[positionType];
  
  return {
    ...config,
    positionType,
  };
}

/**
 * Get allocation rules based on account size
 */
function getAccountSizeRules(portfolioValue: number): {
  maxPositionPct: number;
  maxPositions: number;
  tier: string;
} {
  if (portfolioValue < ACCOUNT_SIZE_RULES.micro.threshold) {
    return { ...ACCOUNT_SIZE_RULES.micro, tier: 'micro' };
  } else if (portfolioValue < ACCOUNT_SIZE_RULES.small.threshold) {
    return { ...ACCOUNT_SIZE_RULES.small, tier: 'small' };
  } else if (portfolioValue < ACCOUNT_SIZE_RULES.medium.threshold) {
    return { ...ACCOUNT_SIZE_RULES.medium, tier: 'medium' };
  } else {
    return { ...ACCOUNT_SIZE_RULES.large, tier: 'large' };
  }
}

/**
 * Check if we should send a warning (respects cooldown)
 */
function shouldWarn(userId: string, symbol: string): boolean {
  const key = `${userId}-${symbol}`;
  const lastWarning = lastWarnings.get(key);
  
  if (!lastWarning) return true;
  return Date.now() - lastWarning > WARNING_COOLDOWN_MS;
}

/**
 * Mark warning as sent
 */
function markWarned(userId: string, symbol: string): void {
  const key = `${userId}-${symbol}`;
  lastWarnings.set(key, Date.now());
}

/**
 * Run stop loss check for a single user
 */
async function checkUserStopLosses(userId: string): Promise<{
  checked: number;
  warnings: number;
  stops: number;
}> {
  const results = { checked: 0, warnings: 0, stops: 0 };
  
  try {
    // Get user preferences
    const prefs = await loadUserPreferences(userId);
    if (!prefs) return results;
    
    const riskProfile = prefs.riskProfile || 'moderate';
    
    // Get portfolio
    const portfolio = await brokerService.fetchUserPortfolio(userId);
    if (!portfolio || !portfolio.positions) return results;
    
    for (const pos of portfolio.positions) {
      results.checked++;
      
      const position: Position = {
        symbol: pos.symbol,
        qty: pos.qty,
        avgEntryPrice: pos.avgEntryPrice,
        currentPrice: pos.currentPrice,
        unrealizedPnlPct: pos.unrealizedPnlPct,
        assetType: pos.symbol.length > 10 ? 'option' : 'stock',
        openedAt: pos.openedAt,
      };
      
      const stopConfig = getStopConfig(position);
      const lossPct = -position.unrealizedPnlPct; // Convert to positive loss
      
      // Check if stop hit AND this type auto-stops
      if (stopConfig.autoStop && stopConfig.stopPct && lossPct >= stopConfig.stopPct) {
        console.log(`[StopGuardian] STOP HIT: ${position.symbol} (${stopConfig.positionType}) down ${lossPct.toFixed(1)}% (limit: ${stopConfig.stopPct}%)`);
        
        // Execute the stop
        try {
          await brokerService.executeUserTrade(userId, {
            symbol: position.symbol,
            action: 'sell',
            qty: position.qty,
            reason: `Stop loss triggered at -${lossPct.toFixed(1)}%`,
          });
          
          results.stops++;
          
          // Notify user (this is important, not spam)
          await notifyTradeExecution(userId, {
            symbol: position.symbol,
            action: 'STOP LOSS',
            qty: position.qty,
            reason: `Automatic stop loss executed on ${stopConfig.positionType}. Position was down ${lossPct.toFixed(1)}% (limit: ${stopConfig.stopPct}%)`,
          });
          
          // Log to DB
          await query(
            `INSERT INTO trade_logs (user_id, symbol, action, quantity, reason, status, created_at)
             VALUES ($1, $2, 'stop_loss', $3, $4, 'executed', NOW())`,
            [userId, position.symbol, position.qty, `${stopConfig.positionType} stop at -${lossPct.toFixed(1)}%`]
          );
          
        } catch (execErr: any) {
          console.error(`[StopGuardian] Failed to execute stop for ${position.symbol}:`, execErr.message);
        }
        
      // Check if approaching warning threshold (once per day)
      } else if (lossPct >= stopConfig.warnPct && shouldWarn(userId, position.symbol)) {
        const actionType = stopConfig.autoStop ? 'STOP WARNING' : 'POSITION ALERT';
        const message = stopConfig.autoStop
          ? `${stopConfig.positionType} approaching stop. Down ${lossPct.toFixed(1)}% (auto-stop at ${stopConfig.stopPct}%).`
          : `${stopConfig.positionType} down ${lossPct.toFixed(1)}%. Review position - no auto-stop for this type.`;
        
        console.log(`[StopGuardian] ${actionType}: ${position.symbol} (${stopConfig.positionType}) down ${lossPct.toFixed(1)}%`);
        
        results.warnings++;
        markWarned(userId, position.symbol);
        
        // Send warning notification (once per day max)
        await notifyTradeExecution(userId, {
          symbol: position.symbol,
          action: actionType,
          qty: position.qty,
          reason: message,
        });
      }
    }
    
  } catch (error: any) {
    console.error(`[StopGuardian] Error checking user ${userId}:`, error.message);
  }
  
  return results;
}

/**
 * Run stop loss guardian for all eligible users
 */
export async function runStopLossGuardian(): Promise<{
  usersChecked: number;
  positionsChecked: number;
  warnings: number;
  stopsExecuted: number;
}> {
  console.log('[StopGuardian] Starting stop loss check...');
  
  const totals = {
    usersChecked: 0,
    positionsChecked: 0,
    warnings: 0,
    stopsExecuted: 0,
  };
  
  try {
    // Get users with auto-execute enabled and broker connected
    const users = await query(`
      SELECT id, email, risk_profile 
      FROM users 
      WHERE auto_execute_enabled = true 
        AND snaptrade_user_id IS NOT NULL
    `);
    
    for (const user of users.rows) {
      const result = await checkUserStopLosses(user.id);
      totals.usersChecked++;
      totals.positionsChecked += result.checked;
      totals.warnings += result.warnings;
      totals.stopsExecuted += result.stops;
    }
    
  } catch (error: any) {
    console.error('[StopGuardian] Error:', error.message);
  }
  
  console.log(`[StopGuardian] Complete: ${totals.usersChecked} users, ${totals.positionsChecked} positions, ${totals.warnings} warnings, ${totals.stopsExecuted} stops`);
  
  return totals;
}

export { getAccountSizeRules };

export default {
  runStopLossGuardian,
  checkUserStopLosses,
  getAccountSizeRules,
  ACCOUNT_SIZE_RULES,
};
