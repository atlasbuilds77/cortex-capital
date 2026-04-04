/**
 * PROCESS EXPIRED APPROVALS CRON
 * 
 * Runs every 15 minutes during market hours.
 * Auto-executes trades that have been pending past their expiry time.
 * 
 * Schedule: */15 13-20 * * 1-5 (ET) = Every 15 min, 9:30 AM - 4 PM ET, Mon-Fri
 */

import { processExpiredApprovals } from '../lib/approvals';

async function main() {
  console.log('='.repeat(60));
  console.log('PROCESS EXPIRED APPROVALS');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    const result = await processExpiredApprovals();
    
    console.log(`\nResults:`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Executed: ${result.executed}`);
    console.log(`  Rejected/Failed: ${result.rejected}`);
    
    if (result.processed === 0) {
      console.log('\nNo expired approvals to process.');
    }
    
  } catch (error: any) {
    console.error('Error processing expired approvals:', error.message);
    process.exit(1);
  }
  
  console.log('\nDone.');
  process.exit(0);
}

main();
