/**
 * INTERNAL CRON SCHEDULER
 * 
 * Runs cron jobs within the Node.js process.
 * For Render deployment (no native cron support).
 */

import cron from 'node-cron';

let initialized = false;

export function initCronJobs() {
  if (initialized) return;
  initialized = true;
  
  console.log('[Cron] Initializing scheduled jobs...');
  
  // Auto-trade: 6:45 AM and 12:45 PM PST (13:45 and 19:45 UTC)
  cron.schedule('45 13,19 * * 1-5', async () => {
    console.log('[Cron] Running auto-trade...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/auto-trade`, {
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      });
      const result = await response.json();
      console.log('[Cron] Auto-trade result:', result);
    } catch (error) {
      console.error('[Cron] Auto-trade error:', error);
    }
  }, { timezone: 'UTC' });
  
  // Daily digest: 4 PM ET (21:00 UTC)
  cron.schedule('0 21 * * 1-5', async () => {
    console.log('[Cron] Running daily digest...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/daily-digest`, {
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      });
      const result = await response.json();
      console.log('[Cron] Daily digest result:', result);
    } catch (error) {
      console.error('[Cron] Daily digest error:', error);
    }
  }, { timezone: 'UTC' });
  
  console.log('[Cron] Scheduled: auto-trade (6:45am, 12:45pm PST), daily-digest (4pm ET)');
}

export default { initCronJobs };
