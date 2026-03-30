// Cortex Capital - Example Usage of Enhanced Agents
// Demonstrates how to use the analysis-engine integrated agents

import cortexOrchestrator from './cortex-orchestrator';

// Example user preferences
const examplePreferences = {
  risk_profile: 'moderate' as const,
  investment_horizon: 'medium' as const,
  constraints: {
    never_sell: ['AAPL', 'MSFT'], // Never sell these tickers
    max_position_size: 0.15, // Max 15% per position
    max_sector_exposure: 0.30, // Max 30% per sector
  },
};

// Example market environment
const exampleMarketEnv = {
  market_volatility: 'medium' as const,
  economic_outlook: 'neutral' as const,
  interest_rate_trend: 'stable' as const,
  sector_rotations: {
    tech: 'overweight',
    financials: 'neutral',
    healthcare: 'underweight',
    consumer: 'neutral',
  },
};

/**
 * Example 1: Run complete Cortex workflow
 */
async function exampleCompleteWorkflow() {
  console.log('=== EXAMPLE 1: Complete Cortex Workflow ===');
  
  try {
    const result = await cortexOrchestrator.runCortexWorkflow(
      examplePreferences,
      exampleMarketEnv
    );
    
    console.log(`Workflow ID: ${result.workflow_id}`);
    console.log(`Status: ${result.status}`);
    console.log(`Portfolio Health: ${result.summary.portfolio_health_before} → ${result.summary.portfolio_health_after}`);
    console.log(`Expected Improvement: ${result.summary.expected_improvement.toFixed(1)}%`);
    console.log(`Trades Generated: ${result.summary.total_trades_generated}`);
    console.log(`Trades Approved: ${result.summary.trades_approved}`);
    console.log(`Trades Executed: ${result.summary.trades_executed}`);
    console.log(`Overall Confidence: ${result.summary.overall_confidence}%`);
    
    // Display analyst insights
    console.log('\n=== ANALYST INSIGHTS ===');
    console.log(`Total Portfolio Value: $${result.analyst_report.total_value.toFixed(2)}`);
    console.log(`Positions: ${result.analyst_report.positions.length}`);
    
    // Display top 3 positions
    const topPositions = result.analyst_report.positions
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    
    topPositions.forEach(pos => {
      console.log(`  ${pos.ticker}: $${pos.value.toFixed(2)} (${pos.unrealized_pnl_pct.toFixed(1)}%) - ${pos.recommendation}`);
    });
    
    // Display sector insights
    console.log('\n=== SECTOR INSIGHTS ===');
    result.analyst_report.sector_insights.forEach(sector => {
      console.log(`  ${sector.sector}: ${sector.trend} (${sector.momentum_score}/100) - ${sector.risk_level} risk`);
    });
    
    // Display strategist recommendations
    console.log('\n=== STRATEGIST RECOMMENDATIONS ===');
    if (result.strategist_plan.trades.length > 0) {
      result.strategist_plan.trades.slice(0, 5).forEach(trade => {
        console.log(`  ${trade.action} ${trade.shares} shares of ${trade.symbol} (${trade.confidence}% confidence)`);
        console.log(`    Reason: ${trade.reason}`);
        console.log(`    Technical: ${trade.technical_signal.overall}`);
        console.log(`    Research: ${trade.research_insights.news_sentiment}`);
      });
    } else {
      console.log('  No trades recommended - portfolio appears optimal');
    }
    
    // Display risk assessment
    console.log('\n=== RISK ASSESSMENT ===');
    console.log(`Overall Risk: ${result.risk_review.overall_risk_score}/100 (${result.risk_review.overall_approval})`);
    
    if (result.risk_review.risk_mitigations.length > 0) {
      console.log('Risk Mitigations:');
      result.risk_review.risk_mitigations.forEach(mitigation => {
        console.log(`  - ${mitigation}`);
      });
    }
    
    // Display execution results
    if (result.execution_plan) {
      console.log('\n=== EXECUTION RESULTS ===');
      console.log(`Executed: ${result.execution_plan.summary.executed_trades} trades`);
      console.log(`Commission: $${result.execution_plan.summary.total_commission.toFixed(2)}`);
      console.log(`Slippage: ${result.execution_plan.summary.estimated_slippage.toFixed(2)}%`);
      
      if (result.execution_plan.warnings.length > 0) {
        console.log('Execution Warnings:');
        result.execution_plan.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }
    }
    
    // Display any warnings
    if (result.warnings.length > 0) {
      console.log('\n=== WORKFLOW WARNINGS ===');
      result.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning}`);
      });
    }
    
    // Display any errors
    if (result.errors && result.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      result.errors.forEach(error => {
        console.log(`  ❌ ${error}`);
      });
    }
    
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

/**
 * Example 2: Quick analysis only (analyst + strategist)
 */
async function exampleQuickAnalysis() {
  console.log('\n=== EXAMPLE 2: Quick Analysis ===');
  
  try {
    const result = await cortexOrchestrator.runQuickAnalysis(
      examplePreferences,
      exampleMarketEnv
    );
    
    console.log(`Portfolio Health: ${result.summary.portfolio_health}`);
    console.log(`Trades Generated: ${result.summary.trades_generated}`);
    console.log(`Expected Improvement: ${result.summary.expected_improvement.toFixed(1)}%`);
    console.log(`Confidence: ${result.summary.confidence}%`);
    
    // Display top recommendations
    if (result.strategist_plan.trades.length > 0) {
      console.log('\nTop Recommendations:');
      result.strategist_plan.trades.slice(0, 3).forEach(trade => {
        console.log(`  ${trade.action} ${trade.symbol} - ${trade.confidence}% confidence`);
      });
    }
    
  } catch (error) {
    console.error('Quick analysis failed:', error);
  }
}

/**
 * Example 3: Use individual enhanced agents directly
 */
async function exampleIndividualAgents() {
  console.log('\n=== EXAMPLE 3: Individual Enhanced Agents ===');
  
  try {
    // 1. Enhanced Analyst
    console.log('1. Running Enhanced Analyst...');
    const analystReport = await cortexOrchestrator.enhancedAnalyst();
    console.log(`   Portfolio Health: ${analystReport.portfolio_health}`);
    console.log(`   Total Value: $${analystReport.total_value.toFixed(2)}`);
    
    // 2. Enhanced Strategist for a specific symbol
    console.log('\n2. Running Enhanced Strategist for AAPL...');
    const { enhancedStrategistAgent } = await import('./analysis-integration');
    const strategistResult = await enhancedStrategistAgent('AAPL');
    console.log(`   Signal: ${strategistResult.analysis.tradingSignal.action}`);
    console.log(`   Confidence: ${strategistResult.analysis.confidence}%`);
    console.log(`   Risk: ${strategistResult.analysis.riskAssessment.overallRisk}`);
    
    // 3. Enhanced Risk Agent for a specific symbol
    console.log('\n3. Running Enhanced Risk Agent for AAPL...');
    const { enhancedRiskAgent } = await import('./analysis-integration');
    const riskResult = await enhancedRiskAgent('AAPL');
    console.log(`   Risk Score: ${riskResult.analysis.riskScore}/100`);
    console.log(`   Approval: ${riskResult.approval}`);
    if (riskResult.conditions) {
      console.log(`   Conditions: ${riskResult.conditions.join(', ')}`);
    }
    
    // 4. Enhanced Executor for a hypothetical trade
    console.log('\n4. Running Enhanced Executor for AAPL BUY...');
    const { enhancedExecutorAgent } = await import('./analysis-integration');
    const executorResult = await enhancedExecutorAgent('AAPL', 'BUY', 1.0);
    console.log(`   Should Execute: ${executorResult.confirmation.shouldExecute}`);
    console.log(`   Confidence: ${executorResult.confirmation.confidence}%`);
    console.log(`   Reasons: ${executorResult.confirmation.reasons.slice(0, 2).join(', ')}`);
    
  } catch (error) {
    console.error('Individual agents example failed:', error);
  }
}

/**
 * Example 4: Batch analysis with enhanced analysis engines
 */
async function exampleBatchAnalysis() {
  console.log('\n=== EXAMPLE 4: Batch Analysis ===');
  
  try {
    const { getBatchEnhancedAnalysis } = await import('./analysis-integration');
    
    // Analyze multiple symbols
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
    console.log(`Analyzing ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    const batchResults = await getBatchEnhancedAnalysis(symbols);
    
    console.log('\nBatch Analysis Results:');
    Object.entries(batchResults).forEach(([symbol, analysis]) => {
      console.log(`\n${symbol}:`);
      console.log(`  Price: $${analysis.currentPrice.toFixed(2)}`);
      console.log(`  RSI: ${analysis.technicalAnalysis.rsi.value.toFixed(1)} (${analysis.technicalAnalysis.rsi.signal})`);
      console.log(`  MACD: ${analysis.technicalAnalysis.macd.signalType}`);
      console.log(`  Ichimoku: ${analysis.technicalAnalysis.ichimoku.cloudDirection}`);
      
      if (analysis.sectorMomentum) {
        console.log(`  Sector: ${analysis.sectorMomentum.trend} (rank ${analysis.sectorMomentum.rank})`);
      }
    });
    
  } catch (error) {
    console.error('Batch analysis failed:', error);
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  console.log('CORTEX CAPITAL - ENHANCED AGENTS DEMONSTRATION');
  console.log('===============================================\n');
  
  await exampleCompleteWorkflow();
  await exampleQuickAnalysis();
  await exampleIndividualAgents();
  await exampleBatchAnalysis();
  
  console.log('\n===============================================');
  console.log('All examples completed!');
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  exampleCompleteWorkflow,
  exampleQuickAnalysis,
  exampleIndividualAgents,
  exampleBatchAnalysis,
  runAllExamples,
};