// Cortex Capital - Signal Generator
// Combine technical indicators into actionable trading signals

import { 
  calculateAllIndicators, 
  RSIResult, 
  MACDResult, 
  IchimokuResult, 
  BollingerBandsResult,
  getRSI,
  getMACD,
  getIchimoku,
  getBollinger
} from './technical-indicators';

import { getSectorMomentumBySymbol } from './sector-momentum';

export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reasons: string[];
  timestamp: string;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeFrame: 'intraday' | 'swing' | 'position';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SignalAnalysis {
  symbol: string;
  signal: TradingSignal;
  indicators: {
    rsi: RSIResult;
    macd: MACDResult;
    ichimoku: IchimokuResult;
    bollinger: BollingerBandsResult;
  };
  sectorMomentum?: {
    score: number;
    rank: number;
    trend: string;
  };
  confirmationCount: number;
  conflictingSignals: string[];
}

/**
 * Determine trend direction from multiple indicators
 */
function determineTrend(
  rsi: RSIResult,
  macd: MACDResult,
  ichimoku: IchimokuResult,
  bollinger: BollingerBandsResult
): 'uptrend' | 'downtrend' | 'sideways' {
  const signals: ('bullish' | 'bearish' | 'neutral')[] = [];
  
  // RSI trend (above/below 50)
  if (rsi.value > 55) signals.push('bullish');
  else if (rsi.value < 45) signals.push('bearish');
  else signals.push('neutral');
  
  // MACD trend
  signals.push(macd.signalType);
  
  // Ichimoku cloud direction
  if (ichimoku.cloudDirection === 'bullish') signals.push('bullish');
  else if (ichimoku.cloudDirection === 'bearish') signals.push('bearish');
  else signals.push('neutral');
  
  // Bollinger Bands trend (price relative to middle band)
  const bollingerPosition = bollinger.percentB;
  if (bollingerPosition > 60) signals.push('bullish');
  else if (bollingerPosition < 40) signals.push('bearish');
  else signals.push('neutral');
  
  // Count bullish vs bearish signals
  const bullishCount = signals.filter(s => s === 'bullish').length;
  const bearishCount = signals.filter(s => s === 'bearish').length;
  
  if (bullishCount >= 3) return 'uptrend';
  if (bearishCount >= 3) return 'downtrend';
  return 'sideways';
}

/**
 * Generate trading signal based on technical indicators
 */
