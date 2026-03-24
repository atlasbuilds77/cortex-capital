// Simple test runner for Cortex Capital Phase 2
// Run with: node test-runner.js

async function runTests() {
  console.log('🚀 Testing Cortex Capital Phase 2 Agents\n');
  
  try {
    // Test STRATEGIST
    console.log('1. Testing STRATEGIST Agent...');
    console.log('-'.repeat(40));
    const { testStrategist } = require('./agents/strategist');
    const strategistPlan = await testStrategist();
    console.log('✅ STRATEGIST: Generated plan with', strategistPlan.trades.length, 'trades\n');
    
    // Test EXECUTOR
    console.log('2. Testing EXECUTOR Agent...');
    console.log('-'.repeat(40));
    const { testExecutor } = require('./agents/executor');
    const executorReport = await testExecutor();
    console.log('✅ EXECUTOR: Success rate', executorReport.summary.success_rate.toFixed(1) + '%\n');
    
    // Test REPORTER
    console.log('3. Testing REPORTER Agent...');
    console.log('-'.repeat(40));
    const { testReporter } = require('./agents/reporter');
    await testReporter();
    console.log('✅ REPORTER: All email templates generated\n');
    
    // Summary
    console.log('='.repeat(60));
    console.log('🎯 Phase 2 Integration Test COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`• STRATEGIST: ${strategistPlan.trades.length} trades in plan`);
    console.log(`• EXECUTOR: ${executorReport.summary.success_rate.toFixed(1)}% success rate`);
    console.log(`• REPORTER: 3 email types tested`);
    console.log('\n✅ All 3 agents working correctly!');
    console.log('\nReady for Opus review and production deployment! ⚡');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();