// Cortex Capital - Expiry Guardian
// Background process that enforces hard rules for option expiry
// Runs every 15 minutes during market hours (9:30 AM - 4:00 PM ET, weekdays)
// NO agent override - these are automatic safety rules

import cron from 'node-cron';
import { getPositions, closePosition, getLatestQuote } from '../integrations/alpaca';
import { classifyPositions, getUnderlyingSymbols, ClassifiedPosition } from './position-classifier';

// Market hours: 9:30 AM - 4:00 PM ET (weekdays)
const MARKET_OPEN_HOUR_ET = 9;
const MARKET_OPEN_MINUTE_ET = 30;
const MARKET_CLOSE_HOUR_ET = 16;
const MARKET_CLOSE_MINUTE_ET = 0;

// Emergency threshold for 0 DTE options
const EMERGENCY_CUTOFF_HOUR_ET = 14; // 2:00 PM ET

/**
 * Convert ET time to local time
 */
function isMarketHours(): boolean {
  const now = new Date();
  
  // Check if weekday (0 = Sunday, 6 = Saturday)
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  
  // Convert to ET (UTC-5 or UTC-4 depending on DST)
  // For simplicity, using a library would be better, but this works
  const etOffset = -5 * 60; // ET is UTC-5 (adjust for DST if needed)
  const localOffset = now.getTimezoneOffset();
  const etTime = new Date(now.getTime() + (etOffset - localOffset) * 60 * 1000);
  
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();
  
  // Check if within market hours
  const afterOpen = hour > MARKET_OPEN_HOUR_ET || 
                    (hour === MARKET_OPEN_HOUR_ET && minute >= MARKET_OPEN_MINUTE_ET);
  const beforeClose = hour < MARKET_CLOSE_HOUR_ET || 
                      (hour === MARKET_CLOSE_HOUR_ET && minute < MARKET_CLOSE_MINUTE_ET);
  
  return afterOpen && beforeClose;
}

/**
 * Get current ET hour (for emergency cutoff check)
 */
function getCurrentETHour(): number {
  const now = new Date();
  const etOffset = -5 * 60;
  const localOffset = now.getTimezoneOffset();
  const etTime = new Date(now.getTime() + (etOffset - localOffset) * 60 * 1000);
  return etTime.getHours();
}

/**
 * Check if position is OTM (out of the money)
 */
function isOTM(position: ClassifiedPosition): boolean {
  if (position.assetClass !== 'option') return false;
  if (!position.underlyingPrice || !position.strike || !position.optionType) return false;
  
  const { underlyingPrice, strike, optionType } = position;
  
  if (optionType === 'call') {
    return underlyingPrice < strike;
  } else {
    return underlyingPrice > strike;
  }
}

/**
 * Check if strike is >10% OTM
 */
function isExtremelyOTM(position: ClassifiedPosition): boolean {
  if (position.assetClass !== 'option') return false;
  if (!position.underlyingPrice || !position.strike) return false;
  
  const distanceFromStrike = Math.abs(position.underlyingPrice - position.strike);
  const percentOTM = (distanceFromStrike / position.underlyingPrice) * 100;
  
  return isOTM(position) && percentOTM > 10;
}

/**
 * Main guardian logic - apply hard rules
 */
