// Test script for Phase 1 Playbook System
// Fetches current positions from Alpaca paper account and classifies them

import dotenv from 'dotenv';
import { getPositions, getLatestQuote } from './integrations/alpaca';
import { classifyPositions, getUnderlyingSymbols } from './agents/position-classifier';
import { getPlaybookContexts, formatContextForAgent } from './agents/playbook-context';

dotenv.config();

async function testPlaybookSystem() {
  console.log('=== CORTEX CAPITAL - PLAYBOOK SYSTEM TEST ===\n');
  
  try {
    // Fetch all positions
    console.log('Fetching positions from Alpaca paper account...');
    const positions = await getPositions();
    
    if (positions.length === 0) {
      console.log('No positions found in account.');
      return;
    }
    
    console.log(`Found ${positions.length} positions\n`);
    
    // Get underlying prices for options
    console.log('Fetching underlying prices...');
    const underlyingSymbols = getUnderlyingSymbols(positions);
    const underlyingPrices = new Map<string, number>();
    
    for (const symbol of underlyingSymbols) {
      try {
        const quote = await getLatestQuote(symbol);
        const midPrice = (quote.ask_price + quote.bid_price) / 2;
        underlyingPrices.set(symbol, midPrice);
        console.log(`  ${symbol}: $${midPrice.toFixed(2)}`);
      } catch (error) {
        console.error(`  Failed to fetch ${symbol}:`, error);
      }
    }
    
    console.log('\n--- POSITION CLASSIFICATION ---\n');
    
    // Classify all positions
    const classified = classifyPositions(positions, underlyingPrices);
    
    // Display classification results
    for (const position of classified) {
      console.log(`\n📊 ${position.symbol}`);
      console.log(`   Asset Class: ${position.assetClass.toUpperCase()}`);
      console.log(`   Playbook: ${position.playbook}`);
      
      if (position.assetClass === 'option') {
        console.log(`   Type: ${position.optionType?.toUpperCase()}`);
        console.log(`   Strike: $${position.strike?.toFixed(2)}`);
        console.log(`   Expiry: ${position.expiryDate?.toISOString().split('T')[0]}`);
        console.log(`   DTE: ${position.dte} days`);
        console.log(`   Underlying: ${position.underlyingSymbol} @ $${position.underlyingPrice?.toFixed(2)}`);
      }
      
      console.log(`   Entry Price: $${position.entryPrice.toFixed(2)}`);
      console.log(`   Current Price: $${position.currentPrice.toFixed(2)}`);
      console.log(`   P&L: ${position.unrealizedPnlPct.toFixed(2)}%`);
      console.log(`   Qty: ${position.qty}`);
      console.log(`   Market Value: $${position.marketValue.toFixed(2)}`);
      
      if (position.alerts.length > 0) {
        console.log(`   🚨 ALERTS:`);
        position.alerts.forEach(alert => console.log(`      ${alert}`));
      }
    }
    
    console.log('\n\n--- PLAYBOOK CONTEXTS ---\n');
    
    // Generate playbook contexts
    const contexts = getPlaybookContexts(classified);
    
    // Show one example context in detail
    if (contexts.length > 0) {
      const exampleContext = contexts[0];
      console.log(`Example Context for ${exampleContext.position.symbol}:\n`);
      console.log(formatContextForAgent(exampleContext));
    }
    
    // Summary statistics
    console.log('\n\n--- SUMMARY ---\n');
    
    const playbookCounts = new Map<string, number>();
    for (const pos of classified) {
      playbookCounts.set(pos.playbook, (playbookCounts.get(pos.playbook) || 0) + 1);
    }
    
    console.log('Positions by Playbook:');
    playbookCounts.forEach((count, playbook) => {
      console.log(`  ${playbook}: ${count}`);
    });
    
    const alertCount = classified.reduce((sum, pos) => sum + pos.alerts.length, 0);
    console.log(`\nTotal Alerts: ${alertCount}`);
    
    const criticalPositions = classified.filter(pos => 
      pos.dte !== undefined && pos.dte <= 1
    );
    
    if (criticalPositions.length > 0) {
      console.log(`\n⚠️ CRITICAL: ${criticalPositions.length} positions expire within 1 day`);
      criticalPositions.forEach(pos => {
        console.log(`   - ${pos.symbol} (DTE: ${pos.dte}, P&L: ${pos.unrealizedPnlPct.toFixed(2)}%)`);
      });
    }
    
    console.log('\n✅ Playbook system test complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPlaybookSystem();
