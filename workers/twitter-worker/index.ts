/**
 * Twitter Worker - X Intelligence
 * Monitors X for trading signals, posts updates, and engages with community
 * Agent: X-ALT
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as db from '../../integration/db-adapter';

const execAsync = promisify(exec);

// Worker configuration
const WORKER_ID = `twitter-worker-${process.pid}`;
const POLL_INTERVAL = 60000; // 1 minute
const MENTION_CHECK_INTERVAL = 300000; // 5 minutes

// Key accounts to monitor for trading signals
const KEY_ACCOUNTS = [
  '@APompliano',
  '@100trillionUSD',
  '@RaoulGMI',
  '@APompliano',
  '@naval',
  '@VitalikButerin',
];

/**
 * Execute bird CLI command
 */
async function birdCommand(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`bird ${cmd}`);
    return stdout.trim();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bird command failed:', cmd, errorMsg);
    throw error;
  }
}

/**
 * Check for mentions
 */
async function checkMentions(): Promise<void> {
  try {
    console.log('Checking mentions...');
    
    // Get recent mentions (bird doesn't have direct mentions, so we search for our handle)
    const mentions = await birdCommand('search "@Atlas_Builds" -n 10');
    
    // Create event for new mentions
    if (mentions && mentions.length > 0) {
      await db.createEvent({
        agent_id: 'xalt',
        kind: 'twitter_mention',
        title: 'New X mentions',
        summary: `Found mentions in search`,
        tags: ['twitter', 'mention', 'social'],
        metadata: {
          count: mentions.split('\n').length,
        },
      });
    }
  } catch (error) {
    console.error('Failed to check mentions:', error);
  }
}

/**
 * Monitor key accounts for signals
 */
async function monitorKeyAccounts(): Promise<void> {
  try {
    console.log('Monitoring key accounts...');
    
    for (const account of KEY_ACCOUNTS) {
      try {
        // Search recent tweets from this account
        const tweets = await birdCommand(`search "from:${account}" -n 5`);
        
        // Look for trading keywords
        const keywords = ['buy', 'sell', 'bullish', 'bearish', 'long', 'short', 'market', 'crypto', 'bitcoin', 'eth'];
        const hasTradingSignal = keywords.some(kw => tweets.toLowerCase().includes(kw));
        
        if (hasTradingSignal) {
          await db.createEvent({
            agent_id: 'xalt',
            kind: 'twitter_signal',
            title: `Potential signal from ${account}`,
            summary: tweets.substring(0, 200),
            tags: ['twitter', 'signal', 'kol', account],
            metadata: {
              account,
              keywords: keywords.filter(kw => tweets.toLowerCase().includes(kw)),
            },
          });
          
          console.log(`Found potential signal from ${account}`);
        }
      } catch (error) {
        console.error(`Failed to monitor ${account}:`, error);
      }
      
      // Rate limit: 1 second between accounts
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('Failed to monitor key accounts:', error);
  }
}

/**
 * Post trade update (when mission step completed)
 */
async function postTradeUpdate(text: string): Promise<boolean> {
  try {
    console.log('Posting trade update:', { text });
    
    // Post tweet
    await birdCommand(`tweet "${text}"`);
    
    console.log('Posted trade update successfully');
    return true;
  } catch (error) {
    console.error('Failed to post trade update:', error);
    return false;
  }
}

/**
 * Process post_tweet steps
 */
async function processPostTweetSteps(): Promise<void> {
  try {
    const steps = await db.getQueuedSteps('post_tweet');
    
    for (const step of steps) {
      // Claim step
      const claimed = await db.claimStep(step.id!, WORKER_ID);
      if (!claimed) {
        continue;
      }
      
      try {
        const { text } = step.payload as { text: string };
        const success = await postTradeUpdate(text);
        
        if (success) {
          await db.completeStep(step.id!, {
            posted: true,
            postedAt: new Date().toISOString(),
          });
        } else {
          throw new Error('Failed to post tweet');
        }
      } catch (error: any) {
        await db.failStep(step.id!, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to process post_tweet steps:', error);
  }
}

/**
 * Main polling loop
 */
async function pollLoop(): Promise<void> {
  try {
    // Process any queued post_tweet steps
    await processPostTweetSteps();
  } catch (error) {
    console.error('Poll loop error:', error);
  }
}

/**
 * Start worker
 */
async function start(): Promise<void> {
  console.log(`[TwitterWorker] Starting worker ${WORKER_ID}...`);
  
  // Initialize database
  try {
    await db.initDb();
    console.log('[TwitterWorker] Database ready');
  } catch (error) {
    console.error('[TwitterWorker] Database initialization failed:', error);
    process.exit(1);
  }
  
  // Check bird auth
  try {
    const whoami = await birdCommand('whoami');
    console.log('[TwitterWorker] Authenticated as:', whoami);
  } catch (error) {
    console.warn('[TwitterWorker] ⚠️ Bird auth not configured');
  }
  
  console.log(`[TwitterWorker] Polling every ${POLL_INTERVAL}ms`);
  console.log(`[TwitterWorker] Monitoring accounts: ${KEY_ACCOUNTS.join(', ')}`);
  
  // Initial poll
  await pollLoop();
  
  // Set up intervals
  setInterval(pollLoop, POLL_INTERVAL);
  setInterval(checkMentions, MENTION_CHECK_INTERVAL);
  setInterval(monitorKeyAccounts, MENTION_CHECK_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[TwitterWorker] Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[TwitterWorker] Received SIGINT, shutting down...');
    process.exit(0);
  });
}

// Run if main module
if (require.main === module) {
  start().catch(error => {
    console.error('[TwitterWorker] Fatal error:', error);
    process.exit(1);
  });
}

export { start, postTradeUpdate, monitorKeyAccounts };
