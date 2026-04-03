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

// Stop loss percentages by risk profile and position type
const STOP_LOSS_CONFIG = {
  conservative: {
    stock: { stopPct: 7, warnPct: 5 },      // Long-term holds
    option: { stopPct: 40, warnPct: 30 },    // Protective, wider stops
    leap: { stopPct: 25, warnPct: 20 },      // LEAPs get more room
  },
  moderate: {
    stock: { stopPct: 10, warnPct: 7 },
    option: { stopPct: 50, warnPct: 35 },
    leap: { stopPct: 30, warnPct: 20 },
  },
  aggressive: {
    stock: { stopPct: 12, warnPct: 8 },
    option: { stopPct: 50, warnPct: 35 },
    leap: { stopPct: 35, warnPct: 25 },
  },
  ultra_aggressive: {
    stock: { stopPct: 15, warnPct: 10 },
    option: { stopPct: 50, warnPct: 35 },    // Day trade options - standard
    leap: { stopPct: 40, warnPct: 30 },      // LEAPs get wide berth
    dayTrade: { stopPct: 5, warnPct: 3 },    // Tight intraday stops
  },
};

// How often to check by risk profile (in minutes)
const CHECK_INTERVALS = {
  conservative: 240,    // Every 4 hours
  moderate: 120,        // Every 2 hours
  aggressive: 60,       // Every hour
  ultra_aggressive: 15, // Every 15 min for day trades
};

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
  isLeap?: boolean;
  isDayTrade?: boolean;
  openedAt?: string;
}

/**
 * Determine if an option is a LEAP (>90 days to expiry)
 */
function isLeap(symbol: string): boolean {
  // Option symbols: AAPL240419C00150000
  // Extract expiry date from symbol
  const match = symbol.match(/(\d{6})[CP]/);
  if (!match) return false;
  
  const dateStr = match[1];
  const year = 2000 + parseInt(dateStr.slice(0, 2));
  const month = parseInt(dateStr.slice(2, 4)) - 1;
  const day = parseInt(dateStr.slice(4, 6));
  
  const expiry = new Date(year, month, day);
  const now = new Date();
  const daysToExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysToExpiry > 90;
}

/**
 * Determine if position was opened today (day trade)
 */
function isDayTrade(openedAt?: string): boolean {
  if (!openedAt) return false;
  
  const opened = new Date(openedAt);
  const now = new Date();
  
  return opened.toDateString() === now.toDateString();
}

/**
 * Get the appropriate stop loss config for a position
 */
function getStopConfig(
  position: Position, 
  riskProfile: string
): { stopPct: number; warnPct: number } {
  const config = STOP_LOSS_CONFIG[riskProfile as keyof typeof STOP_LOSS_CONFIG] || STOP_LOSS_CONFIG.moderate;
  
  // Ultra aggressive day trades get tight stops
  if (riskProfile === 'ultra_aggressive' && position.isDayTrade && 'dayTrade' in config) {
    return config.dayTrade;
  }
  
  // LEAPs get wider stops
  if (position.assetType === 'option' && position.isLeap) {
    return config.leap;
  }
  
  return config[position.assetType];
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
        assetType: pos.symbol.length > 10 ? 'option' : 'stock', // Options have longer symbols
        isLeap: pos.symbol.length > 10 ? isLeap(pos.symbol) : false,
        isDayTrade: isDayTrade(pos.openedAt),
      };
      
      const stopConfig = getStopConfig(position, riskProfile);
      const lossPct = -position.unrealizedPnlPct; // Convert to positive loss
      
      // Check if stop hit
      if (lossPct >= stopConfig.stopPct) {
        console.log(`[StopGuardian] STOP HIT: ${position.symbol} down ${lossPct.toFixed(1)}% (limit: ${stopConfig.stopPct}%)`);
        
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
            reason: `Automatic stop loss executed. Position was down ${lossPct.toFixed(1)}% (limit: ${stopConfig.stopPct}%)`,
          });
          
          // Log to DB
          await query(
            `INSERT INTO trade_logs (user_id, symbol, action, quantity, reason, status, created_at)
             VALUES ($1, $2, 'stop_loss', $3, $4, 'executed', NOW())`,
            [userId, position.symbol, position.qty, `Stop loss at -${lossPct.toFixed(1)}%`]
          );
          
        } catch (execErr: any) {
          console.error(`[StopGuardian] Failed to execute stop for ${position.symbol}:`, execErr.message);
        }
        
      // Check if approaching stop (warning)
      } else if (lossPct >= stopConfig.warnPct && shouldWarn(userId, position.symbol)) {
        console.log(`[StopGuardian] WARNING: ${position.symbol} down ${lossPct.toFixed(1)}% (warn at: ${stopConfig.warnPct}%)`);
        
        results.warnings++;
        markWarned(userId, position.symbol);
        
        // Send warning notification (once per day max)
        await notifyTradeExecution(userId, {
          symbol: position.symbol,
          action: 'STOP WARNING',
          qty: position.qty,
          reason: `Position approaching stop loss. Down ${lossPct.toFixed(1)}% (stop at ${stopConfig.stopPct}%). Review position.`,
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

/**
 * Check interval for a specific risk profile (in ms)
 */
export function getCheckIntervalMs(riskProfile: string): number {
  const minutes = CHECK_INTERVALS[riskProfile as keyof typeof CHECK_INTERVALS] || CHECK_INTERVALS.moderate;
  return minutes * 60 * 1000;
}

export default {
  runStopLossGuardian,
  checkUserStopLosses,
  getCheckIntervalMs,
};
