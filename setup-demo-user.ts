/**
 * SETUP DEMO USER
 * Creates demo user with Alpaca paper account
 */

import { getPool } from './lib/db';
import { encrypt } from './lib/credential-vault';
import { startUserPortfolioDiscussion } from './lib/user-discussion';
import fs from 'fs';

async function setupDemoUser() {
  const db = getPool();

  console.log('🎬 Setting up Cortex Capital demo user\n');

  try {
    // Step 1: Load Alpaca credentials
    console.log('Step 1: Loading Alpaca paper credentials...');
    const creds = JSON.parse(fs.readFileSync('/Users/atlasbuilds/clawd/credentials.json', 'utf8'));
    const alpaca = creds.alpaca;
    console.log(`  ✅ Alpaca paper account: ${alpaca.paper_account_id}`);

    // Step 2: Create or find demo user
    console.log('\nStep 2: Creating demo user...');
    let userResult = await db.query(
      `SELECT id, email, tier FROM users WHERE email = 'demo@cortexcapital.com' LIMIT 1`
    );

    let userId: string;
    if (userResult.rows.length === 0) {
      const createResult = await db.query(
        `INSERT INTO users (email, tier, risk_profile, is_active, password_hash)
         VALUES ('demo@cortexcapital.com', 'partner', 'aggressive', true, 'demo-hash')
         RETURNING id`
      );
      userId = createResult.rows[0].id;
      console.log(`  ✅ Demo user created: ${userId} (Partner tier)`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`  ✅ Demo user found: ${userId} (${userResult.rows[0].tier})`);
    }

    // Step 3: Encrypt Alpaca credentials
    console.log('\nStep 3: Encrypting Alpaca credentials...');
    
    // Set encryption key if not set
    if (!process.env.ENCRYPTION_KEY) {
      const crypto = require('crypto');
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      console.log(`  ⚠️  Generated temporary ENCRYPTION_KEY (use in production)`);
    }

    const { encrypted: encryptedKey, iv: keyIv } = encrypt(alpaca.paper_key);
    const { encrypted: encryptedSecret, iv: secretIv } = encrypt(alpaca.paper_secret);
    console.log(`  ✅ Credentials encrypted`);

    // Step 4: Store broker connection
    console.log('\nStep 4: Connecting Alpaca paper account...');
    
    // Delete existing broker connection
    await db.query(`DELETE FROM broker_credentials WHERE user_id = $1`, [userId]);
    
    await db.query(
      `INSERT INTO broker_credentials (
        user_id, broker_type, encrypted_api_key, encrypted_api_secret, 
        encryption_iv, account_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'alpaca', encryptedKey, encryptedSecret, keyIv, alpaca.paper_account_id, true]
    );
    console.log(`  ✅ Alpaca paper connected`);

    // Step 5: Trigger portfolio discussion
    console.log('\nStep 5: Starting portfolio discussion...');
    const discussion = await startUserPortfolioDiscussion(userId, 'review', db);
    console.log(`  ✅ Discussion generated: ${discussion.id}`);
    console.log(`  📊 Messages: ${discussion.messages.length}`);
    console.log(`  💼 Decisions: ${discussion.decisions.length}`);

    if (discussion.messages.length > 0) {
      console.log('\n  📝 Agent Discussion:');
      for (const msg of discussion.messages) {
        console.log(`    ${msg.agent}: ${msg.content.slice(0, 80)}...`);
      }
    }

    if (discussion.decisions.length > 0) {
      console.log('\n  💰 Trade Decisions:');
      for (const decision of discussion.decisions) {
        console.log(`    ${decision.action.toUpperCase()} ${decision.quantity} ${decision.symbol}`);
      }
    }

    // Step 6: Check pending trades
    console.log('\nStep 6: Checking trade queue...');
    const pendingResult = await db.query(
      `SELECT id, decision_data, status FROM trade_queue WHERE user_id = $1 ORDER BY queued_at DESC LIMIT 5`,
      [userId]
    );
    
    console.log(`  ✅ Queued trades: ${pendingResult.rows.length}`);
    
    for (const trade of pendingResult.rows) {
      const decision = JSON.parse(trade.decision_data);
      console.log(`    ${decision.action.toUpperCase()} ${decision.quantity} ${decision.symbol} - ${trade.status}`);
    }

    console.log('\n✅ DEMO USER READY!\n');
    console.log('Demo Details:');
    console.log(`  User ID: ${userId}`);
    console.log(`  Email: demo@cortexcapital.com`);
    console.log(`  Tier: Partner (full auto-execution)`);
    console.log(`  Broker: Alpaca Paper (${alpaca.paper_account_id})`);
    console.log(`  Balance: ~$98.8k paper money`);
    console.log('\nNext Steps:');
    console.log('  1. Approved trades will auto-execute (Partner tier)');
    console.log('  2. Check trade_history table for fills');
    console.log('  3. Verify on Alpaca paper dashboard');

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

setupDemoUser();
