/**
 * CORTEX CAPITAL - ONBOARDING SYSTEM TEST
 * Demonstrates the full onboarding flow
 */

import { OnboardingService, RISK_QUESTIONS } from './services/onboarding-flow';
import { analyzeStock } from './lib/stock-analyzer';
import { buildPortfolio } from './lib/portfolio-builder';
import type { UserPreferences } from './lib/preferences';

async function testOnboardingFlow() {
  console.log('🚀 CORTEX CAPITAL - ONBOARDING SYSTEM TEST\n');
  
  // Create new onboarding session
  const userId = 'test-user-123';
  const onboarding = new OnboardingService(userId);
  
  console.log('=== STEP 1: Basic Info ===');
  await onboarding.submitBasicInfo({
    name: 'Test User',
    email: 'test@example.com',
  });
  console.log('✅ Basic info submitted\n');
  
  console.log('=== STEP 2: Risk Assessment ===');
  const riskAnswers = {
    volatility_comfort: 'buy_more',      // Score: 4
    investment_experience: 'advanced',    // Score: 4
    time_commitment: 'daily',            // Score: 4
    loss_tolerance: 'high',              // Score: 3
    return_expectations: 'aggressive',    // Score: 3
  };
  
  const riskProfile = await onboarding.submitRiskAssessment(riskAnswers);
  console.log(`✅ Risk profile: ${riskProfile}\n`);
  
  console.log('=== STEP 3: Goals & Timeline ===');
  await onboarding.submitGoalsTimeline({
    goal: 'wealth_building',
    time_horizon: '10+ years',
  });
  console.log('✅ Goals submitted\n');
  
  console.log('=== STEP 4: Sector Interests ===');
  await onboarding.submitSectorInterests([
    'technology',
    'clean_energy',
    'ev_batteries',
  ]);
  console.log('✅ Sectors: Technology, Clean Energy, EV/Batteries\n');
  
  console.log('=== STEP 5: Theme Preferences ===');
  await onboarding.submitThemePreferences([
    'ai_and_ml',
    'electric_vehicles',
    'growth_investing',
  ]);
  console.log('✅ Themes: AI & ML, Electric Vehicles, Growth Investing\n');
  
  console.log('=== STEP 6: Custom Stock Picks (THE DIFFERENTIATOR) ===');
  const customPicks = ['RIVN', 'SOFI', 'HIMS'];
  console.log(`Analyzing: ${customPicks.join(', ')}...\n`);
  
  const pickResults = await onboarding.submitCustomStocks(customPicks);
  
  console.log('📊 ANALYSIS RESULTS:');
  customPicks.forEach(symbol => {
    const analysis = pickResults.analyses[symbol];
    const status = pickResults.approved.includes(symbol) ? '✅ APPROVED' : '❌ REJECTED';
    console.log(`\n${symbol} ${status}`);
    console.log(`  Quality Score: ${analysis.quality_score}/100`);
    console.log(`  Market Cap: $${(analysis.fundamentals.market_cap / 1e9).toFixed(1)}B`);
    console.log(`  Avg Volume: ${(analysis.liquidity.avg_volume / 1e6).toFixed(1)}M shares`);
    console.log(`  Options: ${analysis.options.available ? 'Available' : 'Not Available'}`);
    console.log(`  LEAPS: ${analysis.options.has_leaps ? 'Yes' : 'No'}`);
    
    if (analysis.warnings.length > 0) {
      console.log(`  ⚠️ Warnings:`);
      analysis.warnings.forEach((w: string) => console.log(`    - ${w}`));
    }
    
    if (analysis.alternatives.length > 0) {
      console.log(`  💡 Alternatives: ${analysis.alternatives.join(', ')}`);
    }
  });
  
  console.log('\n=== STEP 7: Exclusions (ESG) ===');
  await onboarding.submitExclusions(['fossil_fuels', 'tobacco']);
  console.log('✅ Excluding: Fossil fuels, Tobacco\n');
  
  console.log('=== STEP 8: Income Preferences ===');
  await onboarding.submitIncomePreferences({
    dividend_preference: 'some',
    covered_calls_interest: true,
  });
  console.log('✅ Dividend preference: Some, Covered calls: Yes\n');
  
  console.log('=== STEP 9: Options Comfort ===');
  await onboarding.submitOptionsComfort({
    comfort: 'full_options',
    max_allocation: 30,
  });
  console.log('✅ Options: Full strategies, Max allocation: 30%\n');
  
  console.log('=== STEP 10: Generate Portfolio Preview ===');
  const preview = await onboarding.generatePreview();
  
  console.log('\n📊 PORTFOLIO COMPARISON\n');
  
  ['scout', 'operator', 'partner'].forEach((tier) => {
    const portfolio = preview[tier as keyof typeof preview];
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${tier.toUpperCase()} - $${portfolio.tier === 'scout' ? 49 : portfolio.tier === 'operator' ? 99 : 249}/month`);
    console.log('='.repeat(50));
    console.log(`Expected Return: ${portfolio.expected_return}%`);
    console.log(`Expected Volatility: ${portfolio.expected_volatility}%`);
    console.log(`Sharpe Ratio: ${portfolio.sharpe_ratio}`);
    console.log(`Max Drawdown: ${portfolio.max_drawdown}%`);
    console.log(`Rebalancing: ${portfolio.rebalancing_frequency}`);
    
    if (portfolio.options_overlay) {
      console.log(`\nOptions Overlay:`);
      console.log(`  LEAPS: ${portfolio.options_overlay.leaps_allocation}%`);
      if (portfolio.options_overlay.spreads_allocation) {
        console.log(`  Spreads: ${portfolio.options_overlay.spreads_allocation}%`);
      }
      if (portfolio.options_overlay.covered_calls_allocation) {
        console.log(`  Covered Calls: ${portfolio.options_overlay.covered_calls_allocation}%`);
      }
    }
    
    if (portfolio.day_trading_allocation) {
      console.log(`Day Trading: ${portfolio.day_trading_allocation}%`);
    }
    
    console.log(`\nTop Holdings:`);
    portfolio.allocations.slice(0, 5).forEach(alloc => {
      console.log(`  ${alloc.symbol} (${alloc.type}): ${alloc.allocation_percentage.toFixed(1)}%`);
      console.log(`    ${alloc.reasoning}`);
    });
    
    if (portfolio.validation.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      portfolio.validation.warnings.forEach(w => console.log(`  - ${w}`));
    }
  });
  
  console.log('\n=== STEP 11: Select Tier ===');
  await onboarding.selectTier('partner');
  console.log('✅ Selected: Partner ($249/month)\n');
  
  console.log('=== COMPLETION STATUS ===');
  const progress = onboarding.getProgress();
  console.log(`Current Step: ${progress.current_step} / ${progress.total_steps}`);
  console.log(`Completion: ${onboarding.getCompletionPercentage()}%`);
  console.log(`Complete: ${onboarding.isComplete() ? 'No (needs payment + broker)' : 'No'}\n`);
  
  console.log('🎉 ONBOARDING TEST COMPLETE!\n');
  console.log('NEXT STEPS:');
  console.log('  1. Process payment via Stripe');
  console.log('  2. Connect broker via Tradier OAuth');
  console.log('  3. Execute initial portfolio build');
  console.log('\n✨ READY TO BUILD CUSTOM PORTFOLIOS ✨\n');
}

// Run test
testOnboardingFlow().catch(console.error);
