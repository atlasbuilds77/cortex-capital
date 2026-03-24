/**
 * EXECUTE DEMO TRADE
 * Manually queue and execute a trade on Alpaca paper
 */

import { getPool } from './lib/db';
import { queueTradeForApproval } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function executeDemoTrade() {
  const db = getPool();
  const userId = '8fc842af-fdbb-46b8-a800-0b3bd1d8d757';

  console.log('💰 Executing demo trade on Alpaca paper\n');

  try {
    // Create a simple trade decision (buy 1 share of SPY)
    const decision = {
      id: `dec-${Date.now()}`,
      symbol: 'SPY',
      action: 'buy' as const,
      quantity: 1,
      instrumentType: 'stock' as const,
      confidence: 0.85,
      reasoning: 'Demo trade for Cortex Capital execution bridge test',
    };

    console.log(`Trade Decision: BUY ${decision.quantity} ${decision.symbol}\n`);

    // Queue trade (Partner tier = auto-approved)
    console.log('Step 1: Queuing trade...');
    const queued = await queueTradeForApproval(userId, 'partner', decision, db);
    console.log(`  ✅ Trade queued: ${queued.id}`);
    console.log(`  📊 Status: ${queued.status} (Partner tier = auto-approved)\n`);

    // Execute approved trade
    console.log('Step 2: Executing on Alpaca paper...');
    const result = await executeApprovedTrade(queued, db);

    if (result.success) {
      console.log(`  ✅ TRADE EXECUTED!`);
      console.log(`  📝 Order ID: ${result.orderId}`);
      if (result.fillPrice) {
        console.log(`  💰 Fill Price: $${result.fillPrice}`);
      }
      if (result.fillQuantity) {
        console.log(`  📊 Fill Quantity: ${result.fillQuantity}`);
      }
      console.log(`  ⏰ Executed At: ${result.executedAt}\n`);
    } else {
      console.log(`  ❌ EXECUTION FAILED`);
      console.log(`  Error: ${result.error}`);
      console.log(`  Code: ${result.errorCode}\n`);
    }

    // Check trade history
    console.log('Step 3: Checking trade history...');
    const historyResult = await db.query(
      `SELECT symbol, action, quantity, fill_price, executed_at 
       FROM trade_history 
       WHERE user_id = $1 
       ORDER BY executed_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (historyResult.rows.length > 0) {
      const trade = historyResult.rows[0];
      console.log(`  ✅ Trade logged to database`);
      console.log(`  ${trade.action.toUpperCase()} ${trade.quantity} ${trade.symbol} @ $${trade.fill_price}\n`);
    }

    console.log('✅ DEMO COMPLETE!\n');
    console.log('Next Steps:');
    console.log('  1. Login to Alpaca paper dashboard');
    console.log('  2. Check Orders tab for execution');
    console.log('  3. Verify fill price matches database');

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

executeDemoTrade();
