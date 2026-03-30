// Cortex Capital - ENHANCED STRATEGIST Agent
// Generates rebalancing plans based on REAL technical analysis and research

import { AnalystReport } from './analyst';
import { enhancedAnalystAgent, enhancedStrategistAgent } from './analysis-integration';
import {
  TAX_LOSS_THRESHOLD,
  MAX_TRADES_PER_PLAN,
  TAX_LOSS_SELL_RATIO,
  SECTOR_REBALANCE_THRESHOLD,
  STYLE_REBALANCE_THRESHOLD,
  HIGH_VOLATILITY_CASH_CAP,
  HIGH_VOLATILITY_CASH_BUFFER,
  MAX_HEALTH_IMPROVEMENT,
  COMMISSION_RATE,
  SLIPPAGE_RATE,
  MIN_COMMISSION,
  LONG_TERM_CAP_GAINS_RATE,
  MAX_TAX_LOSS_DEDUCTION,
} from '../constants';
import { ProfileConfig, getProfileConfig, shouldIncludeOptions, shouldIncludeDayTrading } from '../profile-configs';

export interface UserPreferences {
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  investment_horizon: 'short' | 'medium' | 'long';
  constraints: {
    never_sell: string[]; // tickers to never sell
    max_position_size: number; // max % per position
    max_sector_exposure: number; // max % per sector
  };
}

export interface MarketEnvironment {
  market_volatility: 'low' | 'medium' | 'high';
  economic_outlook: 'recession' | 'neutral' | 'expansion';
  interest_rate_trend: 'falling' | 'stable' | 'rising';
  sector_rotations: Record<string, 'overweight' | 'neutral' | 'underweight'>;
}

export interface TargetAllocation {
  asset_classes: {
    stocks: number; // 0-100%
    bonds: number; // 0-100%
    cash: number; // 0-100%
  };
  sectors: Record<string, number>; // sector weights
  styles: {
    growth: number;
    value: number;
    blend: number;
  };
}

export interface EnhancedTradeRecommendation {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  shares: number;
  reason: string;
  confidence: number; // 0-100
  technical_signal: {
    rsi: number;
    macd: string;
    ichimoku: string;
    bollinger: string;
    overall: 'bullish' | 'bearish' | 'neutral';
  };
  research_insights: {
    news_sentiment: 'bullish' | 'bearish' | 'neutral';
    earnings_outlook: 'positive' | 'negative' | 'neutral';
    risk_factors: string[];
  };
  risk_assessment: {
    level: 'low' | 'medium' | 'high';
    warnings: string[];
  };
  execution_parameters: {
    suggested_entry: number;
    stop_loss: number;
    take_profit: number;
    timeframe: 'intraday' | 'swing' | 'position';
  };
}

export interface EnhancedRebalancingPlan {
  plan_id: string;
  timestamp: string;
  current_health: number;
  target_health: number;
  expected_improvement: number;
  trades: EnhancedTradeRecommendation[];
  tax_impact: {
    estimated_tax_loss: number;
    estimated_cap_gains: number;
    net_tax_impact: number;
  };
  risk_adjustments: {
    cash_increase: number;
    sector_rebalancing: Array<{
      sector: string;
      current: number;
      target: number;
      adjustment: number;
    }>;
  };
  market_context: MarketEnvironment;
  assumptions: string[];
  confidence: number; // 0-100
}

/**
 * Enhanced strategist with real analysis data
 */
