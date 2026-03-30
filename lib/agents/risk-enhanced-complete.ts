// Cortex Capital - ENHANCED RISK AGENT (Complete)
// Risk assessment with real options flow and smart money detection

import { enhancedRiskAgent } from './analysis-integration';
import { AnalystReport } from './analyst';
import { EnhancedRebalancingPlan, EnhancedTradeRecommendation } from './strategist-enhanced';

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high';
  score: number; // 0-100
  warnings: string[];
  recommendations: string[];
  sector_risks: Array<{
    sector: string;
    risk: 'low' | 'medium' | 'high';
    concerns: string[];
  }>;
  position_risks: Array<{
    symbol: string;
    risk: 'low' | 'medium' | 'high';
    concerns: string[];
    options_flow?: {
      sentiment: 'bullish' | 'bearish' | 'neutral';
      unusual_activity: boolean;
      large_bets: boolean;
    };
  }>;
  market_risks: {
    volatility_risk: 'low' | 'medium' | 'high';
    liquidity_risk: 'low' | 'medium' | 'high';
    systemic_risk: 'low' | 'medium' | 'high';
  };
  stress_test: {
    scenario: string;
    impact: number; // % portfolio impact
    probability: 'low' | 'medium' | 'high';
  }[];
}

export interface TradeRiskReview {
  trade: EnhancedTradeRecommendation;
  risk_approval: 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
  risk_score: number; // 0-100
  concerns: string[];
  conditions: string[];
  suggested_adjustments?: {
    size_reduction?: number; // % reduction
    tighter_stops?: boolean;
    different_entry?: boolean;
  };
}

export interface PlanRiskReview {
  plan_id: string;
  overall_approval: 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
  overall_risk_score: number; // 0-100
  trade_reviews: TradeRiskReview[];
  portfolio_impact: {
    max_drawdown: number; // % 
    var_95: number; // Value at Risk 95%
    expected_shortfall: number;
  };
  risk_mitigations: string[];
  timestamp: string;
}

/**
 * Enhanced risk assessment for portfolio
 */
export async function enhancedRiskAssessment(
  analystReport: AnalystReport,
  marketVolatility: 'low' | 'medium' | 'high'
): Promise<RiskAssessment> {
  try {
    const symbols = analystReport.positions.map(p => p.ticker);
    const riskData: Record<string, any> = {};
    
    // Get enhanced risk analysis for all positions
    for (const symbol of symbols) {
      try {
        const analysis = await enhancedRiskAgent(symbol);
        riskData[symbol] = analysis;
      } catch (error) {
        console.warn(`Failed to get risk analysis for ${symbol}:`, error);
      }
    }
    
    // Calculate overall risk
    const overallRisk = calculateOverallRisk(riskData, marketVolatility);
    
    // Generate sector risks
    const sectorRisks = await generateSectorRisks(analystReport, riskData);
    
    // Generate position risks
    const positionRisks = generatePositionRisks(analystReport, riskData);
    
    // Assess market risks
    const marketRisks = assessMarketRisks(marketVolatility, analystReport);
    
    // Run stress tests
    const stressTest = runStressTests(analystReport);
    
    // Generate warnings and recommendations
    const { warnings, recommendations } = generateRiskInsights(
      overallRisk,
      positionRisks,
      marketRisks,
      stressTest
    );
    
    return {
      overall_risk: overallRisk.level,
      score: overallRisk.score,
      warnings,
      recommendations,
      sector_risks: sectorRisks,
      position_risks: positionRisks,
      market_risks: marketRisks,
      stress_test: stressTest,
    };
    
  } catch (error) {
    console.error('Enhanced risk assessment failed:', error);
    throw error;
  }
}

/**
 * Review trades for risk
 */
