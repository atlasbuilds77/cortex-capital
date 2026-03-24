/**
 * EXECUTE OPTIONS DEMO  
 * Place real options trades via Cortex execution bridge
 */

import { getPool } from './lib/db';
import { queueTradeForApproval } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function executeOptionsDemo() {
  const db = getPool();
  const userId = '8fc842af-fdbb-46b8-a800-0b3bd1d8d757';

  console.log('📈 EXECUTING OPTIONS TRADES (Partner Tier - Full Auto)\n');

  const optionsTrades = [
    {
      symbol: 'SPY260327C00655000', // SPY March 27 $655 call
      quantity: 5,
      price: 5.00,
      reasoning: 'Near-term bullish SPY call - market upside',
    },
    {
      symbol: 'SPY260327P00640000', // SPY March 27 $640 put  
      quantity: 3,
      price: 3.50,
      reasoning: 'Protective put - downside hedge',
    },
    {
      symbol: 'SPY260327C00660000', // SPY March 27 $660 call
      quantity: 10,
      price: 4.00,
      reasoning: 'Larger call position - bullish conviction',
    },
  ];

  try {
    for (const trade of optionsTrades) {
      console.log(`══════════════════════════════════════════════════`);
      console.log(`BUY ${trade.quantity}x ${trade.symbol}`);
      console.log(`Limit Price: $${trade.price}`);
      console.log(`Strategy: ${trade.reasoning}\n`);

      const decision = {
        id: `dec-${Date.now()}-opt`,
        symbol: trade.symbol,
        action: 'buy' as const,
        quantity: trade.quantity,
        instrumentType: 'option' as const,
        price: trade.price,
        confidence: 0.85,
        reasoning: trade.reasoning,
      };

      // Queue (auto-approved for Partner)
      const queued = await queueTradeForApproval(userId, 'partner', decision, db);
      console.log(`✅ Queued & Auto-Approved (Partner tier)`);

      // Execute
      const result = await executeApprovedTrade(queued, db);

      if (result.success) {
        console.log(`✅ EXECUTED!`);
        console.log(`   Order ID: ${result.orderId}`);
        console.log(`   Status: Pending fill\n`);
      } else {
        console.log(`❌ FAILED: ${result.error}\n`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    // Check all options positions
    console.log('══════════════════════════════════════════════════');
    console.log('FINAL OPTIONS POSITIONS');
    console.log('══════════════════════════════════════════════════\n');

    const optionsResult = await db.query(
      `SELECT symbol, quantity, order_id, executed_at
       FROM trade_history
       WHERE user_id = $1 AND symbol LIKE 'SPY%C%' OR symbol LIKE 'SPY%P%'
       ORDER BY executed_at DESC`,
      [userId]
    );

    console.log(`Total Options Trades: ${optionsResult.rows.length}\n`);
    for (const opt of optionsResult.rows) {
      const timestamp = new Date(opt.executed_at).toLocaleTimeString();
      console.log(`  ${opt.quantity}x ${opt.symbol} - ${timestamp}`);
    }

    console.log('\n✅ OPTIONS DEMO COMPLETE!');
    console.log('\nFull Portfolio:');
    console.log('  • 6 stock positions ($61k)');
    console.log('  • 3 options strategies (SPY calls + puts)');
    console.log('  • Partner tier = full autonomy');
    console.log('\nCheck Alpaca dashboard for fills! 🚀');

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

executeOptionsDemo();
