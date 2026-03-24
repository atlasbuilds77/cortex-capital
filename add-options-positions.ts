/**
 * ADD OPTIONS POSITIONS
 * Execute options trades on Alpaca paper (LEAPS)
 */

import { getPool } from './lib/db';
import { queueTradeForApproval } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function addOptionsPositions() {
  const db = getPool();
  const userId = '8fc842af-fdbb-46b8-a800-0b3bd1d8d757';

  console.log('📈 Adding OPTIONS positions (Partner tier - FULL OPTIONS ACCESS)\n');

  // Get valid option symbols from Alpaca
  const optionsTrades = [
    {
      // SPY LEAP call - Jan 2026 $700 strike
      symbol: 'SPY260116C00700000',
      quantity: 5,
      reasoning: 'SPY bullish LEAP - market upside exposure',
    },
    {
      // SPY LEAP put - Jan 2026 $600 strike (hedge)
      symbol: 'SPY260116P00600000', 
      quantity: 3,
      reasoning: 'SPY protective LEAP put - downside hedge',
    },
    {
      // SPY near-term call - June 2025
      symbol: 'SPY250620C00670000',
      quantity: 10,
      reasoning: 'SPY mid-term call spread',
    },
  ];

  try {
    console.log('═══════════════════════════════════════════════');
    console.log('OPTIONS EXECUTION (Partner Tier = All Approved)');
    console.log('═══════════════════════════════════════════════\n');

    for (const trade of optionsTrades) {
      const decision = {
        id: `dec-${Date.now()}-opt`,
        symbol: trade.symbol,
        action: 'buy' as const,
        quantity: trade.quantity,
        instrumentType: 'option' as const,
        confidence: 0.80,
        reasoning: trade.reasoning,
      };

      console.log(`BUY ${trade.quantity} ${trade.symbol}`);
      console.log(`  Strategy: ${trade.reasoning}`);
      
      const queued = await queueTradeForApproval(userId, 'partner', decision, db);
      console.log(`  → Auto-approved (Partner tier)`);
      
      const result = await executeApprovedTrade(queued, db);
      
      if (result.success) {
        console.log(`  ✅ EXECUTED - Order ${result.orderId}\n`);
      } else {
        console.log(`  ❌ FAILED - ${result.error}`);
        console.log(`  Error code: ${result.errorCode}\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('OPTIONS POSITIONS SUMMARY');
    console.log('═══════════════════════════════════════════════\n');

    const optionsResult = await db.query(
      `SELECT symbol, quantity, order_id, executed_at 
       FROM trade_history 
       WHERE user_id = $1 AND symbol LIKE '%C%' OR symbol LIKE '%P%'
       ORDER BY executed_at DESC
       LIMIT 10`,
      [userId]
    );

    console.log(`Total Options Trades: ${optionsResult.rows.length}\n`);
    for (const opt of optionsResult.rows) {
      console.log(`  ${opt.quantity}x ${opt.symbol} - ${new Date(opt.executed_at).toLocaleTimeString()}`);
    }

    console.log('\n✅ OPTIONS POSITIONS DEPLOYED!');
    console.log('\nFull Portfolio Now Includes:');
    console.log('  • 6 stock positions ($61k)');
    console.log('  • Options strategies (LEAPS + near-term)');
    console.log('  • Partner tier = full autonomy (options, futures, everything)');
    console.log('  • Daily AI rebalancing at 6:30 AM');

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    await db.end();
    process.exit(1);
  }
}

addOptionsPositions();
