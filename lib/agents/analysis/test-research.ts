/**
 * Test file for Research Engine
 * 
 * To run: npx tsx test-research.ts
 * 
 * Note: Requires BRAVE_API_KEY environment variable
 */

import { initResearchEngine } from './index';

async function testResearchEngine() {
  console.log('Testing Cortex Capital Research Engine...\n');
  
  // Initialize with environment variable
  const research = initResearchEngine();
  
  // Test symbols
  const testSymbols = ['AAPL', 'MSFT', 'TSLA'];
  
  for (const symbol of testSymbols) {
    console.log(`\n=== Testing ${symbol} ===`);
    
    try {
      // Test news research
      console.log(`1. Fetching news for ${symbol}...`);
      const news = await research.news.searchStockNews(symbol);
      console.log(`   Found ${news.length} news articles`);
      
      // Test news sentiment
      console.log(`2. Analyzing news sentiment for ${symbol}...`);
      const sentiment = await research.news.getNewsSentiment(symbol);
      console.log(`   Sentiment: ${sentiment}`);
      
      // Test breaking news
      console.log(`3. Checking breaking news for ${symbol}...`);
      const breakingNews = await research.news.checkBreakingNews(symbol);
      console.log(`   Breaking news: ${breakingNews.length} catalyst(s)`);
      
      // Test upcoming earnings
      console.log(`4. Checking upcoming earnings for ${symbol}...`);
      const upcomingEarnings = await research.earnings.getUpcomingEarnings(symbol);
      if (upcomingEarnings) {
        console.log(`   Next earnings: ${upcomingEarnings.quarter} ${upcomingEarnings.fiscalYear}`);
      } else {
        console.log(`   No upcoming earnings found`);
      }
      
      // Test earnings history
      console.log(`5. Fetching earnings history for ${symbol}...`);
      const earningsHistory = await research.earnings.getEarningsHistory(symbol);
      console.log(`   Beat rate: ${earningsHistory.beatRate.toFixed(1)}%`);
      console.log(`   History entries: ${earningsHistory.recentHistory.length}`);
      
      // Test earnings whisper
      console.log(`6. Checking earnings whisper for ${symbol}...`);
      const whisper = await research.earnings.checkEarningsWhisper(symbol);
      if (whisper.whisperNumber) {
        console.log(`   Whisper: $${whisper.whisperNumber.toFixed(2)} (${whisper.confidence} confidence)`);
      } else {
        console.log(`   No whisper found (${whisper.confidence} confidence)`);
      }
      
      // Test full research report
      console.log(`7. Generating full research report for ${symbol}...`);
      const fullReport = await research.research.getFullResearch(symbol);
      console.log(`   Overall sentiment: ${fullReport.sentiment}`);
      console.log(`   Confidence: ${fullReport.confidence}%`);
      console.log(`   Risk factors: ${fullReport.riskFactors.length}`);
      console.log(`   Upcoming catalysts: ${fullReport.upcomingCatalysts.length}`);
      console.log(`   Summary: ${fullReport.summary.substring(0, 150)}...`);
      
    } catch (error) {
      console.error(`Error testing ${symbol}:`, error instanceof Error ? error.message : error);
    }
    
    // Small delay between symbols
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Testing batch research ===');
  try {
    const batchReports = await research.research.getBatchResearch(testSymbols);
    console.log(`Batch research completed for ${batchReports.size} symbols`);
    
    for (const [symbol, report] of batchReports) {
      console.log(`  ${symbol}: ${report.sentiment} (${report.confidence}% confidence)`);
    }
  } catch (error) {
    console.error('Error in batch research:', error instanceof Error ? error.message : error);
  }
  
  console.log('\n=== Research engine test complete ===');
}

// Run test if this file is executed directly
if (require.main === module) {
  // Check for BRAVE_API_KEY
  if (!process.env.BRAVE_API_KEY) {
    console.error('ERROR: BRAVE_API_KEY environment variable is not set');
    console.error('Please set it before running tests:');
    console.error('  export BRAVE_API_KEY=your_key_here');
    console.error('Or add it to your .env.local file');
    process.exit(1);
  }
  
  testResearchEngine().catch(console.error);
}

export { testResearchEngine };