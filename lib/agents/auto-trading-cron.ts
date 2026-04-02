/**
 * AUTO-TRADING CRON
 * 
 * Main cron triggers every 15 minutes and delegates one full cycle to
 * auto-trading-daemon, which already handles user eligibility + iteration.
 */

import { runAutoTradingCycle } from './auto-trading-daemon';
const CYCLE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Run the full cron cycle
 */
export async function runCronCycle(): Promise<{
  totalUsers: number;
  processed: number;
  duration: number;
}> {
  const startTime = Date.now();
  console.log('[Cron] Starting auto-trading cycle');

  // runAutoTradingCycle already handles all eligible users.
  const cycleResult = await runAutoTradingCycle();
  console.log(`[Cron] Daemon processed ${cycleResult.usersProcessed} users, executed ${cycleResult.tradesExecuted} trades`);
  if (cycleResult.errors.length > 0) {
    console.warn(`[Cron] ${cycleResult.errors.length} user-level errors detected`);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[Cron] Cycle complete in ${duration}ms`);
  
  return {
    totalUsers: cycleResult.usersProcessed,
    processed: cycleResult.usersProcessed,
    duration,
  };
}

/**
 * Check if market is open
 */
function isMarketOpen(): boolean {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const day = now.getUTCDay();
  
  // Skip weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC (during ET DST).
  const marketOpenUtcMinutes = 13 * 60 + 30;
  const marketCloseUtcMinutes = 20 * 60;
  return utcMinutes >= marketOpenUtcMinutes && utcMinutes < marketCloseUtcMinutes;
}

/**
 * Start the cron daemon (for local/server deployment)
 */
export function startCronDaemon(): void {
  console.log('[Cron] Auto-trading daemon started');
  
  const tick = async () => {
    if (isMarketOpen()) {
      await runCronCycle();
    } else {
      console.log('[Cron] Market closed, skipping');
    }
  };
  
  // Run immediately
  tick();
  
  // Then every 15 minutes
  setInterval(tick, CYCLE_INTERVAL_MS);
}

export { isMarketOpen };
export default { runCronCycle, startCronDaemon, isMarketOpen };
