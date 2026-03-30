// Cortex Capital - Enhanced Agent Orchestrator
// Coordinates all enhanced agents with real analysis engines

import enhancedAnalyst, { EnhancedAnalystReport } from './analyst-enhanced';
import enhancedStrategist, { EnhancedRebalancingPlan } from './strategist-enhanced';
import enhancedRiskAssessment, { PlanRiskReview } from './risk-enhanced-complete';
import enhancedExecutor, { EnhancedExecutionPlan } from './executor-enhanced';

export interface UserPreferences {
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  investment_horizon: 'short' | 'medium' | 'long';
  constraints: {
    never_sell: string[];
    max_position_size: number;
    max_sector_exposure: number;
  };
}

export interface MarketEnvironment {
  market_volatility: 'low' | 'medium' | 'high';
  economic_outlook: 'recession' | 'neutral' | 'expansion';
  interest_rate_trend: 'falling' | 'stable' | 'rising';
  sector_rotations: Record<string, 'overweight' | 'neutral' | 'underweight'>;
}

export interface CortexWorkflowResult {
  timestamp: string;
  workflow_id: string;
  analyst_report: EnhancedAnalystReport;
  strategist_plan: EnhancedRebalancingPlan;
  risk_review: PlanRiskReview;
  execution_plan?: EnhancedExecutionPlan;
  summary: {
    portfolio_health_before: number;
    portfolio_health_after: number;
    expected_improvement: number;
    total_trades_generated: number;
    trades_approved: number;
    trades_executed: number;
    overall_confidence: number;
    estimated_tax_impact: number;
    estimated_commission: number;
  };
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
  warnings: string[];
}

/**
 * Main orchestrator - runs the complete Cortex Capital workflow
 */
