// Test script for Claw3D integration
// Usage: npx ts-node test-claw3d-integration.ts

import {
  notifyAnalystActivity,
  notifyStrategistActivity,
  notifyExecutorActivity,
  notifyReporterActivity,
  notifyOptionsStrategistActivity,
  notifyDayTraderActivity,
  notifyMomentumActivity,
  configureClaw3D,
  isClaw3DEnabled,
} from './lib/claw3d-integration';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testIntegration(): Promise<void> {
  console.log('🧪 Testing Claw3D Integration...\n');

  // Configure (reads from .env automatically)
  configureClaw3D({
    enabled: true,
    endpoint: process.env.CLAW3D_ENDPOINT || 'http://localhost:3000/api/cortex/activity',
  });

  if (!isClaw3DEnabled()) {
    console.error('❌ Claw3D integration is disabled');
    console.log('Set CLAW3D_ENABLED=true in .env');
    return;
  }

  console.log('✅ Claw3D integration enabled');
  console.log(`📡 Endpoint: ${process.env.CLAW3D_ENDPOINT || 'http://localhost:3000/api/cortex/activity'}\n`);

  // Test each agent
  console.log('📊 Testing ANALYST...');
  await notifyAnalystActivity('Reviewing portfolio for test_user', { userId: 'test_user' });
  await sleep(1000);

  console.log('♟️  Testing STRATEGIST...');
  await notifyStrategistActivity('Analyzing market conditions');
  await sleep(1000);

  console.log('⚡ Testing EXECUTOR...');
  await notifyExecutorActivity('Placed BUY order for AAPL', 'BUY', 'AAPL');
  await sleep(1000);

  console.log('📝 Testing REPORTER...');
  await notifyReporterActivity('Generating test report', 'test');
  await sleep(1000);

  console.log('🎯 Testing OPTIONS_STRATEGIST...');
  await notifyOptionsStrategistActivity('Calculating Greeks for SPY', 'SPY');
  await sleep(1000);

  console.log('📈 Testing DAY_TRADER...');
  await notifyDayTraderActivity('Scanning momentum signals', { sector: 'tech' });
  await sleep(1000);

  console.log('🚀 Testing MOMENTUM...');
  await notifyMomentumActivity('Tracking sector rotation', { sector: 'energy' });
  await sleep(1000);

  console.log('\n✅ All tests complete!');
  console.log('Check Claw3D at http://localhost:3000 to see agents working');
}

// Run if called directly
if (require.main === module) {
  testIntegration()
    .then(() => {
      console.log('\n✨ Integration test complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testIntegration };
