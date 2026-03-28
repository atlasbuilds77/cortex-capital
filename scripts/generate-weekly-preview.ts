#!/usr/bin/env tsx
/**
 * GENERATE WEEKLY EMAIL PREVIEW
 * 
 * Usage:
 *   npx tsx scripts/generate-weekly-preview.ts
 * 
 * Generates the email HTML and saves to /tmp/weekly-email-preview.html
 * Open in browser to preview before sending
 */

import { generateWeeklyEmail } from '../lib/weekly-email.js';
import { writeFileSync } from 'fs';

async function main() {
  console.log('🚀 Cortex Capital Email Preview Generator');
  console.log('');
  
  try {
    // Generate email content
    console.log('📝 Generating email content...');
    const { html, subject } = await generateWeeklyEmail();
    console.log(`✅ Email generated: "${subject}"`);
    console.log('');
    
    // Save to file
    const outputPath = '/tmp/weekly-email-preview.html';
    writeFileSync(outputPath, html, 'utf-8');
    
    console.log(`✅ Preview saved to: ${outputPath}`);
    console.log('');
    console.log('📖 To view:');
    console.log(`   open ${outputPath}`);
    console.log('   (or open in your browser manually)');
    console.log('');
    console.log('👋 Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
