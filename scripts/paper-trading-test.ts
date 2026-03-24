#!/usr/bin/env npx tsx
// Cortex Capital - Paper Trading Test
// Run: npx tsx scripts/paper-trading-test.ts

import dotenv from 'dotenv';
dotenv.config();

import alpaca from '../integrations/alpaca';

async function testAlpacaPaperTrading() {
  console.log('\n🧪 CORTEX CAPITAL - PAPER TRADING TEST\n');
  console.log('=' .repeat(50));
  
  // Check configuration
  if (!alpaca.isConfigured()) {
    console.log('❌ Alpaca not configured. Add to .env:');
    console.log('   ALPACA_KEY=your_key');
    console.log('   ALPACA_SECRET=your_secret');
    console.log('   ALPACA_PAPER=true');
    return;
  }
  
  console.log(`📍 Mode: ${alpaca.isPaperTrading() ? 'PAPER TRADING' : '⚠️ LIVE TRADING'}\n`);
  
  try {
    // 1. Get Account
    console.log('1️⃣ Getting account info...');
    const account = await alpaca.getAccount();
    console.log(`   Account: ${account.account_number}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Cash: $${parseFloat(account.cash).toLocaleString()}`);
    console.log(`   Portfolio Value: $${parseFloat(account.portfolio_value).toLocaleString()}`);
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);
    console.log(`   Day Trades: ${account.daytrade_count}/3`);
    console.log('');
    
    // 2. Get Positions
    console.log('2️⃣ Current positions...');
    const positions = await alpaca.getPositions();
    if (positions.length === 0) {
      console.log('   No open positions\n');
    } else {
      for (const pos of positions) {
        const pnl = parseFloat(pos.unrealized_pl);
        const pnlPct = parseFloat(pos.unrealized_plpc) * 100;
        console.log(`   ${pos.symbol}: ${pos.qty} shares @ $${pos.avg_entry_price}`);
        console.log(`      Current: $${pos.current_price} | P&L: $${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`);
      }
      console.log('');
    }
    
    // 3. Test Quote
    console.log('3️⃣ Getting SPY quote...');
    const quote = await alpaca.getLatestQuote('SPY');
    console.log(`   Bid: $${quote.bid_price} x ${quote.bid_size}`);
    console.log(`   Ask: $${quote.ask_price} x ${quote.ask_size}`);
    console.log('');
    
    // 4. Test Order (small, immediately cancel)
    console.log('4️⃣ Testing order placement...');
    const testOrder = await alpaca.placeOrder({
      symbol: 'SPY',
      qty: 1,
      side: 'buy',
      type: 'limit',
      time_in_force: 'day',
      limit_price: quote.bid_price - 10, // Way below market, won't fill
    });
    console.log(`   Order placed: ${testOrder.id}`);
    console.log(`   Status: ${testOrder.status}`);
    
    // Cancel it
    await alpaca.cancelOrder(testOrder.id);
    console.log('   ✅ Order cancelled (test successful)\n');
    
    // 5. Summary
    console.log('=' .repeat(50));
    console.log('✅ PAPER TRADING TEST COMPLETE\n');
    console.log('Ready to run strategies on paper account!');
    console.log(`Available capital: $${parseFloat(account.buying_power).toLocaleString()}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run
testAlpacaPaperTrading();