export async function enhancedTradeRiskReview(
  trades: EnhancedTradeRecommendation[],
  analystReport: AnalystReport
): Promise<PlanRiskReview> {
  try {
    const tradeReviews: TradeRiskReview[] = [];
    
    // Review each trade
    for (const trade of trades) {
      const review = await reviewSingleTrade(trade, analystReport);
      tradeReviews.push(review);
    }
    
    // Calculate overall plan risk
    const overallRisk = calculatePlanRisk(tradeReviews);
    
    // Calculate portfolio impact
    const portfolioImpact = calculatePortfolioImpact(tradeReviews, analystReport);
    
    // Generate risk mitigations
    const riskMitigations = generateRiskMitigations(tradeReviews);
    
    return {
      plan_id: `risk_review_${Date.now()}`,
      overall_approval: overallRisk.approval,
      overall_risk_score: overallRisk.score,
      trade_reviews: tradeReviews,
      portfolio_impact: portfolioImpact,
      risk_mitigations: riskMitigations,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Enhanced trade risk review failed:', error);
    throw error;
  }
}

/**
 * Calculate overall risk from risk data
 */
function calculateOverallRisk(
  riskData: Record<string, any>,
  marketVolatility: 'low' | 'medium' | 'high'
): { level: 'low' | 'medium' | 'high'; score: number } {
  if (Object.keys(riskData).length === 0) {
    return { level: 'medium', score: 50 };
  }
  
  // Calculate average risk score
  const scores = Object.values(riskData)
    .filter(data => data?.analysis?.riskScore !== undefined)
    .map(data => data.analysis.riskScore);
  
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 50;
  
  // Adjust for market volatility
  let adjustedScore = avgScore;
  if (marketVolatility === 'high') {
    adjustedScore += 20;
  } else if (marketVolatility === 'medium') {
    adjustedScore += 10;
  }
  
  // Determine risk level
  let level: 'low' | 'medium' | 'high' = 'medium';
  if (adjustedScore < 30) level = 'low';
  else if (adjustedScore > 70) level = 'high';
  
  return { level, score: Math.min(100, adjustedScore) };
}

/**
 * Generate sector risks
 */
async function generateSectorRisks(
  analystReport: AnalystReport,
  riskData: Record<string, any>
): Promise<RiskAssessment['sector_risks']> {
  const sectorMap: Record<string, string> = {
    AAPL: 'tech', MSFT: 'tech', GOOGL: 'tech', META: 'tech', NVDA: 'tech',
    JPM: 'financials', BAC: 'financials', WFC: 'financials',
    JNJ: 'healthcare', PFE: 'healthcare', MRK: 'healthcare',
    AMZN: 'consumer', TSLA: 'consumer', HD: 'consumer',
  };
  
  const sectorRisks: Record<string, {
    symbols: string[];
    riskScores: number[];
    concerns: Set<string>;
  }> = {};
  
  // Group positions by sector
  analystReport.positions.forEach(position => {
    const sector = sectorMap[position.ticker] || 'other';
    if (!sectorRisks[sector]) {
      sectorRisks[sector] = {
        symbols: [],
        riskScores: [],
        concerns: new Set<string>(),
      };
    }
    
    sectorRisks[sector].symbols.push(position.ticker);
    
    // Add risk data if available
    const risk = riskData[position.ticker];
    if (risk?.analysis?.riskScore !== undefined) {
      sectorRisks[sector].riskScores.push(risk.analysis.riskScore);
      
      // Add concerns
      if (risk.analysis.warnings) {
        risk.analysis.warnings.forEach((warning: string) => {
          sectorRisks[sector].concerns.add(warning);
        });
      }
    }
  });
  
  // Convert to array format
  return Object.entries(sectorRisks).map(([sector, data]) => {
    // Calculate average risk score
    const avgScore = data.riskScores.length > 0
      ? data.riskScores.reduce((a, b) => a + b, 0) / data.riskScores.length
      : 50;
    
    // Determine risk level
    let risk: 'low' | 'medium' | 'high' = 'medium';
    if (avgScore < 30) risk = 'low';
    else if (avgScore > 70) risk = 'high';
    
    return {
      sector,
      risk,
      concerns: Array.from(data.concerns).slice(0, 5),
    };
  });
}

/**
 * Generate position risks
 */
function generatePositionRisks(
  analystReport: AnalystReport,
  riskData: Record<string, any>
): RiskAssessment['position_risks'] {
  return analystReport.positions.map(position => {
    const risk = riskData[position.ticker];
    const riskScore = risk?.analysis?.riskScore || 50;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (riskScore < 30) riskLevel = 'low';
    else if (riskScore > 70) riskLevel = 'high';
    
    // Generate concerns
    const concerns: string[] = [];
    
    // Position size concern
    const positionSize = position.value / analystReport.total_value;
    if (positionSize > 0.1) {
      concerns.push(`Large position size: ${(positionSize * 100).toFixed(1)}%`);
    }
    
    // Loss concern
    if (position.unrealized_pnl_pct < -15) {
      concerns.push(`Significant unrealized loss: ${position.unrealized_pnl_pct.toFixed(1)}%`);
    }
    
    // Add risk analysis concerns
    if (risk?.analysis?.warnings) {
      concerns.push(...risk.analysis.warnings.slice(0, 2));
    }
    
    // Options flow data
    let optionsFlow;
    if (risk?.analysis?.flowSentiment) {
      optionsFlow = {
        sentiment: risk.analysis.flowSentiment.sentiment,
        unusual_activity: risk.analysis.unusualStrikes.length > 0,
        large_bets: risk.analysis.largeBets.length > 0,
      };
    }
    
    return {
      symbol: position.ticker,
      risk: riskLevel,
      concerns: concerns.slice(0, 3),
      options_flow: optionsFlow,
    };
  });
}

/**
 * Assess market risks
 */
function assessMarketRisks(
  marketVolatility: 'low' | 'medium' | 'high',
  analystReport: AnalystReport
): RiskAssessment['market_risks'] {
  // Volatility risk
  let volatilityRisk: 'low' | 'medium' | 'high' = marketVolatility;
  
  // Liquidity risk (simplified)
  let liquidityRisk: 'low' | 'medium' | 'high' = 'low';
  const smallCapPositions = analystReport.positions.filter(p => {
    const largeCaps = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'V'];
    return !largeCaps.includes(p.ticker);
  });
  
  if (smallCapPositions.length > 3) {
    liquidityRisk = 'medium';
  }
  if (smallCapPositions.length > 5) {
    liquidityRisk = 'high';
  }
  
  // Systemic risk (simplified)
  let systemicRisk: 'low' | 'medium' | 'high' = 'low';
  const techExposure = analystReport.positions
    .filter(p => ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD'].includes(p.ticker))
    .reduce((sum, p) => sum + p.value, 0);
  
  const techPercentage = techExposure / analystReport.total_value;
  if (techPercentage > 0.4) {
    systemicRisk = 'high';
  } else if (techPercentage > 0.25) {
    systemicRisk = 'medium';
  }
  
  return {
    volatility_risk: volatilityRisk,
    liquidity_risk: liquidityRisk,
    systemic_risk: systemicRisk,
  };
}

/**
 * Run stress tests
 */
function runStressTests(analystReport: AnalystReport): RiskAssessment['stress_test'] {
  const tests = [
    {
      scenario: 'Market correction (-10%)',
      impact: -10,
      probability: 'medium' as const,
    },
    {
      scenario: 'Tech sector selloff (-20%)',
      impact: calculateSectorImpact(analystReport, 'tech', -20),
      probability: 'medium' as const,
    },
    {
      scenario: 'High volatility spike',
      impact: -5,
      probability: 'high' as const,
    },
    {
      scenario: 'Liquidity crisis',
      impact: -15,
      probability: 'low' as const,
    },
  ];
  
  return tests;
}

function calculateSectorImpact(
  analystReport: AnalystReport,
  sector: string,
  sectorDrop: number
): number {
  const sectorMap: Record<string, string> = {
    AAPL: 'tech', MSFT: 'tech', GOOGL: 'tech', META: 'tech', NVDA: 'tech',
    AMD: 'tech', INTC: 'tech',
  };
  
  const sectorValue = analystReport.positions
    .filter(p => sectorMap[p.ticker] === sector)
    .reduce((sum, p) => sum + p.value, 0);
  
  const totalValue = analystReport.total_value;
  const sectorPercentage = sectorValue / totalValue;
  
  return -(sectorPercentage * sectorDrop);
}

/**
 * Generate risk insights
 */
function generateRiskInsights(
  overallRisk: { level: 'low' | 'medium' | 'high'; score: number },
  positionRisks: RiskAssessment['position_risks'],
  marketRisks: RiskAssessment['market_risks'],
  stressTest: RiskAssessment['stress_test']
): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Overall risk warnings
  if (overallRisk.level === 'high') {
    warnings.push(`High overall risk score: ${overallRisk.score}/100`);
    recommendations.push('Consider reducing portfolio risk exposure');
  }
  
  // Position risk warnings
  const highRiskPositions = positionRisks.filter(p => p.risk === 'high');
  if (highRiskPositions.length > 0) {
    warnings.push(`${highRiskPositions.length} positions with high risk`);
    recommendations.push(`Review high-risk positions: ${highRiskPositions.map(p => p.symbol).join(', ')}`);
  }
  
  // Market risk warnings
  if (marketRisks.volatility_risk === 'high') {
    warnings.push('High market volatility detected');
    recommendations.push('Increase cash position for volatility protection');
  }
  
  if (marketRisks.systemic_risk === 'high') {
    warnings.push('High concentration in tech sector');
    recommendations.push('Diversify away from tech sector');
  }
  
  // Stress test warnings
  const severeScenarios = stressTest.filter(s => s.impact < -10 && s.probability !== 'low');
  if (severeScenarios.length > 0) {
    warnings.push(`Potential for significant drawdown in ${severeScenarios.length} scenarios`);
    recommendations.push('Implement hedging strategies for downside protection');
  }
  
  return { warnings, recommendations };
}

