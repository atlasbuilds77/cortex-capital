/**
 * BUILD FULL PORTFOLIO
 * Deploy full aggressive portfolio with stocks + options
 */

import { getPool } from './lib/db';
import { queueTradeForApproval } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function buildFullPortfolio() {
  const db = getPool();
  const userId = '8fc842af-fdbb-46b8-a800-0b3bd1d8d757';

  console.log('🔥 Building FULL aggressive portfolio (Partner tier)\n');
  console.log('Portfolio: $98.8k cash → Deploy $70k (70%)');
  console.log('Strategy: 5 stocks (50%) + Options positions (20%)\n');

  // Portfolio allocation (based on DeepSeek recommendations)
  const stockTrades = [
    { symbol: 'NVDA', allocation: 0.15, shares: 17 },  // 15% = $14.8k ≈ 17 shares @ $915
    { symbol: 'MSFT', allocation: 0.12, shares: 31 },  // 12% = $11.9k ≈ 31 shares @ $430
    { symbol: 'AMD', allocation: 0.10, shares: 100 },  // 10% = $9.9k ≈ 100 shares @ $170
    { symbol: 'META', allocation: 0.08, shares: 17 },  // 8% = $7.9k ≈ 17 shares @ $590
    { symbol: 'TSLA', allocation: 0.05, shares: 29 },  // 5% = $4.9k ≈ 29 shares @ $270
  ];

  try {
    console.log('═══════════════════════════════════════════════');
    console.log('PART 1: STOCK POSITIONS (50% of portfolio)');
    console.log('═══════════════════════════════════════════════\n');

    for (const trade of stockTrades) {
      const decision = {
        id: `dec-${Date.now()}-${trade.symbol}`,
        symbol: trade.symbol,
        action: 'buy' as const,
        quantity: trade.shares,
        instrumentType: 'stock' as const,
        confidence: 0.85,
        reasoning: `AI-powered portfolio allocation: ${trade.allocation * 100}% position`,
      };

      console.log(`${trade.symbol}: BUY ${trade.shares} shares (${trade.allocation * 100}% allocation)`);
      
      const queued = await queueTradeForApproval(userId, 'partner', decision, db);
      const result = await executeApprovedTrade(queued, db);
      
      if (result.success) {
        console.log(`  ✅ Executed - Order ${result.orderId}\n`);
      } else {
        console.log(`  ❌ Failed - ${result.error}\n`);
      }

      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('PART 2: OPTIONS POSITIONS (20% of portfolio)');
    console.log('═══════════════════════════════════════════════\n');

    // Options trades (LEAPS for Partner tier)
    const optionsTrades = [
      {
        symbol: 'NVDA',
        optionSymbol: 'NVDA250117C01000000', // Jan 2025 $1000 call
        quantity: 2,
        reasoning: 'NVDA LEAPS call - AI infrastructure play',
      },
      {
        symbol: 'TSLA', 
        optionSymbol: 'TSLA250117C00300000', // Jan 2025 $300 call
        quantity: 3,
        reasoning: 'TSLA LEAPS call - High beta growth',
      },
    ];

    for (const trade of optionsTrades) {
      const decision = {
        id: `dec-${Date.now()}-${trade.symbol}-opt`,
        symbol: trade.optionSymbol,
        action: 'buy' as const,
        quantity: trade.quantity,
        instrumentType: 'option' as const,
        confidence: 0.80,
        reasoning: trade.reasoning,
      };

      console.log(`${trade.symbol} Options: BUY ${trade.quantity} contracts`);
      console.log(`  Contract: ${trade.optionSymbol}`);
      
      const queued = await queueTradeForApproval(userId, 'partner', decision, db);
      const result = await executeApprovedTrade(queued, db);
      
      if (result.success) {
        console.log(`  ✅ Executed - Order ${result.orderId}\n`);
      } else {
        console.log(`  ❌ Failed - ${result.error}\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('PORTFOLIO BUILD COMPLETE');
    console.log('═══════════════════════════════════════════════\n');

    const historyResult = await db.query(
      `SELECT symbol, action, quantity, order_id, executed_at 
       FROM trade_history 
       WHERE user_id = $1 
       ORDER BY executed_at DESC`,
      [userId]
    );

    console.log(`Total Trades Executed: ${historyResult.rows.length}\n`);
    console.log('Position Summary:');
    for (const trade of historyResult.rows) {
      console.log(`  ${trade.action.toUpperCase()} ${trade.quantity} ${trade.symbol} - ${new Date(trade.executed_at).toLocaleTimeString()}`);
    }

    console.log('\n✅ FULL PORTFOLIO DEPLOYED!');
    console.log('\nNext Steps:');
    console.log('  1. Check Alpaca paper dashboard');
    console.log('  2. Monitor positions in real-time');
    console.log('  3. Daily 6:30 AM AI discussions will manage portfolio');
    console.log('  4. Partner tier = full autonomy (auto rebalance, options, everything)');

    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    await db.end();
    process.exit(1);
  }
}

buildFullPortfolio();
