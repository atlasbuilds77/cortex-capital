// Test script for Technical Analysis Engine
import { getRSI, getMACD, getIchimoku, getBollinger } from './technical-indicators';
import { getSectorMomentum, getTopSectors } from './sector-momentum';
import { generateSignal, generateSignalsForSymbols, rankSignals } from './signal-generator';

async function testTechnicalIndicators() {
  console.log('Testing Technical Indicators...\n');
  
  try {
    // Test RSI
    const rsi = await getRSI('AAPL');
    console.log('RSI Result:', {
      value: rsi.value.toFixed(2),
      signal: rsi.signal,
      confidence: rsi.confidence
    });
    
    // Test MACD
    const macd = await getMACD('AAPL');
    console.log('\nMACD Result:', {
      macd: macd.macd.toFixed(4),
      signal: macd.signal.toFixed(4),
      histogram: macd.histogram.toFixed(4),
      signalType: macd.signalType,
      confidence: macd.confidence
    });
    
    // Test Ichimoku
    const ichimoku = await getIchimoku('AAPL');
    console.log('\nIchimoku Result:', {
      tenkan: ichimoku.tenkan.toFixed(2),
      kijun: ichimoku.kijun.toFixed(2),
      cloudDirection: ichimoku.cloudDirection,
      kumoTwist: ichimoku.kumoTwist,
      confidence: ichimoku.confidence
    });
    
    // Test Bollinger Bands
    const bollinger = await getBollinger('AAPL');
    console.log('\nBollinger Bands Result:', {
      upper: bollinger.upper.toFixed(2),
      middle: bollinger.middle.toFixed(2),
      lower: bollinger.lower.toFixed(2),
      percentB: bollinger.percentB.toFixed(1),
      signal: bollinger.signal,
      confidence: bollinger.confidence
    });
    
  } catch (error) {
    console.error('Error testing technical indicators:', error);
  }
}

async function testSectorMomentum() {
  console.log('\n\nTesting Sector Momentum...\n');
  
  try {
    const sectors = await getSectorMomentum();
    console.log(`Analyzed ${sectors.length} sectors`);
    
    const topSectors = await getTopSectors(3);
    console.log('\nTop 3 Sectors:');
    topSectors.forEach(sector => {
      console.log(`  ${sector.symbol} (${sector.name}):`);
      console.log(`    Rank: ${sector.rank}`);
      console.log(`    Momentum Score: ${sector.momentumScore}`);
      console.log(`    Trend: ${sector.trend}`);
      console.log(`    Confidence: ${sector.confidence}%`);
    });
    
  } catch (error) {
    console.error('Error testing sector momentum:', error);
  }
}

async function testSignalGenerator() {
  console.log('\n\nTesting Signal Generator...\n');
  
  try {
    // Test single symbol
    const signal = await generateSignal('AAPL');
    console.log('AAPL Signal Analysis:');
    console.log(`  Action: ${signal.signal.action}`);
    console.log(`  Confidence: ${signal.signal.confidence}%`);
    console.log(`  Time Frame: ${signal.signal.timeFrame}`);
    console.log(`  Risk Level: ${signal.signal.riskLevel}`);
    console.log('  Reasons:', signal.signal.reasons);
    
    if (signal.conflictingSignals.length > 0) {
      console.log('  Conflicting Signals:', signal.conflictingSignals);
    }
    
    // Test multiple symbols
    console.log('\nTesting Multiple Symbols (AAPL, MSFT, TSLA)...');
    const symbols = ['AAPL', 'MSFT', 'TSLA'];
    const signals = await generateSignalsForSymbols(symbols);
    
    const ranked = rankSignals(signals);
    console.log('\nRanked Signals:');
    ranked.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.symbol}: ${item.analysis.signal.action} (${item.analysis.signal.confidence}% confidence)`);
    });
    
  } catch (error) {
    console.error('Error testing signal generator:', error);
  }
}

async function runAllTests() {
  console.log('=== Cortex Capital Technical Analysis Engine Test ===\n');
  
  await testTechnicalIndicators();
  await testSectorMomentum();
  await testSignalGenerator();
  
  console.log('\n=== Test Complete ===');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testTechnicalIndicators, testSectorMomentum, testSignalGenerator, runAllTests };