#!/usr/bin/env tsx
/**
 * SEND WEEKLY EMAIL SCRIPT
 * 
 * Usage:
 *   npx tsx scripts/send-weekly-email.ts           (sends draft to Orion)
 *   npx tsx scripts/send-weekly-email.ts --draft   (sends draft to Orion)
 *   npx tsx scripts/send-weekly-email.ts --send    (sends to all subscribers)
 * 
 * Default mode: --draft (safe by default)
 */

import { generateWeeklyEmail } from '../lib/weekly-email.js';
import { sendDraftForReview, sendToSubscribers, closePool } from '../lib/email-sender.js';

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--send') ? 'send' : 'draft';
  
  console.log('🚀 Cortex Capital Weekly Email System');
  console.log(`📋 Mode: ${mode.toUpperCase()}`);
  console.log('');
  
  try {
    // Generate email content
    console.log('📝 Generating email content...');
    const { html, subject } = await generateWeeklyEmail();
    console.log(`✅ Email generated: "${subject}"`);
    console.log('');
    
    // Send based on mode
    if (mode === 'draft') {
      console.log('📧 DRAFT MODE: Sending to Orion for review...');
      await sendDraftForReview(html, subject);
      console.log('✅ Draft sent! Check orion@zerogtrading.com');
    } else {
      console.log('📧 SEND MODE: Sending to ALL subscribers...');
      console.log('⚠️  This will send real emails to paying customers!');
      console.log('');
      
      // Confirmation pause (3 seconds to cancel)
      console.log('⏳ Starting in 3 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await sendToSubscribers(html, subject);
      console.log('✅ Campaign complete!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closePool();
    console.log('');
    console.log('👋 Done!');
  }
}

main();
