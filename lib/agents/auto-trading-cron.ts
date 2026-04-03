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
  tradesExecuted: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  console.log('[Cron] Starting auto-trading cycle');

  // runAutoTradingCycle already handles all eligible users.
  const cycleResult = await runAutoTradingCycle();
  console.log(`[Cron] Daemon processed ${cycleResult.usersProcessed} users, executed ${cycleResult.tradesExecuted} trades`);
  if (cycleResult.errors.length > 0) {
    console.warn(`[Cron] ${cycleResult.errors.length} user-level errors detected`);
    console.warn('[Cron] Error details:', cycleResult.errors);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[Cron] Cycle complete in ${duration}ms`);
  
  return {
    totalUsers: cycleResult.usersProcessed,
    processed: cycleResult.usersProcessed,
    tradesExecuted: cycleResult.tradesExecuted,
    errors: cycleResult.errors,
    duration,
  };
}

/**
 * US Market Holidays (NYSE/NASDAQ) - Updated annually
 * Format: 'YYYY-MM-DD'
 */
const MARKET_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
];

const MARKET_HOLIDAYS_2027 = [
  '2027-01-01', // New Year's Day
  '2027-01-18', // MLK Day
  '2027-02-15', // Presidents Day
  '2027-03-26', // Good Friday
  '2027-05-31', // Memorial Day
  '2027-07-05', // Independence Day (observed)
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving
  '2027-12-24', // Christmas Eve (observed)
];

const ALL_HOLIDAYS = [...MARKET_HOLIDAYS_2026, ...MARKET_HOLIDAYS_2027];

/**
 * Check if today is a market holiday
 */
function isMarketHoliday(): boolean {
  const now = new Date();
  const etDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  
  return ALL_HOLIDAYS.includes(etDate);
}

/**
 * Get current market status with reason
 */
export function getMarketStatus(): { open: boolean; reason: string; date: string } {
  const now = new Date();
  const etDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  
  const day = now.getUTCDay();
  
  if (day === 0) return { open: false, reason: 'Sunday', date: etDate };
  if (day === 6) return { open: false, reason: 'Saturday', date: etDate };
  if (isMarketHoliday()) return { open: false, reason: `Holiday (${etDate})`, date: etDate };
  
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const marketOpenUtcMinutes = 13 * 60 + 30;  // 9:30 AM ET
  const marketCloseUtcMinutes = 20 * 60;       // 4:00 PM ET
  
  if (utcMinutes < marketOpenUtcMinutes) return { open: false, reason: 'Pre-market', date: etDate };
  if (utcMinutes >= marketCloseUtcMinutes) return { open: false, reason: 'After-hours', date: etDate };
  
  return { open: true, reason: 'Market open', date: etDate };
}

/**
 * Check if market is open
 */
function isMarketOpen(): boolean {
  const status = getMarketStatus();
  if (!status.open) {
    console.log(`[Cron] Market closed: ${status.reason} (${status.date})`);
  }
  return status.open;
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