/**
 * Review single trade
 */
async function reviewSingleTrade(
  trade: EnhancedTradeRecommendation,
  analystReport: AnalystReport
): Promise<TradeRiskReview> {
  try {
    // Get enhanced risk analysis for this symbol
    const riskAnalysis = await enhancedRiskAgent(trade.symbol);
    
    // Calculate trade risk score
    const riskScore = calculateTradeRiskScore(trade, riskAnalysis, analystReport);
    
    // Generate concerns
    const concerns = generateTradeConcerns(trade, riskAnalysis, analystReport);
    
    // Determine approval
    const { approval, conditions } = determineTradeApproval(riskScore, concerns, trade);
    
    // Suggest adjustments if needed
    const suggestedAdjustments = suggestTradeAdjustments(riskScore, trade, riskAnalysis);
    
    return {
      trade,
      risk_approval: approval,
      risk_score: riskScore,
      concerns,
      conditions,
      suggested_adjustments: suggestedAdjustments,
    };
    
  } catch (error) {
    console.warn(`Failed to review trade ${trade.symbol}:`, error);
    
    // Default to conditional approval on error
    return {
      trade,
      risk_approval: 'CONDITIONAL',
      risk_score: 50,
      concerns: ['Risk analysis failed - manual review required'],
      conditions: ['Manual review required before execution'],
    };
  }
}

