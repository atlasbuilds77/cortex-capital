// Cortex Capital - Analysis Engine Integration (Corrected)
// Wires trading analysis engines into agent decision-making

import {
  // Technical indicators
  calculateAllIndicators,
  getRSI,
  getMACD,
  getIchimoku,
  getBollinger,
  type RSIResult,
  type MACDResult,
  type IchimokuResult,
  type BollingerBandsResult,
  type IndicatorSignal,
  
  // Sector momentum
  getSectorMomentumBySymbol,
  type SectorMomentum,
  
  // Signal generator
  generateSignal,
  type TradingSignal,
  type SignalAnalysis,
  
  // Research aggregator
  getFullResearch,
  getBatchResearch,
  type ResearchReport,
  
  // Options flow
  detectUnusualVolume,
  detectLargeBets,
  getFlowSentiment,
  type FlowSentiment,
  type Strike,
  type Bet,
  
  // Smart money detector
  detectSmartMoney,
  type SmartMoneyDetection,
} from './analysis';

import { getQuote } from '../integrations/tradier';

// ============================================================================
// ANALYST AGENT INTEGRATION
// ============================================================================

export interface AnalystEnhancedData {
  symbol: string;
  technicalAnalysis: {
    rsi: RSIResult;
    macd: MACDResult;
    ichimoku: IchimokuResult;
    bollinger: BollingerBandsResult;
  };
  sectorMomentum?: SectorMomentum;
  currentPrice: number;
  volume: number;
  timestamp: string;
}

/**
 * Enhanced analyst analysis with technical indicators and sector momentum
 */