export async function generateSignal(symbol: string): Promise<SignalAnalysis> {
  // Fetch all technical indicators
  const indicators = await calculateAllIndicators(symbol);
  const { rsi, macd, ichimoku, bollinger } = indicators;
  
  // Determine overall trend
  const trend = determineTrend(rsi, macd, ichimoku, bollinger);
  
  // Get sector momentum if available
  let sectorMomentum;
  try {
    const sectorData = await getSectorMomentumBySymbol(symbol);
    if (sectorData) {
      sectorMomentum = {
        score: sectorData.momentumScore,
        rank: sectorData.rank,
        trend: sectorData.trend
      };
    }
  } catch (error) {
    // Sector data not available for this symbol (might not be a sector ETF)
    console.debug(`No sector momentum data for ${symbol}`);
  }
  
  // Initialize signal components
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 50;
  const reasons: string[] = [];
  const conflictingSignals: string[] = [];
  let confirmationCount = 0;
  
  // RSI-based signals
  if (trend === 'uptrend' && rsi.signal === 'oversold') {
    reasons.push(`RSI ${rsi.value.toFixed(1)} indicates oversold in uptrend`);
    confirmationCount++;
  } else if (trend === 'downtrend' && rsi.signal === 'overbought') {
    reasons.push(`RSI ${rsi.value.toFixed(1)} indicates overbought in downtrend`);
    confirmationCount++;
  } else if (rsi.signal === 'oversold') {
    conflictingSignals.push(`RSI oversold but trend is ${trend}`);
  } else if (rsi.signal === 'overbought') {
    conflictingSignals.push(`RSI overbought but trend is ${trend}`);
  }
  
  // MACD-based signals
  if (macd.signalType === 'bullish' && macd.confidence > 60) {
    reasons.push(`MACD bullish crossover with ${macd.confidence}% confidence`);
    confirmationCount++;
  } else if (macd.signalType === 'bearish' && macd.confidence > 60) {
    reasons.push(`MACD bearish crossover with ${macd.confidence}% confidence`);
    confirmationCount++;
  }
  
  // Ichimoku-based signals
  if (ichimoku.cloudDirection === 'bullish' && ichimoku.confidence > 60) {
    reasons.push(`Ichimoku cloud bullish with ${ichimoku.confidence}% confidence`);
    confirmationCount++;
  } else if (ichimoku.cloudDirection === 'bearish' && ichimoku.confidence > 60) {
    reasons.push(`Ichimoku cloud bearish with ${ichimoku.confidence}% confidence`);
    confirmationCount++;
  }
  
  if (ichimoku.kumoTwist) {
    reasons.push('Ichimoku cloud twist detected (potential trend change)');
  }
  
  // Bollinger Bands signals
  if (bollinger.signal === 'oversold' && bollinger.confidence > 60) {
    reasons.push(`Bollinger Bands oversold (${bollinger.percentB.toFixed(1)}% B)`);
    confirmationCount++;
  } else if (bollinger.signal === 'overbought' && bollinger.confidence > 60) {
    reasons.push(`Bollinger Bands overbought (${bollinger.percentB.toFixed(1)}% B)`);
    confirmationCount++;
  }
  
  // Sector momentum confirmation
  if (sectorMomentum) {
    if (sectorMomentum.trend.includes('bullish')) {
      reasons.push(`Sector momentum bullish (rank ${sectorMomentum.rank}/10)`);
      confirmationCount++;
    } else if (sectorMomentum.trend.includes('bearish')) {
      reasons.push(`Sector momentum bearish (rank ${sectorMomentum.rank}/10)`);
      confirmationCount++;
    }
  }
  
  // Determine action based on confirmations
  const buySignals = reasons.filter(r => 
    r.includes('oversold') || 
    r.includes('bullish') || 
    (r.includes('RSI') && rsi.value < 40)
  ).length;
  
  const sellSignals = reasons.filter(r => 
    r.includes('overbought') || 
    r.includes('bearish') || 
    (r.includes('RSI') && rsi.value > 60)
  ).length;
  
  // Calculate confidence based on confirmations and indicator confidence
  const indicatorConfidence = (rsi.confidence + macd.confidence + ichimoku.confidence + bollinger.confidence) / 4;
  
  if (buySignals >= 2 && sellSignals === 0) {
    action = 'BUY';
    confidence = Math.min(95, 50 + (confirmationCount * 10) + (indicatorConfidence * 0.3));
  } else if (sellSignals >= 2 && buySignals === 0) {
    action = 'SELL';
    confidence = Math.min(95, 50 + (confirmationCount * 10) + (indicatorConfidence * 0.3));
  } else if (buySignals > 0 && sellSignals > 0) {
    // Conflicting signals
    if (buySignals > sellSignals) {
      action = 'BUY';
      confidence = 40 + (buySignals - sellSignals) * 5;
    } else if (sellSignals > buySignals) {
      action = 'SELL';
      confidence = 40 + (sellSignals - buySignals) * 5;
    } else {
      action = 'HOLD';
      confidence = 30;
      reasons.push('Conflicting signals - no clear direction');
    }
  } else {
    // No strong signals
    action = 'HOLD';
    confidence = Math.max(30, indicatorConfidence * 0.5);
    if (reasons.length === 0) {
      reasons.push('No strong technical signals detected');
    }
  }
  
  // Adjust confidence based on conflicting signals
  if (conflictingSignals.length > 0) {
    confidence = Math.max(20, confidence - (conflictingSignals.length * 10));
  }
  
  // Determine time frame based on indicators
  let timeFrame: 'intraday' | 'swing' | 'position' = 'swing';
  if (rsi.period === 14 && bollinger.bandwidth > 10) {
    timeFrame = 'intraday';
  } else if (ichimoku.cloudDirection !== 'neutral' && macd.histogram !== 0) {
    timeFrame = 'position';
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (confidence > 70 && confirmationCount >= 3) {
    riskLevel = 'low';
  } else if (confidence < 40 || conflictingSignals.length > 1) {
    riskLevel = 'high';
  }
  
  // Calculate stop loss and take profit levels
  let stopLoss: number | undefined;
  let takeProfit: number | undefined;
  
  if (action !== 'HOLD' && indicators.priceData.length > 0) {
    const currentPrice = indicators.priceData[indicators.priceData.length - 1].close;
    const atr = calculateATR(indicators.priceData, 14);
    
    if (action === 'BUY') {
      stopLoss = currentPrice - (atr * 2);
      takeProfit = currentPrice + (atr * 3);
    } else if (action === 'SELL') {
      stopLoss = currentPrice + (atr * 2);
      takeProfit = currentPrice - (atr * 3);
    }
  }
  
  const signal: TradingSignal = {
    symbol,
    action,
    confidence: Math.round(confidence),
    reasons,
    timestamp: new Date().toISOString(),
    timeFrame,
    riskLevel,
    stopLoss,
    takeProfit
  };
  
  return {
    symbol,
    signal,
    indicators: { rsi, macd, ichimoku, bollinger },
    sectorMomentum,
    confirmationCount,
    conflictingSignals
  };
}

/**
 * Calculate Average True Range (ATR) for volatility measurement
 */
function calculateATR(priceData: any[], period: number = 14): number {
  if (priceData.length < period + 1) {
    return 0;
  }
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < priceData.length; i++) {
    const high = priceData[i].high;
    const low = priceData[i].low;
    const prevClose = priceData[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Simple moving average of true ranges
  const recentTRs = trueRanges.slice(-period);
  const sum = recentTRs.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Generate signal with specific indicator focus
 */
export async function generateSignalWithFocus(
  symbol: string,
  focus: 'rsi' | 'macd' | 'ichimoku' | 'bollinger' | 'sector'
): Promise<SignalAnalysis> {
  const analysis = await generateSignal(symbol);
  
  // Adjust confidence based on focus
  if (focus === 'rsi') {
    const rsiWeight = 0.6;
    const otherWeight = 0.4 / 3;
    
    analysis.signal.confidence = Math.round(
      analysis.indicators.rsi.confidence * rsiWeight +
      analysis.indicators.macd.confidence * otherWeight +
      analysis.indicators.ichimoku.confidence * otherWeight +
      analysis.indicators.bollinger.confidence * otherWeight
    );
    
    if (analysis.indicators.rsi.signal !== 'neutral') {
      analysis.signal.reasons.unshift(`RSI-focused analysis: ${analysis.indicators.rsi.signal} at ${analysis.indicators.rsi.value.toFixed(1)}`);
    }
    
  } else if (focus === 'macd') {
    const macdWeight = 0.6;
    const otherWeight = 0.4 / 3;
    
    analysis.signal.confidence = Math.round(
      analysis.indicators.macd.confidence * macdWeight +
      analysis.indicators.rsi.confidence * otherWeight +
      analysis.indicators.ichimoku.confidence * otherWeight +
      analysis.indicators.bollinger.confidence * otherWeight
    );
    
    analysis.signal.reasons.unshift(`MACD-focused analysis: ${analysis.indicators.macd.signalType} crossover`);
    
  } else if (focus === 'sector' && analysis.sectorMomentum) {
    // Give more weight to sector momentum
    analysis.signal.confidence = Math.round(
      analysis.signal.confidence * 0.4 +
      analysis.sectorMomentum.score * 0.6
    );
    
    analysis.signal.reasons.unshift(`Sector-focused analysis: ${analysis.sectorMomentum.trend} momentum`);
  }
  
  return analysis;
}

/**
 * Generate signals for multiple symbols
 */
export async function generateSignalsForSymbols(
  symbols: string[]
): Promise<Record<string, SignalAnalysis>> {
  const results: Record<string, SignalAnalysis> = {};
  
  // Process symbols sequentially to avoid rate limiting
  for (const symbol of symbols) {
    try {
      results[symbol] = await generateSignal(symbol);
    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error);
      // Create a hold signal for failed symbols
      results[symbol] = {
        symbol,
        signal: {
          symbol,
          action: 'HOLD',
          confidence: 0,
          reasons: ['Error analyzing symbol'],
          timestamp: new Date().toISOString(),
          timeFrame: 'position',
          riskLevel: 'high'
        },
        indicators: {
          rsi: { value: 50, signal: 'neutral', confidence: 0, period: 14 },
          macd: { macd: 0, signal: 0, histogram: 0, signalType: 'neutral', confidence: 0 },
          ichimoku: { 
            tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0, chikou: 0,
            cloudDirection: 'neutral', kumoTwist: false, confidence: 0 
          },
          bollinger: { 
            upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 50,
            signal: 'neutral', confidence: 0 
          }
        },
        confirmationCount: 0,
        conflictingSignals: ['Analysis failed']
      };
    }
  }
  
  return results;
}

/**
 * Filter signals by minimum confidence
 */
export function filterSignalsByConfidence(
  signals: Record<string, SignalAnalysis>,
  minConfidence: number = 60
): Record<string, SignalAnalysis> {
  const filtered: Record<string, SignalAnalysis> = {};
  
  for (const [symbol, analysis] of Object.entries(signals)) {
    if (analysis.signal.confidence >= minConfidence && analysis.signal.action !== 'HOLD') {
      filtered[symbol] = analysis;
    }
  }
  
  return filtered;
}

/**
 * Rank signals by confidence and confirmation count
 */
export function rankSignals(
  signals: Record<string, SignalAnalysis>
): Array<{ symbol: string; analysis: SignalAnalysis; score: number }> {
  const ranked: Array<{ symbol: string; analysis: SignalAnalysis; score: number }> = [];
  
  for (const [symbol, analysis] of Object.entries(signals)) {
    if (analysis.signal.action === 'HOLD') continue;
    
    // Calculate composite score
    const confidenceScore = analysis.signal.confidence;
    const confirmationScore = analysis.confirmationCount * 10;
    const conflictPenalty = analysis.conflictingSignals.length * 15;
    
    const score = confidenceScore + confirmationScore - conflictPenalty;
    
    ranked.push({ symbol, analysis, score });
  }
  
  // Sort by score (highest first)
  ranked.sort((a, b) => b.score - a.score);
  
  return ranked;
}

/**
 * Generate signal summary report
 */
export function generateSignalReport(
  signals: Record<string, SignalAnalysis>
): {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  averageConfidence: number;
  topSignals: Array<{ symbol: string; action: string; confidence: number }>;
  riskDistribution: { low: number; medium: number; high: number };
} {
  let buyCount = 0;
  let sellCount = 0;
  let holdCount = 0;
  let totalConfidence = 0;
  const topSignals: Array<{ symbol: string; action: string; confidence: number }> = [];
  const riskDistribution = { low: 0, medium: 0, high: 0 };
  
  for (const [symbol, analysis] of Object.entries(signals)) {
    if (analysis.signal.action === 'BUY') buyCount++;
    else if (analysis.signal.action === 'SELL') sellCount++;
    else holdCount++;
    
    totalConfidence += analysis.signal.confidence;
    
    // Track risk distribution
    riskDistribution[analysis.signal.riskLevel]++;
    
    // Add to top signals if not HOLD
    if (analysis.signal.action !== 'HOLD') {
      topSignals.push({
        symbol,
        action: analysis.signal.action,
        confidence: analysis.signal.confidence
      });
    }
  }
  
  // Sort top signals by confidence
  topSignals.sort((a, b) => b.confidence - a.confidence);
  
  const total = Object.keys(signals).length;
  
  return {
    totalSignals: total,
    buySignals: buyCount,
    sellSignals: sellCount,
    holdSignals: holdCount,
    averageConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
    topSignals: topSignals.slice(0, 5),
    riskDistribution
  };
}

/**
 * Validate signal against risk parameters
 */
export function validateSignal(
  signal: TradingSignal,
  riskParams: {
    maxRiskPerTrade: number;
    maxPositionSize: number;
    minConfidence: number;
    allowedTimeFrames: ('intraday' | 'swing' | 'position')[];
  }
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  if (signal.confidence < riskParams.minConfidence) {
    reasons.push(`Confidence ${signal.confidence}% below minimum ${riskParams.minConfidence}%`);
  }
  
  if (!riskParams.allowedTimeFrames.includes(signal.timeFrame)) {
    reasons.push(`Time frame ${signal.timeFrame} not allowed`);
  }
  
  if (signal.riskLevel === 'high' && riskParams.maxRiskPerTrade < 2) {
    reasons.push('High risk signal not allowed with current risk parameters');
  }
  
  const valid = reasons.length === 0;
  
  if (valid) {
    reasons.push('Signal passes all risk checks');
  }
  
  return { valid, reasons };
}
