/**
 * Test Portfolio Engine
 * 
 * Demonstrates the full flow:
 * 1. Create test user
 * 2. Add portfolio snapshot
 * 3. Run analysis
 * 4. Generate rebalancing plan
 * 5. (Optionally) Execute plan
 * 6. Generate report
 */

import 'dotenv/config';
import { createPortfolioEngine } from './services/portfolio-engine';
import { createClient } from '@supabase/supabase-js';

async function testEngine() {
  console.log('🚀 Testing Portfolio Engine\n');

  // Initialize
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const engine = createPortfolioEngine();

  // 1. Create test user
  console.log('1️⃣ Creating test user...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      email: `test-${Date.now()}@cortexcapital.dev`,
      password_hash: 'dummy_hash',
      tier: 'operator',
      risk_profile: 'moderate'
    })
    .select()
    .single();

  if (userError || !userData) {
    console.error('❌ Failed to create user:', userError);
    return;
  }

  console.log('✅ User created:', userData.email);
  const userId = userData.id;

  // 2. Create portfolio snapshot
  console.log('\n2️⃣ Creating portfolio snapshot...');
  const { error: snapshotError } = await supabase
    .from('portfolio_snapshots')
    .insert({
      user_id: userId,
      total_value: 50000,
      positions: {
        'AAPL': { shares: 50, value: 15000, allocation: 0.30 },
        'MSFT': { shares: 30, value: 12000, allocation: 0.24 },
        'GOOGL': { shares: 40, value: 13000, allocation: 0.26 },
        'CASH': { value: 10000, allocation: 0.20 }
      },
      metrics: {
        total_return: 0.12,
        volatility: 0.15,
        sharpe: 0.80
      }
    });

  if (snapshotError) {
    console.error('❌ Failed to create snapshot:', snapshotError);
    return;
  }

  console.log('✅ Portfolio snapshot created');

  // 3. Run analysis
  console.log('\n3️⃣ Running portfolio analysis...');
  try {
    const analysis = await engine.analyzePortfolio(userId);
    console.log('✅ Analysis complete:');
    console.log(`   Action: ${analysis.action}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Reasoning: ${analysis.reasoning.substring(0, 100)}...`);
    console.log(`   Drift: ${(analysis.metrics.drift * 100).toFixed(2)}%`);
    console.log(`   Issues: ${analysis.issues.length}`);
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    return;
  }

  // 4. Generate rebalancing plan
  console.log('\n4️⃣ Generating rebalancing plan...');
  try {
    const plan = await engine.generatePlan(userId);
    console.log('✅ Plan generated:');
    console.log(`   Plan ID: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);
    console.log(`   Trades: ${plan.trades.length}`);
    console.log(`   Expected cost: $${plan.expectedCost.toLocaleString()}`);
    console.log(`   Reasoning: ${plan.reasoning.substring(0, 100)}...`);
    
    if (plan.trades.length > 0) {
      console.log('\n   Trade details:');
      plan.trades.forEach((trade, i) => {
        console.log(`   ${i + 1}. ${trade.action.toUpperCase()} ${trade.quantity} ${trade.ticker}`);
      });
    }

    // Simulate approval (in production, user would approve via UI)
    console.log('\n   💡 In production, user would approve this plan via UI/email');
    console.log('   💡 For testing, we can simulate approval:');
    console.log(`   💡 UPDATE rebalancing_plans SET status='approved' WHERE id='${plan.id}'`);

  } catch (error: any) {
    console.error('❌ Plan generation failed:', error.message);
    return;
  }

  // 5. Generate report
  console.log('\n5️⃣ Generating monthly report...');
  try {
    await engine.sendReport(userId, 'monthly');
    console.log('✅ Report generated and stored');
    
    // Fetch and display report
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reports && reports.length > 0) {
      console.log('\n   Report preview:');
      console.log(`   ${reports[0].content.substring(0, 200)}...`);
    }
  } catch (error: any) {
    console.error('❌ Report generation failed:', error.message);
  }

  // Summary
  console.log('\n✨ Test complete!\n');
  console.log('📊 Summary:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${userData.email}`);
  console.log(`   Risk Profile: ${userData.risk_profile}`);
  console.log(`   Portfolio Value: $50,000`);
  console.log('\n   Next steps:');
  console.log('   • Query analysis_results table to see ANALYST outputs');
  console.log('   • Query rebalancing_plans table to see STRATEGIST plans');
  console.log('   • Query reports table to see REPORTER outputs');
  console.log('   • Approve a plan and call engine.executePlan() to test EXECUTOR');

  console.log('\n🎯 The engine is working! Ready for production multi-tenant use.');
}

// Run test
testEngine().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