export async function runCortexWorkflow(
  preferences: UserPreferences,
  marketEnv: MarketEnvironment
): Promise<CortexWorkflowResult> {
  const workflow_id = `cortex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    console.log(`[CORTEX] Starting workflow ${workflow_id}`);
    
    // ============================================================================
    // STEP 1: ANALYST - Enhanced portfolio analysis with real technical indicators
    // ============================================================================
    console.log('[CORTEX] Step 1: Running enhanced analyst...');
    let analystReport: EnhancedAnalystReport;
    try {
      analystReport = await enhancedAnalyst();
      console.log(`[CORTEX] Analyst complete. Portfolio health: ${analystReport.portfolio_health}`);
    } catch (error: any) {
      errors.push(`Analyst failed: ${error.message}`);
      throw error;
    }
    
    // ============================================================================
    // STEP 2: STRATEGIST - Enhanced rebalancing plan with real signals and research
    // ============================================================================
    console.log('[CORTEX] Step 2: Running enhanced strategist...');
    let strategistPlan: EnhancedRebalancingPlan;
    try {
      // Create price map for strategist
      const priceMap: Record<string, number> = {};
      analystReport.positions.forEach(p => {
        priceMap[p.ticker] = p.current_price;
      });
      
      strategistPlan = await enhancedStrategist(
        analystReport as any, // Type conversion for compatibility
        preferences,
        marketEnv,
        priceMap
      );
      console.log(`[CORTEX] Strategist complete. Generated ${strategistPlan.trades.length} trades`);
    } catch (error: any) {
      errors.push(`Strategist failed: ${error.message}`);
      throw error;
    }
    
    // ============================================================================
    // STEP 3: RISK - Enhanced risk assessment with real options flow
    // ============================================================================
    console.log('[CORTEX] Step 3: Running enhanced risk assessment...');
    let riskReview: PlanRiskReview;
    try {
      riskReview = await enhancedRiskAssessment(
        analystReport as any,
        marketEnv.market_volatility
      );
      console.log(`[CORTEX] Risk assessment complete. Overall risk: ${riskReview.overall_risk_score}/100`);
    } catch (error: any) {
      errors.push(`Risk assessment failed: ${error.message}`);
      throw error;
    }
    
    // ============================================================================
    // STEP 4: EXECUTOR - Enhanced execution with real confirmation logic
    // ============================================================================
    console.log('[CORTEX] Step 4: Running enhanced executor...');
    let executionPlan: EnhancedExecutionPlan | undefined;
    try {
      // Only execute if risk approves
      if (riskReview.overall_approval === 'APPROVED' || riskReview.overall_approval === 'CONDITIONAL') {
        executionPlan = await enhancedExecutor(strategistPlan, riskReview);
        console.log(`[CORTEX] Executor complete. Executed ${executionPlan.summary.executed_trades} trades`);
      } else {
        warnings.push('Execution skipped: Risk assessment rejected the plan');
        console.log('[CORTEX] Execution skipped due to risk rejection');
      }
    } catch (error: any) {
      errors.push(`Executor failed: ${error.message}`);
      // Continue without execution
    }
    
    // ============================================================================
    // STEP 5: SUMMARY - Generate comprehensive workflow summary
    // ============================================================================
    console.log('[CORTEX] Step 5: Generating summary...');
    
    // Calculate summary metrics
    const approvedTrades = riskReview.trade_reviews.filter(r => 
      r.risk_approval === 'APPROVED'
    ).length;
    
    const executedTrades = executionPlan?.summary.executed_trades || 0;
    
    const overallConfidence = executionPlan 
      ? executionPlan.summary.overall_confidence
      : strategistPlan.confidence;
    
    const estimatedTaxImpact = strategistPlan.tax_impact.net_tax_impact;
    const estimatedCommission = executionPlan?.summary.total_commission || 0;
    
    // Calculate expected improvement
    const expectedImprovement = executionPlan
      ? calculateExpectedImprovement(analystReport, strategistPlan, executionPlan)
      : strategistPlan.expected_improvement;
    
    const summary = {
      portfolio_health_before: analystReport.portfolio_health,
      portfolio_health_after: Math.min(100, analystReport.portfolio_health + expectedImprovement),
      expected_improvement,
      total_trades_generated: strategistPlan.trades.length,
      trades_approved: approvedTrades,
      trades_executed: executedTrades,
      overall_confidence: overallConfidence,
      estimated_tax_impact: estimatedTaxImpact,
      estimated_commission: estimatedCommission,
    };
    
    // Generate warnings
    if (analystReport.portfolio_health < 50) {
      warnings.push('Portfolio health is low - consider major rebalancing');
    }
    
    if (strategistPlan.trades.length === 0) {
      warnings.push('No trades generated - portfolio may already be optimal');
    }
    
    if (riskReview.overall_approval === 'CONDITIONAL') {
      warnings.push('Risk assessment conditional - review conditions before execution');
    }
    
    if (executedTrades === 0 && strategistPlan.trades.length > 0) {
      warnings.push('No trades executed - check risk assessment and execution confirmation');
    }
    
    // Determine status
    let status: 'completed' | 'partial' | 'failed' = 'completed';
    if (errors.length > 0) {
      status = 'failed';
    } else if (executedTrades < approvedTrades) {
      status = 'partial';
    }
    
    console.log(`[CORTEX] Workflow ${workflow_id} ${status}`);
    
    return {
      timestamp: new Date().toISOString(),
      workflow_id,
      analyst_report: analystReport,
      strategist_plan: strategistPlan,
      risk_review: riskReview,
      execution_plan: executionPlan,
      summary,
      status,
      errors: errors.length > 0 ? errors : undefined,
      warnings,
    };
    
  } catch (error: any) {
    console.error(`[CORTEX] Workflow ${workflow_id} failed:`, error);
    
    return {
      timestamp: new Date().toISOString(),
      workflow_id,
      analyst_report: {} as any,
      strategist_plan: {} as any,
      risk_review: {} as any,
      summary: {
        portfolio_health_before: 0,
        portfolio_health_after: 0,
        expected_improvement: 0,
        total_trades_generated: 0,
        trades_approved: 0,
        trades_executed: 0,
        overall_confidence: 0,
        estimated_tax_impact: 0,
        estimated_commission: 0,
      },
      status: 'failed',
      errors: [...errors, `Workflow failed: ${error.message}`],
      warnings,
    };
  }
}

/**
 * Calculate expected improvement from execution
 */
function calculateExpectedImprovement(
  analystReport: EnhancedAnalystReport,
  strategistPlan: EnhancedRebalancingPlan,
  executionPlan: EnhancedExecutionPlan
): number {
  // Base improvement from strategist
  let improvement = strategistPlan.expected_improvement;
  
  // Adjust based on execution quality
  const executionQuality = executionPlan.summary.executed_trades / executionPlan.summary.total_trades;
  improvement *= executionQuality;
  
  // Adjust based on confidence
  const confidenceFactor = executionPlan.summary.overall_confidence / 100;
  improvement *= confidenceFactor;
  
  // Cap improvement
  return Math.min(improvement, 20); // Max 20% improvement
}

/**
 * Run a quick analysis workflow (analyst + strategist only)
 */
export async function runQuickAnalysis(
  preferences: UserPreferences,
  marketEnv: MarketEnvironment
): Promise<{
  analyst_report: EnhancedAnalystReport;
  strategist_plan: EnhancedRebalancingPlan;
  summary: {
    portfolio_health: number;
    trades_generated: number;
    expected_improvement: number;
    confidence: number;
  };
}> {
  try {
    // Run analyst
    const analystReport = await enhancedAnalyst();
    
    // Create price map
    const priceMap: Record<string, number> = {};
    analystReport.positions.forEach(p => {
      priceMap[p.ticker] = p.current_price;
    });
    
    // Run strategist
    const strategistPlan = await enhancedStrategist(
      analystReport as any,
      preferences,
      marketEnv,
      priceMap
    );
    
    return {
      analyst_report: analystReport,
      strategist_plan: strategistPlan,
      summary: {
        portfolio_health: analystReport.portfolio_health,
        trades_generated: strategistPlan.trades.length,
        expected_improvement: strategistPlan.expected_improvement,
        confidence: strategistPlan.confidence,
      },
    };
  } catch (error) {
    console.error('Quick analysis failed:', error);
    throw error;
  }
}

/**
 * Run risk assessment only
 */
export async function runRiskAssessmentOnly(
  analystReport: EnhancedAnalystReport,
  marketVolatility: 'low' | 'medium' | 'high'
): Promise<PlanRiskReview> {
  return await enhancedRiskAssessment(analystReport as any, marketVolatility);
}

/**
 * Run execution only (requires strategist plan and risk review)
 */
export async function runExecutionOnly(
  strategistPlan: EnhancedRebalancingPlan,
  riskReview: PlanRiskReview
): Promise<EnhancedExecutionPlan> {
  return await enhancedExecutor(strategistPlan, riskReview);
}

/**
 * Main export - Cortex orchestrator
 */
export default {
  runCortexWorkflow,
  runQuickAnalysis,
  runRiskAssessmentOnly,
  runExecutionOnly,
  
  // Individual agents
  enhancedAnalyst,
  enhancedStrategist,
  enhancedRiskAssessment,
  enhancedExecutor,
};