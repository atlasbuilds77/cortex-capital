// Test the Expiry Guardian
// Run the guardian once to see what actions it would take

import dotenv from 'dotenv';
import { runGuardianOnce } from './agents/expiry-guardian';

dotenv.config();

async function testGuardian() {
  console.log('=== TESTING EXPIRY GUARDIAN ===\n');
  console.log('This will scan the portfolio and show what actions would be taken.\n');
  console.log('NOTE: Running in FORCE mode (bypassing market hours check).\n');
  console.log('Auto-sell is DISABLED for this test.\n');
  
  await runGuardianOnce(true); // Force run = true
  
  console.log('\n=== TEST COMPLETE ===\n');
}

testGuardian();
