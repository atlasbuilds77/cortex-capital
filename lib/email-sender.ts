/**
 * EMAIL SENDER
 * Uses Resend to send weekly emails to subscribers
 * Supports draft mode (send to Orion for review) and full send (all subscribers)
 */

import { Resend } from 'resend';
import pg from 'pg';

const { Pool } = pg;

// Resend API key
const RESEND_API_KEY = 're_Jg7Dp4iV_38FvagfWzy2WLY1AiAuAkZcG';

// Database connection
const DATABASE_URL = 'postgresql://cortex_capital_user:0IuRjWY7G7JwMmqak0x1m3VC5xqssYe1@dpg-d6vcdsqa214c7387nuu0-a.oregon-postgres.render.com/cortex_capital';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const resend = new Resend(RESEND_API_KEY);

/**
 * Send draft email to Orion for review
 */
export async function sendDraftForReview(html: string, subject: string): Promise<void> {
  console.log('📧 Sending draft to Orion for review...');
  
  try {
    const result = await resend.emails.send({
      from: 'Cortex Capital Group <market@cortexcapitalgroup.com>',
      to: 'orion@zerogtrading.com',
      subject: `[DRAFT] ${subject}`,
      html
    });
    
    console.log('✅ Draft sent to Orion:', result.data?.id);
  } catch (error) {
    console.error('❌ Failed to send draft:', error);
    throw error;
  }
}

/**
 * Get all subscriber emails (tier != 'free')
 */
async function getSubscriberEmails(): Promise<string[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT email FROM users WHERE tier != 'free'
    `);
    
    const emails = result.rows.map(row => row.email);
    console.log(`📊 Found ${emails.length} subscribers`);
    
    return emails;
  } catch (error) {
    console.error('❌ Database query failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Send email to all subscribers
 * Uses batch sending to avoid rate limits
 */
export async function sendToSubscribers(html: string, subject: string): Promise<void> {
  console.log('📧 Fetching subscriber list...');
  
  const emails = await getSubscriberEmails();
  
  if (emails.length === 0) {
    console.log('⚠️  No subscribers found (all users are on free tier)');
    return;
  }
  
  console.log(`📧 Sending to ${emails.length} subscribers...`);
  
  // Send in batches to avoid rate limits (max 100 per batch)
  const BATCH_SIZE = 100;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    console.log(`📤 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Sending to ${batch.length} recipients...`);
    
    try {
      // Send individual emails (Resend doesn't support BCC for HTML emails)
      const promises = batch.map(email =>
        resend.emails.send({
          from: 'Cortex Capital Group <market@cortexcapitalgroup.com>',
          to: email,
          subject,
          html
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
          console.error(`❌ Failed to send to ${batch[idx]}:`, result.reason);
        }
      });
      
      // Rate limit: wait 1 second between batches
      if (i + BATCH_SIZE < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Batch failed:`, error);
      failCount += batch.length;
    }
  }
  
  console.log(`✅ Email campaign complete: ${successCount} sent, ${failCount} failed`);
  
  if (failCount > 0) {
    throw new Error(`${failCount} emails failed to send`);
  }
}

/**
 * Close database pool (for clean shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