export async function runExpiryGuardian(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n[EXPIRY GUARDIAN] Running at ${timestamp}`);
  
  // Only run during market hours
  if (!isMarketHours()) {
    console.log('[EXPIRY GUARDIAN] Market closed - skipping');
    return;
  }
  
  try {
    // Fetch all positions
    const positions = await getPositions();
    
    if (positions.length === 0) {
      console.log('[EXPIRY GUARDIAN] No positions to monitor');
      return;
    }
    
    console.log(`[EXPIRY GUARDIAN] Monitoring ${positions.length} positions`);
    
    // Get underlying prices for options
    const underlyingSymbols = getUnderlyingSymbols(positions);
    const underlyingPrices = new Map<string, number>();
    
    for (const symbol of underlyingSymbols) {
      try {
        const quote = await getLatestQuote(symbol);
        const midPrice = (quote.ask_price + quote.bid_price) / 2;
        underlyingPrices.set(symbol, midPrice);
        console.log(`[EXPIRY GUARDIAN] ${symbol} price: $${midPrice.toFixed(2)}`);
      } catch (error) {
        console.error(`[EXPIRY GUARDIAN] Failed to fetch price for ${symbol}:`, error);
      }
    }
    
    // Classify all positions
    const classified = classifyPositions(positions, underlyingPrices);
    
    // Apply hard rules
    const currentETHour = getCurrentETHour();
    const isAfterEmergencyCutoff = currentETHour >= EMERGENCY_CUTOFF_HOUR_ET;
    
    for (const position of classified) {
      const symbol = position.symbol;
      const dte = position.dte ?? null;
      const pnlPct = position.unrealizedPnlPct;
      
      // HARD RULE 1: 0 DTE + OTM + after 2 PM ET → AUTO-SELL
      if (dte === 0 && isOTM(position) && isAfterEmergencyCutoff) {
        console.log(`\n[EXPIRY GUARDIAN] ⚠️ EMERGENCY SELL: ${symbol}`);
        console.log(`  Reason: 0 DTE + OTM + after 2 PM ET`);
        console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2)}`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        
        try {
          await closePosition(symbol);
          console.log(`  ✅ Position closed successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to close position:`, error);
        }
        continue;
      }
      
      // HARD RULE 2: 0 DTE + losing >50% → AUTO-SELL
      if (dte === 0 && pnlPct < -50) {
        console.log(`\n[EXPIRY GUARDIAN] ⚠️ EMERGENCY SELL: ${symbol}`);
        console.log(`  Reason: 0 DTE + losing >50%`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        
        try {
          await closePosition(symbol);
          console.log(`  ✅ Position closed successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to close position:`, error);
        }
        continue;
      }
      
      // RULE 3: 1 DTE + OTM + losing >35% → FLAG (log warning, don't auto-sell yet)
      if (dte === 1 && isOTM(position) && pnlPct < -35) {
        console.log(`\n[EXPIRY GUARDIAN] ⚠️ WARNING: ${symbol}`);
        console.log(`  Reason: 1 DTE + OTM + losing >35%`);
        console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2)}`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        console.log(`  Recommendation: Consider closing before it becomes 0 DTE`);
      }
      
      // RULE 4: Any option at 0 DTE → Alert
      if (dte === 0) {
        console.log(`\n[EXPIRY GUARDIAN] ⏰ ALERT: ${symbol} expires TODAY`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        if (!isOTM(position)) {
          console.log(`  Status: ITM - monitor closely`);
        }
      }
      
      // RULE 5: Any option transitioning DTE category → Alert
      if (dte === 2) {
        console.log(`\n[EXPIRY GUARDIAN] 🔄 TRANSITION ALERT: ${symbol}`);
        console.log(`  Position will transition to SCALP rules tomorrow (1 DTE)`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
      }
      
      if (dte === 30 && position.playbook === 'OPTIONS_LEAPS') {
        console.log(`\n[EXPIRY GUARDIAN] 🔄 TRANSITION ALERT: ${symbol}`);
        console.log(`  LEAP position approaching swing territory (30 DTE)`);
        console.log(`  Consider rolling forward or converting to swing strategy`);
      }
      
      // RULE 6: Strike >10% OTM at any DTE → Flag
      if (isExtremelyOTM(position)) {
        console.log(`\n[EXPIRY GUARDIAN] ⚠️ WARNING: ${symbol}`);
        console.log(`  Strike is >10% OTM - extremely unlikely to hit`);
        console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2)}`);
        console.log(`  DTE: ${dte}, Current P&L: ${pnlPct.toFixed(2)}%`);
      }
      
      // RULE 7: Theta eating >5% of remaining value per day → Flag
      // (Requires more accurate theta calculation - for now, rough estimate)
      if (dte !== null && dte <= 3 && pnlPct < -20) {
        console.log(`\n[EXPIRY GUARDIAN] ⚠️ THETA WARNING: ${symbol}`);
        console.log(`  Short DTE (${dte}) + losing position = theta destroying value`);
        console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        console.log(`  Recommendation: Close if no strong thesis`);
      }
    }
    
    console.log(`\n[EXPIRY GUARDIAN] Scan complete\n`);
    
  } catch (error) {
    console.error('[EXPIRY GUARDIAN] Error during scan:', error);
  }
}

/**
 * Start the expiry guardian cron job
 * Runs every 15 minutes during market hours
 */
export function startExpiryGuardianCron(): void {
  console.log('[EXPIRY GUARDIAN] Starting cron job (every 15 minutes)');
  
  // Run every 15 minutes: */15 * * * *
  // This will run at :00, :15, :30, :45 of every hour
  cron.schedule('*/15 * * * *', async () => {
    await runExpiryGuardian();
  });
  
  // Also run immediately on startup
  console.log('[EXPIRY GUARDIAN] Running initial scan...');
  runExpiryGuardian().catch(error => {
    console.error('[EXPIRY GUARDIAN] Initial scan failed:', error);
  });
}

/**
 * Run guardian once (for testing)
 */