export async function getEnhancedAnalystAnalysis(symbol: string): Promise<AnalystEnhancedData> {
  try {
    // Get current quote
    const quote = await getQuote(symbol);
    if (!quote) {
      throw new Error(`No quote data available for ${symbol}`);
    }
    
    // Get technical indicators
    const technicalAnalysis = await calculateAllIndicators(symbol);
    
    // Get sector momentum
    let sectorMomentum: SectorMomentum | undefined;
    try {
      sectorMomentum = await getSectorMomentumBySymbol(symbol);
    } catch (error) {
      console.warn(`Could not fetch sector momentum for ${symbol}:`, error);
    }
    
    return {
      symbol,
      technicalAnalysis,
      sectorMomentum,
      currentPrice: quote.last || quote.close || 0,
      volume: quote.volume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to get enhanced analysis for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Batch analysis for multiple symbols
 */
export async function getBatchEnhancedAnalysis(symbols: string[]): Promise<Record<string, AnalystEnhancedData>> {
  const results: Record<string, AnalystEnhancedData> = {};
  
  // Process symbols in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const analysis = await getEnhancedAnalystAnalysis(symbol);
        results[symbol] = analysis;
      } catch (error) {
        console.error(`Failed to analyze ${symbol}:`, error);
        // Continue with other symbols
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting delay
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// ============================================================================
// STRATEGIST AGENT INTEGRATION
// ============================================================================

export interface StrategistEnhancedData {
  symbol: string;
  tradingSignal: TradingSignal;
  signalAnalysis: SignalAnalysis;
  researchReport: ResearchReport;
  confidence: number; // Combined confidence score
  riskAssessment: {
    technicalRisk: 'low' | 'medium' | 'high';
    fundamentalRisk: 'low' | 'medium' | 'high';
    marketRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
  };
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
    size: 'small' | 'medium' | 'large';
    timeframe: 'intraday' | 'swing' | 'position';
    rationale: string[];
  };
}

/**
 * Enhanced strategist analysis with signals and research
 */
export async function getEnhancedStrategistAnalysis(symbol: string): Promise<StrategistEnhancedData> {
  try {
    // Generate trading signal
    const signalAnalysis = await generateSignal(symbol);
    const tradingSignal = signalAnalysis.signal;
    
    // Get comprehensive research
    const researchReport = await getFullResearch(symbol);
    
    // Calculate combined confidence
    const technicalConfidence = signalAnalysis.confirmationCount / 5 * 100; // 5 indicators max
    const researchConfidence = researchReport.confidence;
    const combinedConfidence = Math.round((technicalConfidence * 0.6) + (researchConfidence * 0.4));
    
    // Risk assessment
    const technicalRisk = determineTechnicalRisk(signalAnalysis);
    const fundamentalRisk = determineFundamentalRisk(researchReport);
    const marketRisk = determineMarketRisk(signalAnalysis, researchReport);
    const overallRisk = determineOverallRisk(technicalRisk, fundamentalRisk, marketRisk);
    
    // Generate recommendation
    const recommendation = generateRecommendation(tradingSignal, researchReport, combinedConfidence);
    
    return {
      symbol,
      tradingSignal,
      signalAnalysis,
      researchReport,
      confidence: combinedConfidence,
      riskAssessment: {
        technicalRisk,
        fundamentalRisk,
        marketRisk,
        overallRisk,
      },
      recommendation,
    };
  } catch (error) {
    console.error(`Failed to get enhanced strategist analysis for ${symbol}:`, error);
    throw error;
  }
}

function determineTechnicalRisk(signalAnalysis: SignalAnalysis): 'low' | 'medium' | 'high' {
  const { confirmationCount, conflictingSignals } = signalAnalysis;
  
  if (confirmationCount >= 4 && conflictingSignals.length === 0) {
    return 'low';
  } else if (confirmationCount >= 3 && conflictingSignals.length <= 1) {
    return 'medium';
  } else {
    return 'high';
  }
}

function determineFundamentalRisk(researchReport: ResearchReport): 'low' | 'medium' | 'high' {
  const { riskFactors, sentiment } = researchReport;
  
  if (sentiment === 'bullish' && riskFactors.length <= 2) {
    return 'low';
  } else if (sentiment === 'neutral' && riskFactors.length <= 4) {
    return 'medium';
  } else {
    return 'high';
  }
}

function determineMarketRisk(
  signalAnalysis: SignalAnalysis,
  researchReport: ResearchReport
): 'low' | 'medium' | 'high' {
  // Check for market-wide risks
  const hasBreakingNews = researchReport.news.breakingNews.length > 0;
  const hasUpcomingCatalysts = researchReport.upcomingCatalysts.length > 0;
  
  if (hasBreakingNews) {
    return 'high';
  } else if (hasUpcomingCatalysts) {
    return 'medium';
  } else {
    return 'low';
  }
}

function determineOverallRisk(
  technical: 'low' | 'medium' | 'high',
  fundamental: 'low' | 'medium' | 'high',
  market: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  const riskMap = { low: 1, medium: 2, high: 3 };
  const totalRisk = riskMap[technical] + riskMap[fundamental] + riskMap[market];
  
  if (totalRisk <= 4) return 'low';
  if (totalRisk <= 7) return 'medium';
  return 'high';
}

function generateRecommendation(
  signal: TradingSignal,
  research: ResearchReport,
  confidence: number
): StrategistEnhancedData['recommendation'] {
  const { action, timeFrame } = signal;
  const { sentiment } = research;
  
  // Determine position size based on confidence and risk
  let size: 'small' | 'medium' | 'large';
  if (confidence >= 80) {
    size = 'large';
  } else if (confidence >= 60) {
    size = 'medium';
  } else {
    size = 'small';
  }
  
  // Adjust for risk
  if (research.riskFactors.length > 5) {
    size = 'small';
  }
  
  // Generate rationale
  const rationale: string[] = [];
  
  if (action === 'BUY') {
    rationale.push(`Technical signal: ${signal.action} with ${signal.confidence}% confidence`);
    if (sentiment === 'bullish') {
      rationale.push('Fundamental research shows bullish sentiment');
    }
  } else if (action === 'SELL') {
    rationale.push(`Technical signal: ${signal.action} with ${signal.confidence}% confidence`);
    if (sentiment === 'bearish') {
      rationale.push('Fundamental research shows bearish sentiment');
    }
  } else {
    rationale.push('Mixed signals - recommend holding current position');
  }
  
  // Add risk factors if any
  if (research.riskFactors.length > 0) {
    rationale.push(`Risk factors detected: ${research.riskFactors.slice(0, 3).join(', ')}`);
  }
  
  return {
    action: signal.action,
    size,
    timeframe: timeFrame,
    rationale,
  };
}

// ============================================================================
// RISK AGENT INTEGRATION
// ============================================================================

export interface RiskEnhancedData {
  symbol: string;
  flowSentiment: FlowSentiment;
  unusualStrikes: Strike[];
  largeBets: Bet[];
  smartMoneySignal?: SmartMoneyDetection;
  riskScore: number; // 0-100, higher = more risky
  warnings: string[];
  recommendations: string[];
}

/**
 * Enhanced risk analysis with options flow and smart money detection
 */
export async function getEnhancedRiskAnalysis(symbol: string): Promise<RiskEnhancedData> {
  try {
    // Get options flow sentiment
    const flowSentiment = await getFlowSentiment(symbol);
    
    // Detect unusual volume
    const unusualStrikes = await detectUnusualVolume(symbol);
    
    // Detect large bets
    const largeBets = await detectLargeBets(symbol);
    
    // Detect smart money activity
    let smartMoneySignal: SmartMoneyDetection | undefined;
    try {
      smartMoneySignal = await detectSmartMoney(symbol);
    } catch (error) {
      console.warn(`Could not detect smart money activity for ${symbol}:`, error);
    }
    
    // Calculate risk score
    const riskScore = calculateRiskScore(flowSentiment, unusualStrikes, largeBets, smartMoneySignal);
    
    // Generate warnings and recommendations
    const { warnings, recommendations } = generateRiskWarnings(
      flowSentiment,
      unusualStrikes,
      largeBets,
      smartMoneySignal,
      riskScore
    );
    
    return {
      symbol,
      flowSentiment,
      unusualStrikes,
      largeBets,
      smartMoneySignal,
      riskScore,
      warnings,
      recommendations,
    };
  } catch (error) {
    console.error(`Failed to get enhanced risk analysis for ${symbol}:`, error);
    throw error;
  }
}

function calculateRiskScore(
  flowSentiment: FlowSentiment,
  unusualStrikes: Strike[],
  largeBets: Bet[],
  smartMoneySignal?: SmartMoneyDetection
): number {
  let score = 50; // Base score
  
  // Adjust based on flow sentiment
  if (flowSentiment.sentiment === 'bearish') {
    score += 20;
  } else if (flowSentiment.sentiment === 'bullish') {
    score -= 10;
  }
  
  // Adjust based on unusual activity
  if (unusualStrikes.length > 5) {
    score += 15;
  } else if (unusualStrikes.length > 2) {
    score += 8;
  }
  
  // Adjust based on large bets
  if (largeBets.length > 3) {
    score += 12;
  } else if (largeBets.length > 0) {
    score += 5;
  }
  
  // Adjust based on smart money
  if (smartMoneySignal?.detected && smartMoneySignal.type === 'accumulation') {
    score -= 10; // Smart money accumulation is bullish
  } else if (smartMoneySignal?.detected && smartMoneySignal.type === 'hedge') {
    score += 10; // Hedging can indicate concern
  }
  
  // Cap score between 0-100
  return Math.max(0, Math.min(100, score));
}

function generateRiskWarnings(
  flowSentiment: FlowSentiment,
  unusualStrikes: Strike[],
  largeBets: Bet[],
  smartMoneySignal?: SmartMoneyDetection,
  riskScore?: number
): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Flow sentiment warnings
  if (flowSentiment.sentiment === 'bearish') {
    warnings.push('Options flow shows bearish sentiment');
    recommendations.push('Consider reducing position size or adding hedges');
  }
  
  // Unusual volume warnings
  if (unusualStrikes.length > 5) {
    warnings.push(`High unusual options activity detected (${unusualStrikes.length} strikes)`);
    recommendations.push('Monitor options chain for directional clues');
  }
  
  // Large bets warnings
  if (largeBets.length > 0) {
    const totalContracts = largeBets.reduce((sum, bet) => sum + bet.contracts, 0);
    warnings.push(`Large block trades detected (${totalContracts} total contracts)`);
    recommendations.push('Large institutional activity detected - monitor price action');
  }
  
  // Smart money warnings
  if (smartMoneySignal?.detected) {
    warnings.push(`Smart money activity detected: ${smartMoneySignal.type}`);
    if (smartMoneySignal.type === 'accumulation') {
      recommendations.push('Smart money accumulating - consider following');
    } else if (smartMoneySignal.type === 'hedge') {
      recommendations.push('Smart money hedging - exercise caution');
    }
  }
  
  // Risk score warnings
  if (riskScore && riskScore > 70) {
    warnings.push(`High risk score: ${riskScore}/100`);
    recommendations.push('Exercise caution - consider smaller position size or wait for better entry');
  } else if (riskScore && riskScore < 30) {
    warnings.push(`Low risk score: ${riskScore}/100`);
    recommendations.push('Favorable risk profile - consider normal position sizing');
  }
  
  return { warnings, recommendations };
}

// ============================================================================
// EXECUTOR AGENT INTEGRATION
// ============================================================================

export interface ExecutionConfirmation {
  symbol: string;
  shouldExecute: boolean;
  confidence: number; // 0-100
  reasons: string[];
  warnings: string[];
  suggestedSize: number; // Percentage of portfolio
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
}

/**
 * Enhanced execution confirmation with multi-agent analysis
 */
export async function getExecutionConfirmation(
  symbol: string,
  proposedAction: 'BUY' | 'SELL',
  proposedSize: number
): Promise<ExecutionConfirmation> {
  try {
    // Get analysis from all agents
    const [analystData, strategistData, riskData] = await Promise.all([
      getEnhancedAnalystAnalysis(symbol).catch(() => null),
      getEnhancedStrategistAnalysis(symbol).catch(() => null),
      getEnhancedRiskAnalysis(symbol).catch(() => null),
    ]);
    
    const reasons: string[] = [];
    const warnings: string[] = [];
    let confidence = 50; // Base confidence
    
    // Analyst validation
    if (analystData) {
      const { technicalAnalysis, sectorMomentum } = analystData;
      
      // Check RSI
      if (technicalAnalysis.rsi.signal === 'overbought' && proposedAction === 'BUY') {
        warnings.push('RSI indicates overbought conditions');
        confidence -= 10;
      } else if (technicalAnalysis.rsi.signal === 'oversold' && proposedAction === 'SELL') {
        warnings.push('RSI indicates oversold conditions');
        confidence -= 10;
      } else {
        reasons.push(`RSI: ${technicalAnalysis.rsi.signal} (${technicalAnalysis.rsi.value.toFixed(1)})`);
      }
      
      // Check sector momentum
      if (sectorMomentum && sectorMomentum.trend === 'bearish' && proposedAction === 'BUY') {
        warnings.push('Sector shows bearish momentum');
        confidence -= 5;
      }
    }
    
    // Strategist validation
    if (strategistData) {
      const { tradingSignal, recommendation, confidence: strategistConfidence } = strategistData;
      
      if (tradingSignal.action === proposedAction) {
        reasons.push(`Strategist confirms ${proposedAction} signal`);
        confidence += 20;
      } else if (tradingSignal.action === 'HOLD') {
        warnings.push('Strategist recommends holding');
        confidence -= 15;
      } else {
        warnings.push(`Strategist recommends ${tradingSignal.action} (conflict)`);
        confidence -= 25;
      }
      
      // Adjust confidence based on strategist confidence
      confidence = Math.round((confidence + strategistConfidence) / 2);
      
      // Add strategist rationale
      reasons.push(...recommendation.rationale.slice(0, 2));
    }
    
    // Risk validation
    if (riskData) {
      const { riskScore, warnings: riskWarnings, recommendations: riskRecommendations } = riskData;
      
      if (riskScore > 70) {
        warnings.push(`High risk score: ${riskScore}/100`);
        confidence -= 20;
      } else