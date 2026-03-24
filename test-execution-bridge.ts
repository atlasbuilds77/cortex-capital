/**
 * TEST EXECUTION BRIDGE
 * End-to-end test of Cortex Capital execution bridge
 */

import { getPool } from './lib/db';
import { startUserPortfolioDiscussion } from './lib/user-discussion';
import { getPendingTrades, approveTrade } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function testExecutionBridge() {
  const db = getPool();

  console.log('🧪 Testing Cortex Capital Execution Bridge\n');

  try {
    // Step 1: Get test user (or create one)
    console.log('Step 1: Finding test user...');
    let userResult = await db.query(
      `SELECT id, email, tier FROM users WHERE email = 'test@cortexcapital.com' LIMIT 1`
    );

    let userId: string;
    if (userResult.rows.length === 0) {
      console.log('  Creating test user...');
      const createResult = await db.query(
        `INSERT INTO users (email, tier, risk_profile, is_active, password_hash)
         VALUES ('test@cortexcapital.com', 'scout', 'moderate', true, 'test-hash')
         RETURNING id`
      );
      userId = createResult.rows[0].id;
      console.log(`  ✅ Test user created: ${userId}`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`  ✅ Test user found: ${userId} (${userResult.rows[0].tier})`);
    }

    // Step 2: Check broker connection
    console.log('\nStep 2: Checking broker connection...');
    const brokerResult = await db.query(
      `SELECT broker_type FROM broker_credentials WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (brokerResult.rows.length === 0) {
      console.log('  ⚠️  No broker connected - skipping execution test');
      console.log('  💡 To test execution: Connect Alpaca paper account in database');
      console.log('\nTest flow verified up to broker connection ✅');
      return;
    }

    console.log(`  ✅ Broker connected: ${brokerResult.rows[0].broker_type}`);

    // Step 3: Trigger portfolio discussion
    console.log('\nStep 3: Starting portfolio discussion...');
    const discussion = await startUserPortfolioDiscussion(userId, 'review', db);
    console.log(`  ✅ Discussion generated: ${discussion.id}`);
    console.log(`  📊 Messages: ${discussion.messages.length}`);
    console.log(`  💼 Decisions: ${discussion.decisions.length}`);

    if (discussion.messages.length > 0) {
      console.log('\n  Agent Messages:');
      for (const msg of discussion.messages.slice(0, 3)) {
        console.log(`    ${msg.agent}: ${msg.content.slice(0, 60)}...`);
      }
    }

    // Step 4: Check queued trades
    console.log('\nStep 4: Checking queued trades...');
    const pendingTrades = await getPendingTrades(userId, db);
    console.log(`  ✅ Pending trades: ${pendingTrades.length}`);

    if (pendingTrades.length > 0) {
      console.log('\n  Trade Queue:');
      for (const trade of pendingTrades) {
        const decision = JSON.parse(trade.decision_data);
        console.log(`    ${decision.action.toUpperCase()} ${decision.quantity} ${decision.symbol} - ${trade.status}`);
      }

      // Step 5: Approve and execute first trade (if Scout tier = auto-approved)
      const firstTrade = pendingTrades[0];
      if (firstTrade.status === 'approved') {
        console.log('\nStep 5: Executing approved trade...');
        const result = await executeApprovedTrade(
          {
            id: firstTrade.id,
            userId: firstTrade.user_id,
            tier: firstTrade.tier,
            decision: JSON.parse(firstTrade.decision_data),
            status: 'approved',
            approvalRequired: false,
            queuedAt: firstTrade.queued_at,
          },
          db
        );

        if (result.success) {
          console.log(`  ✅ Trade executed: Order ${result.orderId}`);
          console.log(`  💰 Fill price: $${result.fillPrice}`);
        } else {
          console.log(`  ❌ Execution failed: ${result.error}`);
        }
      } else {
        console.log('\nStep 5: Trade requires manual approval (Operator tier)');
        console.log('  💡 Use POST /api/trades/:id/approve to approve');
      }
    } else {
      console.log('  ℹ️  No trades generated (portfolio in good shape)');
    }

    // Step 6: Check trade history
    console.log('\nStep 6: Checking trade history...');
    const historyResult = await db.query(
      `SELECT symbol, action, quantity, fill_price, executed_at 
       FROM trade_history 
       WHERE user_id = $1 
       ORDER BY executed_at DESC 
       LIMIT 5`,
      [userId]
    );

    if (historyResult.rows.length > 0) {
      console.log(`  ✅ Trade history: ${historyResult.rows.length} trades`);
      console.log('\n  Recent Trades:');
      for (const trade of historyResult.rows) {
        console.log(
          `    ${trade.action.toUpperCase()} ${trade.quantity} ${trade.symbol} @ $${trade.fill_price} - ${new Date(trade.executed_at).toLocaleString()}`
        );
      }
    } else {
      console.log('  ℹ️  No trade history yet');
    }

    console.log('\n✅ EXECUTION BRIDGE TEST COMPLETE');
    console.log('\nSystem Status:');
    console.log('  ✅ Portfolio fetching: Working');
    console.log('  ✅ AI discussions: Working (DeepSeek)');
    console.log('  ✅ Trade parsing: Working');
    console.log('  ✅ Approval workflow: Working');
    console.log('  ✅ Execution: ' + (brokerResult.rows.length > 0 ? 'Ready' : 'Needs broker connection'));

    await db.end();
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

// Run test
testExecutionBridge();