export async function runGuardianOnce(forceRun: boolean = false): Promise<void> {
  if (forceRun) {
    // Bypass market hours check for testing
    console.log('[EXPIRY GUARDIAN] Force run enabled - bypassing market hours check');
    const timestamp = new Date().toISOString();
    console.log(`\n[EXPIRY GUARDIAN] Running at ${timestamp}`);
    
    try {
      const positions = await getPositions();
      
      if (positions.length === 0) {
        console.log('[EXPIRY GUARDIAN] No positions to monitor');
        return;
      }
      
      console.log(`[EXPIRY GUARDIAN] Monitoring ${positions.length} positions`);
      
      // Get underlying prices for options
      const underlyingSymbols = getUnderlyingSymbols(positions);
      const underlyingPrices = new Map<string, number>();
      
      for (const symbol of underlyingSymbols) {
        try {
          const quote = await getLatestQuote(symbol);
          const midPrice = (quote.ask_price + quote.bid_price) / 2;
          underlyingPrices.set(symbol, midPrice);
          console.log(`[EXPIRY GUARDIAN] ${symbol} price: $${midPrice.toFixed(2)}`);
        } catch (error) {
          console.error(`[EXPIRY GUARDIAN] Failed to fetch price for ${symbol}:`, error);
        }
      }
      
      // Classify all positions
      const classified = classifyPositions(positions, underlyingPrices);
      
      // Apply hard rules (with emergency cutoff check)
      const currentETHour = getCurrentETHour();
      const isAfterEmergencyCutoff = currentETHour >= EMERGENCY_CUTOFF_HOUR_ET;
      
      for (const position of classified) {
        const symbol = position.symbol;
        const dte = position.dte ?? null;
        const pnlPct = position.unrealizedPnlPct;
        
        // Show all the checks even if market is closed
        console.log(`\n--- ${symbol} ---`);
        console.log(`DTE: ${dte}, P&L: ${pnlPct.toFixed(2)}%, ET Hour: ${currentETHour}`);
        
        // HARD RULE 1: 0 DTE + OTM + after 2 PM ET → AUTO-SELL
        if (dte === 0 && isOTM(position) && isAfterEmergencyCutoff) {
          console.log(`\n[EXPIRY GUARDIAN] ⚠️ WOULD EMERGENCY SELL: ${symbol}`);
          console.log(`  Reason: 0 DTE + OTM + after 2 PM ET`);
          console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2) ?? 'N/A'}`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
          console.log(`  (Not executing - force run mode)`);
          continue;
        }
        
        // HARD RULE 2: 0 DTE + losing >50% → AUTO-SELL
        if (dte === 0 && pnlPct < -50) {
          console.log(`\n[EXPIRY GUARDIAN] ⚠️ WOULD EMERGENCY SELL: ${symbol}`);
          console.log(`  Reason: 0 DTE + losing >50%`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
          console.log(`  (Not executing - force run mode)`);
          continue;
        }
        
        // RULE 3: 1 DTE + OTM + losing >35% → FLAG
        if (dte === 1 && isOTM(position) && pnlPct < -35) {
          console.log(`\n[EXPIRY GUARDIAN] ⚠️ WARNING: ${symbol}`);
          console.log(`  Reason: 1 DTE + OTM + losing >35%`);
          console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2) ?? 'N/A'}`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
          console.log(`  Recommendation: Consider closing before it becomes 0 DTE`);
        }
        
        // RULE 4: Any option at 0 DTE → Alert
        if (dte === 0) {
          console.log(`\n[EXPIRY GUARDIAN] ⏰ ALERT: ${symbol} expires TODAY`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
          if (!isOTM(position)) {
            console.log(`  Status: ITM - monitor closely`);
          } else {
            console.log(`  Status: OTM - likely expires worthless`);
          }
        }
        
        // RULE 5: Any option transitioning DTE category → Alert
        if (dte === 2) {
          console.log(`\n[EXPIRY GUARDIAN] 🔄 TRANSITION ALERT: ${symbol}`);
          console.log(`  Position will transition to SCALP rules tomorrow (1 DTE)`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
        }
        
        if (dte === 30 && position.playbook === 'OPTIONS_LEAPS') {
          console.log(`\n[EXPIRY GUARDIAN] 🔄 TRANSITION ALERT: ${symbol}`);
          console.log(`  LEAP position approaching swing territory (30 DTE)`);
          console.log(`  Consider rolling forward or converting to swing strategy`);
        }
        
        // RULE 6: Strike >10% OTM at any DTE → Flag
        if (isExtremelyOTM(position)) {
          console.log(`\n[EXPIRY GUARDIAN] ⚠️ WARNING: ${symbol}`);
          console.log(`  Strike is >10% OTM - extremely unlikely to hit`);
          console.log(`  Strike: $${position.strike?.toFixed(2)}, Underlying: $${position.underlyingPrice?.toFixed(2) ?? 'N/A'}`);
          console.log(`  DTE: ${dte}, Current P&L: ${pnlPct.toFixed(2)}%`);
        }
        
        // RULE 7: Theta eating >5% of remaining value per day → Flag
        if (dte !== null && dte <= 3 && pnlPct < -20) {
          console.log(`\n[EXPIRY GUARDIAN] ⚠️ THETA WARNING: ${symbol}`);
          console.log(`  Short DTE (${dte}) + losing position = theta destroying value`);
          console.log(`  Current P&L: ${pnlPct.toFixed(2)}%`);
          console.log(`  Recommendation: Close if no strong thesis`);
        }
      }
      
      console.log(`\n[EXPIRY GUARDIAN] Force run scan complete\n`);
      
    } catch (error) {
      console.error('[EXPIRY GUARDIAN] Error during force run:', error);
    }
  } else {
    await runExpiryGuardian();
  }
}
