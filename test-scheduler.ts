/**
 * Test Portfolio Scheduler
 * 
 * Demonstrates scheduled operations:
 * 1. Start scheduler
 * 2. View active jobs
 * 3. Manually trigger a job (for testing)
 * 4. Stop scheduler
 */

import 'dotenv/config';
import { createScheduler } from './services/scheduler';

async function testScheduler() {
  console.log('⏰ Testing Portfolio Scheduler\n');

  // Create scheduler
  const scheduler = createScheduler({
    timezone: 'America/Los_Angeles'
  });

  // Check status before start
  console.log('1️⃣ Scheduler status (before start):');
  let status = scheduler.getStatus();
  console.log(`   Running: ${status.running}`);
  console.log(`   Jobs: ${status.jobCount}`);

  // Start scheduler
  console.log('\n2️⃣ Starting scheduler...');
  scheduler.start();
  
  status = scheduler.getStatus();
  console.log('✅ Scheduler started');
  console.log(`   Jobs: ${status.jobCount}`);
  console.log(`   Timezone: ${status.timezone}`);
  console.log('\n   Scheduled jobs:');
  status.jobs.forEach(job => {
    console.log(`   • ${job.name}: ${job.schedule} ${job.active ? '✓' : '✗'}`);
  });

  // Explain what happens in production
  console.log('\n📅 In production, these jobs run automatically:');
  console.log('   • 9:00 AM daily: Analyze all portfolios');
  console.log('   • 8:00 AM Monday: Rebalance ultra_aggressive users');
  console.log('   • 8:00 AM 1st of month: Send monthly reports');
  console.log('   • 6:00 PM Monday: Send weekly reports');

  // Manual trigger demo
  console.log('\n3️⃣ Testing manual job trigger (daily check)...');
  console.log('   💡 This would normally run at 9 AM daily');
  console.log('   💡 For testing, we can trigger it manually:');
  
  const shouldRunJob = process.argv.includes('--run-job');
  
  if (shouldRunJob) {
    console.log('   🚀 Running daily check job...');
    try {
      await scheduler.triggerJob('daily');
      console.log('   ✅ Daily check complete');
    } catch (error: any) {
      console.error('   ❌ Job failed:', error.message);
    }
  } else {
    console.log('   ⏸️  Skipping (add --run-job flag to actually run)');
  }

  // Stop scheduler
  console.log('\n4️⃣ Stopping scheduler...');
  scheduler.stop();
  
  status = scheduler.getStatus();
  console.log('✅ Scheduler stopped');
  console.log(`   Running: ${status.running}`);
  console.log(`   Jobs: ${status.jobCount}`);

  // Summary
  console.log('\n✨ Test complete!\n');
  console.log('📊 Summary:');
  console.log('   The scheduler can:');
  console.log('   • Run automated portfolio checks');
  console.log('   • Execute rebalancing for users');
  console.log('   • Generate and send reports');
  console.log('   • Handle multiple users in parallel');
  console.log('   • Respect each user\'s risk profile and schedule');
  
  console.log('\n🎯 To run in production:');
  console.log('   1. Ensure Supabase credentials in .env');
  console.log('   2. Ensure LLM API key in .env (DEEPSEEK_API_KEY or OPENAI_API_KEY)');
  console.log('   3. Run: npm run scheduler (or tsx services/scheduler.ts)');
  console.log('   4. Or add to your main server.ts startup');
  
  console.log('\n💡 To test a job immediately:');
  console.log('   npm run test:scheduler -- --run-job');
}

// Run test
testScheduler().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
