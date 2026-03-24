// Test file for new Tradier API functions
// Run with: npx ts-node test-tradier-api.ts

import {
  getQuote,
  getQuotes,
  getOptionsChain,
  getNews,
  getSectorPerformance,
  getETFHoldings
} from './integrations/tradier';

async function testTradierAPI() {
  console.log('Testing Tradier API functions...\n');
  
  try {
    // Test 1: getQuote
    console.log('1. Testing getQuote(AAPL)...');
    const quote = await getQuote('AAPL');
    console.log('✅ Quote:', quote ? `${quote.symbol} $${quote.last}` : 'null');
    
    // Test 2: getQuotes
    console.log('\n2. Testing getQuotes([SPY, QQQ])...');
    const quotes = await getQuotes(['SPY', 'QQQ']);
    console.log(`✅ Quotes: ${quotes.length} symbols`);
    
    // Test 3: getOptionsChain
    console.log('\n3. Testing getOptionsChain(SPY)...');
    const chain = await getOptionsChain('SPY');
    console.log(`✅ Options chain: ${chain.options.length} options`);
    if (chain.options.length > 0) {
      console.log(`   First option: ${chain.options[0].symbol} strike ${chain.options[0].strike}`);
    }
    
    // Test 4: getNews
    console.log('\n4. Testing getNews(AAPL)...');
    const news = await getNews('AAPL');
    console.log(`✅ News: ${news.length} articles`);
    if (news.length > 0) {
      console.log(`   Latest: ${news[0].headline.substring(0, 60)}...`);
    }
    
    // Test 5: getSectorPerformance
    console.log('\n5. Testing getSectorPerformance()...');
    const sectors = await getSectorPerformance();
    console.log(`✅ Sectors: ${sectors.length} sector ETFs`);
    if (sectors.length > 0) {
      console.log(`   Top performer: ${sectors[0].symbol} ${sectors[0].name} ${sectors[0].change_percentage}%`);
    }
    
    // Test 6: getETFHoldings
    console.log('\n6. Testing getETFHoldings(SPY)...');
    const holdings = await getETFHoldings('SPY');
    console.log(`✅ Holdings: ${holdings.length} (note: Tradier API limitation)`);
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTradierAPI();
