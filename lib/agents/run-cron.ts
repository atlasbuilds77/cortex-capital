/**
 * Standalone cron runner for Render cron jobs
 * 
 * Render calls this script every 15 min during market hours.
 * It runs once and exits (not a daemon).
 */

import { runCronCycle, isMarketOpen } from './auto-trading-cron';

async function main() {
  console.log('[Cron Runner] Starting at', new Date().toISOString());
  
  if (!isMarketOpen()) {
    console.log('[Cron Runner] Market closed, exiting');
    process.exit(0);
  }
  
  try {
    const result = await runCronCycle();
    console.log('[Cron Runner] Complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('[Cron Runner] Error:', error);
    process.exit(1);
  }
}

main();
