/**
 * Next.js Instrumentation
 * Runs once when the server starts
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCronJobs } = await import('./lib/cron/scheduler');
    initCronJobs();
  }
}