export async function enhancedStrategist(
  analystReport: AnalystReport,
  preferences: UserPreferences,
  marketEnv: MarketEnvironment,
  priceMap: Record<string, number>
): Promise<EnhancedRebalancingPlan> {
  try {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profile = getProfileConfig(preferences.risk_profile);
    
    // Get enhanced analysis for all positions
    const symbols = analystReport.positions.map(p => p.ticker);
    const enhancedAnalyses: Record<string, any> = {};
    
    // Analyze each symbol with enhanced strategist
    for (const symbol of symbols) {
      try {
        const analysis = await enhancedStrategistAgent(symbol);
        enhancedAnalyses[symbol] = analysis;
      } catch (error) {
        console.warn(`Failed to analyze ${symbol}:`, error);
      }
    }
    
    // Generate trade recommendations based on enhanced analysis
    const trades = await generateEnhancedTrades(
      analystReport,
      enhancedAnalyses,
      preferences,
      marketEnv,
      priceMap,
      profile
    );
    
    // Calculate tax impact
    const taxImpact = calculateTaxImpact(analystReport, trades, priceMap);
    
    // Calculate risk adjustments
    const riskAdjustments = calculateRiskAdjustments(
      analystReport,
      trades,
      marketEnv,
      profile
    );
    
    // Calculate plan confidence
    const confidence = calculatePlanConfidence(trades, enhancedAnalyses);
    
    // Calculate expected health improvement
    const expectedImprovement = calculateExpectedImprovement(
      analystReport.portfolio_health,
      trades,
      enhancedAnalyses
    );
    
    return {
      plan_id: planId,
      timestamp: new Date().toISOString(),
      current_health: analystReport.portfolio_health,
      target_health: Math.min(100, analystReport.portfolio_health + expectedImprovement),
      expected_improvement: expectedImprovement,
      trades: trades.slice(0, MAX_TRADES_PER_PLAN),
      tax_impact: taxImpact,
      risk_adjustments: riskAdjustments,
      market_context: marketEnv,
      assumptions: generateAssumptions(marketEnv, preferences),
      confidence,
    };
    
  } catch (error) {
    console.error('Enhanced strategist failed:', error);
    throw error;
  }
}

/**
 * Generate enhanced trade recommendations
 */
