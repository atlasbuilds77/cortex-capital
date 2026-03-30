/**
 * AUTO-TRADING CRON - Scalable Version
 * 
 * Uses a job queue pattern:
 * 1. Main cron triggers every 15 min
 * 2. Fetches all eligible users
 * 3. Processes in parallel batches (10 users at a time)
 * 4. Each user processed independently
 * 
 * For massive scale (1000+ users), migrate to:
 * - Redis queue (BullMQ)
 * - Separate worker processes
 * - Vercel Cron + Edge Functions
 */

import { query } from '../db';
import { runAutoTradingCycle } from './auto-trading-daemon';

const BATCH_SIZE = 10; // Process 10 users in parallel
const CYCLE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface EligibleUser {
  id: string;
  email: string;
  tier: string;
}

/**
 * Get all users eligible for auto-trading
 * Supports SnapTrade (primary) and legacy broker connections
 */
async function getEligibleUsers(): Promise<EligibleUser[]> {
  const result = await query(`
    SELECT u.id, u.email, u.tier
    FROM users u
    WHERE u.auto_execute_enabled = true
      AND u.tier IN ('scout', 'operator', 'partner')
      AND (
        u.snaptrade_user_id IS NOT NULL
        OR EXISTS (SELECT 1 FROM broker_credentials bc WHERE bc.user_id = u.id)
      )
  `);
  return result.rows;
}

/**
 * Process users in parallel batches
 */
async function processBatch(users: EligibleUser[]): Promise<void> {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        // Import dynamically to avoid circular deps
        const daemon = await import('./auto-trading-daemon');
        await daemon.runAutoTradingCycle();
        return { userId: user.id, success: true };
      } catch (error: any) {
        console.error(`[Cron] Failed for ${user.email}:`, error.message);
        return { userId: user.id, success: false, error: error.message };
      }
    })
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[Cron] Batch complete: ${succeeded} success, ${failed} failed`);
}

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
  
  const users = await getEligibleUsers();
  console.log(`[Cron] Found ${users.length} eligible users`);
  
  // Process in batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(`[Cron] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`);
    await processBatch(batch);
  }
  
  const duration = Date.now() - startTime;
  console.log(`[Cron] Cycle complete in ${duration}ms`);
  
  return {
    totalUsers: users.length,
    processed: users.length,
    duration,
  };
}

/**
 * Check if market is open
 */
function isMarketOpen(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  
  // Skip weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC
  // Simplified: 14:00 - 20:00 UTC
  return hour >= 14 && hour < 20;
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