/**
 * Calculate trade risk score
 */
function calculateTradeRiskScore(
  trade: EnhancedTradeRecommendation,
  riskAnalysis: any,
  analystReport: AnalystReport
): number {
  let score = 50; // Base score
  
  // Adjust based on risk analysis
  if (riskAnalysis?.analysis?.riskScore) {
    score = riskAnalysis.analysis.riskScore;
  }
  
  // Adjust based on trade confidence
  if (trade.confidence < 60) {
    score += 15;
  } else if (trade.confidence > 80) {
    score -= 10;
  }
  
  // Adjust based on position size
  const position = analystReport.positions.find(p => p.ticker === trade.symbol);
  if (position) {
    const positionSize = position.value / analystReport.total_value;
    if (positionSize > 0.1 && trade.action === 'BUY') {
      score += 10;
    }
  }
  
  // Adjust based on market conditions
  if (trade.risk_assessment.level === 'high') {
    score += 20;
  } else if (trade.risk_assessment.level === 'low') {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate trade concerns
 */
function generateTradeConcerns(
  trade: EnhancedTradeRecommendation,
  riskAnalysis: any,
  analystReport: AnalystReport
): string[] {
  const concerns: string[] = [];
  
  // Risk analysis concerns
  if (riskAnalysis?.analysis?.warnings) {
    concerns.push(...riskAnalysis.analysis.warnings.slice(0, 2));
  }
  
  // Trade-specific concerns
  if (trade.confidence < 60) {
    concerns.push(`Low confidence signal: ${trade.confidence}%`);
  }
  
  if (trade.risk_assessment.level === 'high') {
    concerns.push('High risk assessment from strategist');
  }
  
  // Position size concerns
  const position = analystReport.positions.find(p => p.ticker === trade.symbol);
  if (position) {
    const newShares = trade.action === 'BUY' ? position.shares + trade.shares : position.shares - trade.shares;
    const newValue = newShares * trade.execution_parameters.suggested_entry;
    const newPositionSize = newValue / analystReport.total_value;
    
    if (newPositionSize > 0.15) {
      concerns.push(`Position would become too large: ${(newPositionSize * 100).toFixed(1)}%`);
    }
  }
  
  // Options flow concerns
  if (riskAnalysis?.analysis?.flowSentiment?.sentiment === 'bearish' && trade.action === 'BUY') {
    concerns.push('Options flow shows bearish sentiment conflicting with BUY signal');
  }
  
  return concerns.slice(0, 5);
}

/**
 * Determine trade approval
 */
function determineTradeApproval(
  riskScore: number,
  concerns: string[],
  trade: EnhancedTradeRecommendation
): { approval: 'APPROVED' | 'CONDITIONAL' | 'REJECTED'; conditions: string[] } {
  const conditions: string[] = [];
  
  if (riskScore > 70) {
    return {
      approval: 'REJECTED',
      conditions: [`Risk score too high: ${riskScore}/100`, ...concerns.slice(0, 2)],
    };
  }
  
  if (riskScore > 50 || concerns.length > 2) {
    conditions.push(...concerns.slice(0, 3));
    
    if (trade.confidence < 70) {
      conditions.push('Requires higher confidence (>70%) for execution');
    }
    
    if (trade.risk_assessment.level === 'high') {
      conditions.push('Requires risk mitigation measures');
    }
    
    return {
      approval: 'CONDITIONAL',
      conditions,
    };
  }
  
  return {
    approval: 'APPROVED',
    conditions: ['No significant risk concerns detected'],
  };
}

/**
 * Suggest trade adjustments
 */
function suggestTradeAdjustments(
  riskScore: number,
  trade: EnhancedTradeRecommendation,
  riskAnalysis: any
): TradeRiskReview['suggested_adjustments'] | undefined {
  if (riskScore < 50 && trade.confidence > 70) {
    return undefined;
  }
  
  const adjustments: TradeRiskReview['suggested_adjustments'] = {};
  
  // Size reduction for higher risk
  if (riskScore > 60) {
    adjustments.size_reduction = 0.5;
  } else if (riskScore > 50) {
    adjustments.size_reduction = 0.25;
  }
  
  // Tighter stops for volatile stocks
  if (riskAnalysis?.analysis?.flowSentiment?.sentiment === 'bearish') {
    adjustments.tighter_stops = true;
  }
  
  // Different entry for high risk
  if (riskScore > 65) {
    adjustments.different_entry = true;
  }
  
  return Object.keys(adjustments).length > 0 ? adjustments : undefined;
}

/**
 * Calculate plan risk
 */
function calculatePlanRisk(tradeReviews: TradeRiskReview[]): {
  approval: 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
  score: number;
} {
  if (tradeReviews.length === 0) {
    return { approval: 'APPROVED', score: 0 };
  }
  
  // Calculate average risk score
  const avgScore = tradeReviews.reduce((sum, r) => sum + r.risk_score, 0) / tradeReviews.length;
  
  // Count rejected trades
  const rejectedCount = tradeReviews.filter(r => r.risk_approval === 'REJECTED').length;
  const conditionalCount = tradeReviews.filter(r => r.risk_approval === 'CONDITIONAL').length;
  
  // Determine overall approval
  let approval: 'APPROVED' | 'CONDITIONAL' | 'REJECTED' = 'APPROVED';
  
  if (rejectedCount > 0) {
    approval = 'REJECTED';
  } else if (conditionalCount > 0 || avgScore > 60) {
    approval = 'CONDITIONAL';
  }
  
  return { approval, score: avgScore };
}

/**
 * Calculate portfolio impact
 */
function calculatePortfolioImpact(
  tradeReviews: TradeRiskReview[],
  analystReport: AnalystReport
): PlanRiskReview['portfolio_impact'] {
  // Simplified calculations
  const avgRiskScore = tradeReviews.reduce((sum, r) => sum + r.risk_score, 0) / Math.max(1, tradeReviews.length);
  const maxDrawdown = (avgRiskScore / 100) * 15;
  const var95 = (avgRiskScore / 100) * 10;
  const expectedShortfall = var95 * 1.25;
  
  return {
    max_drawdown: maxDrawdown,
    var_95: var95,
    expected_shortfall: expectedShortfall,
  };
}

/**
 * Generate risk mitigations
 */
function generateRiskMitigations(tradeReviews: TradeRiskReview[]): string[] {
  const mitigations: string[] = [];
  
  // Count high-risk trades
  const highRiskTrades = tradeReviews.filter(r => r.risk_score > 60);
  if (highRiskTrades.length > 0) {
    mitigations.push(`Reduce size on ${highRiskTrades.length} high-risk trades`);
  }
  
  // Check for conditional approvals
  const conditionalTrades = tradeReviews.filter(r => r.risk_approval === 'CONDITIONAL');
  if (conditionalTrades.length > 0) {
    mitigations.push(`Implement conditions on ${conditionalTrades.length} trades before execution`);
  }
  
  // Check for common concerns
  const allConcerns = tradeReviews.flatMap(r => r.concerns);
  const concernCounts: Record<string, number> = {};
  allConcerns.forEach(concern => {
    concernCounts[concern] = (concernCounts[concern] || 0) + 1;
  });
  
  const frequentConcerns = Object.entries(concernCounts)
    .filter(([_, count]) => count > 1)
    .map(([concern]) => concern);
  
  if (frequentConcerns.length > 0) {
    mitigations.push(`Address frequent concerns: ${frequentConcerns.slice(0, 2).join(', ')}`);
  }
  
  // Add general mitigations
  mitigations.push('Monitor positions closely post-execution');
  mitigations.push('Be prepared to exit if risk parameters are breached');
  
  return mitigations.slice(0, 5);
}

/**
 * Main export - enhanced risk assessment function
 */
export default enhancedRiskAssessment;