async function generateEnhancedTrades(
  analystReport: AnalystReport,
  enhancedAnalyses: Record<string, any>,
  preferences: UserPreferences,
  marketEnv: MarketEnvironment,
  priceMap: Record<string, number>,
  profile: ProfileConfig
): Promise<EnhancedTradeRecommendation[]> {
  const trades: EnhancedTradeRecommendation[] = [];
  const { constraints } = preferences;
  
  // Process each position
  for (const position of analystReport.positions) {
    const symbol = position.ticker;
    
    // Skip if in never-sell list
    if (constraints.never_sell.includes(symbol)) {
      continue;
    }
    
    // Get enhanced analysis
    const analysis = enhancedAnalyses[symbol];
    if (!analysis) {
      continue;
    }
    
    const { analysis: strategistData, tradePlan } = analysis;
    
    // Determine action based on enhanced analysis
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let reason = '';
    let confidence = 50;
    
    if (strategistData.recommendation.action === 'BUY') {
      // Check if we should add to existing position
      const positionSize = position.value / analystReport.total_value;
      if (positionSize < constraints.max_position_size * 0.8) {
        action = 'BUY';
        reason = 'Technical and fundamental analysis support adding to position';
        confidence = strategistData.confidence;
      }
    } else if (strategistData.recommendation.action === 'SELL') {
      // Check if we should reduce or sell
      if (position.unrealized_pnl_pct > 20 || position.unrealized_pnl_pct < -15) {
        action = 'SELL';
        reason = position.unrealized_pnl_pct > 20 
          ? 'Taking profits on strong gain with overbought signals'
          : 'Cutting losses on significant decline with bearish signals';
        confidence = Math.max(60, strategistData.confidence);
      } else if (position.unrealized_pnl_pct < -5) {
        action = 'SELL';
        reason = 'Tax loss harvesting opportunity with bearish technicals';
        confidence = 70;
      }
    }
    
    // Skip if holding
    if (action === 'HOLD') {
      continue;
    }
    
    // Calculate shares
    const currentPrice = priceMap[symbol] || position.current_price;
    let shares = 0;
    
    if (action === 'BUY' && tradePlan) {
      const positionSize = tradePlan.positionSize;
      const portfolioValue = analystReport.total_value;
      const targetValue = (positionSize / 100) * portfolioValue;
      const currentValue = position.value;
      const additionalValue = Math.max(0, targetValue - currentValue);
      shares = Math.floor(additionalValue / currentPrice);
    } else if (action === 'SELL') {
      // Sell percentage based on confidence and loss/gain
      let sellPct = 0.25; // Default 25%
      
      if (position.unrealized_pnl_pct > 20) {
        sellPct = 0.5; // Take 50% profits on big gains
      } else if (position.unrealized_pnl_pct < -15) {
        sellPct = 1.0; // Sell all on big losses
      } else if (position.unrealized_pnl_pct < -5) {
        sellPct = TAX_LOSS_SELL_RATIO; // Tax loss harvesting ratio
      }
      
      shares = Math.floor(position.shares * sellPct);
    }
    
    // Skip if no shares to trade
    if (shares <= 0) {
      continue;
    }
    
    // Get technical signals
    const technicalSignal = {
      rsi: strategistData.signalAnalysis.indicators.rsi.value,
      macd: strategistData.signalAnalysis.indicators.macd.signalType,
      ichimoku: strategistData.signalAnalysis.indicators.ichimoku.cloudDirection,
      bollinger: strategistData.signalAnalysis.indicators.bollinger.signal,
      overall: strategistData.signalAnalysis.signal.action,
    };
    
    // Get research insights
    const researchInsights = {
      news_sentiment: strategistData.researchReport.sentiment,
      earnings_outlook: strategistData.researchReport.upcomingCatalysts.length > 0 ? 'positive' : 'neutral',
      risk_factors: strategistData.researchReport.riskFactors.slice(0, 3),
    };
    
    // Risk assessment
    const riskAssessment = {
      level: strategistData.riskAssessment.overallRisk,
      warnings: strategistData.researchReport.riskFactors.slice(0, 2),
    };
    
    // Execution parameters
    const executionParameters = {
      suggested_entry: currentPrice,
      stop_loss: tradePlan?.stopLoss || (action === 'BUY' ? currentPrice * 0.95 : currentPrice * 1.05),
      take_profit: tradePlan?.takeProfit || (action === 'BUY' ? currentPrice * 1.10 : currentPrice * 0.90),
      timeframe: strategistData.recommendation.timeframe,
    };
    
    trades.push({
      symbol,
      action,
      shares,
      reason,
      confidence,
      technical_signal: technicalSignal,
      research_insights: researchInsights,
      risk_assessment: riskAssessment,
      execution_parameters: executionParameters,
    });
  }
  
  // Sort by confidence (highest first)
  return trades.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate tax impact of trades
 */
function calculateTaxImpact(
  analystReport: AnalystReport,
  trades: EnhancedTradeRecommendation[],
  priceMap: Record<string, number>
): EnhancedRebalancingPlan['tax_impact'] {
  let estimatedTaxLoss = 0;
  let estimatedCapGains = 0;
  
  const positionMap = new Map(
    analystReport.positions.map(p => [p.ticker, p])
  );
  
  for (const trade of trades) {
    if (trade.action !== 'SELL') continue;
    
    const position = positionMap.get(trade.symbol);
    if (!position) continue;
    
    const currentPrice = priceMap[trade.symbol] || position.current_price;
    const costPerShare = position.cost_basis / position.shares;
    const pnlPerShare = currentPrice - costPerShare;
    const totalPnl = pnlPerShare * trade.shares;
    
    if (totalPnl < 0) {
      estimatedTaxLoss += Math.abs(totalPnl);
    } else {
      estimatedCapGains += totalPnl;
    }
  }
  
  // Apply tax rates
  const taxLossBenefit = Math.min(estimatedTaxLoss * 0.30, MAX_TAX_LOSS_DEDUCTION);
  const capGainsTax = estimatedCapGains * LONG_TERM_CAP_GAINS_RATE;
  
  return {
    estimated_tax_loss: estimatedTaxLoss,
    estimated_cap_gains: estimatedCapGains,
    net_tax_impact: capGainsTax - taxLossBenefit,
  };
}

/**
 * Calculate risk adjustments
 */
function calculateRiskAdjustments(
  analystReport: AnalystReport,
  trades: EnhancedTradeRecommendation[],
  marketEnv: MarketEnvironment,
  profile: ProfileConfig
): EnhancedRebalancingPlan['risk_adjustments'] {
  const cashIncrease = marketEnv.market_volatility === 'high'
    ? HIGH_VOLATILITY_CASH_CAP
    : 0;
  
  // Calculate sector rebalancing needs
  const sectorExposure = analystReport.concentration_risk.sector_exposure;
  const sectorRebalancing: Array<{
    sector: string;
    current: number;
    target: number;
    adjustment: number;
  }> = [];
  
  // Simplified sector targets (would be more sophisticated in production)
  const sectorTargets: Record<string, number> = {
    tech: 25,
    financials: 20,
    healthcare: 15,
    consumer: 15,
    staples: 10,
    energy: 5,
    industrials: 5,
    other: 5,
  };
  
  Object.entries(sectorExposure).forEach(([sector, current]) => {
    const target = sectorTargets[sector] || 5;
    const diff = current - target;
    
    if (Math.abs(diff) > SECTOR_REBALANCE_THRESHOLD) {
      sectorRebalancing.push({
        sector,
        current,
        target,
        adjustment: -diff, // Negative adjustment means reduce, positive means add
      });
    }
  });
  
  return {
    cash_increase: cashIncrease,
    sector_rebalancing: sectorRebalancing,
  };
}

/**
 * Calculate plan confidence
 */
function calculatePlanConfidence(
  trades: EnhancedTradeRecommendation[],
  enhancedAnalyses: Record<string, any>
): number {
  if (trades.length === 0) return 50;
  
  const totalConfidence = trades.reduce((sum, trade) => sum + trade.confidence, 0);
  const avgTradeConfidence = totalConfidence / trades.length;
  
  // Adjust based on analysis quality
  let analysisQuality = 0;
  Object.values(enhancedAnalyses).forEach((analysis: any) => {
    if (analysis?.analysis?.confidence) {
      analysisQuality += analysis.analysis.confidence;
    }
  });
  
  const avgAnalysisQuality = analysisQuality / Math.max(1, Object.keys(enhancedAnalyses).length);
  
  // Weighted average
  return Math.round((avgTradeConfidence * 0.7) + (avgAnalysisQuality * 0.3));
}

/**
 * Calculate expected health improvement
 */
function calculateExpectedImprovement(
  currentHealth: number,
  trades: EnhancedTradeRecommendation[],
  enhancedAnalyses: Record<string, any>
): number {
  if (trades.length === 0) return 0;
  
  // Base improvement from taking action
  let improvement = Math.min(10, trades.length * 2);
  
  // Adjust based on trade confidence
  const avgConfidence = trades.reduce((sum, t) => sum + t.confidence, 0) / trades.length;
  improvement *= (avgConfidence / 100);
  
  // Cap at maximum
  return Math.min(improvement, MAX_HEALTH_IMPROVEMENT);
}

/**
 * Generate assumptions for the plan
 */
function generateAssumptions(
  marketEnv: MarketEnvironment,
  preferences: UserPreferences
): string[] {
  const assumptions: string[] = [
    `Market volatility: ${marketEnv.market_volatility}`,
    `Economic outlook: ${marketEnv.economic_outlook}`,
    `Risk profile: ${preferences.risk_profile}`,
    `Investment horizon: ${preferences.investment_horizon}`,
  ];
  
  if (marketEnv.market_volatility === 'high') {
    assumptions.push('Increased cash position for volatility protection');
  }
  
  if (marketEnv.economic_outlook === 'recession') {
    assumptions.push('Defensive positioning with focus on quality stocks');
  }
  
  return assumptions;
}

/**
 * Main export - enhanced strategist function
 */
export default enhancedStrategist;