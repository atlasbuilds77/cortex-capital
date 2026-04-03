/**
 * TECHNICAL SIGNALS ENGINE
 * Generates trade signals based on price action, momentum, and volume
 * 
 * Used by auto-trading daemon to generate actual entry signals
 * instead of just asking DeepSeek "what looks good?"
 */

import { getDailyBars, getQuote } from '../../polygon-data';

export interface TechnicalSignal {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 0-100
  reasons: string[];
  entry?: number;
  stop?: number;
  target?: number;
  patterns: string[];
}

interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Calculate Simple Moving Average
 */
function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate Relative Strength Index
 */
function rsi(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains = changes.slice(-period).filter(c => c > 0);
  const losses = changes.slice(-period).filter(c => c < 0).map(l => Math.abs(l));
  
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Check if price is at support (recent low)
 */
function nearSupport(bars: DailyBar[], currentPrice: number, lookback: number = 20): boolean {
  const lows = bars.slice(-lookback).map(b => b.low);
  const minLow = Math.min(...lows);
  const range = Math.max(...bars.slice(-lookback).map(b => b.high)) - minLow;
  return currentPrice <= minLow + (range * 0.1); // Within 10% of range from low
}

/**
 * Check if price is at resistance (recent high)
 */
function nearResistance(bars: DailyBar[], currentPrice: number, lookback: number = 20): boolean {
  const highs = bars.slice(-lookback).map(b => b.high);
  const maxHigh = Math.max(...highs);
  const range = maxHigh - Math.min(...bars.slice(-lookback).map(b => b.low));
  return currentPrice >= maxHigh - (range * 0.1);
}

/**
 * Detect breakout from consolidation
 */
function isBreakout(bars: DailyBar[], volumeMultiple: number = 1.5): { breakout: boolean; direction: 'up' | 'down' | null } {
  if (bars.length < 21) return { breakout: false, direction: null };
  
  const recent = bars.slice(-1)[0];
  const prior20 = bars.slice(-21, -1);
  
  const avgVolume = prior20.reduce((a, b) => a + b.volume, 0) / 20;
  const highOfRange = Math.max(...prior20.map(b => b.high));
  const lowOfRange = Math.min(...prior20.map(b => b.low));
  
  const volumeSpike = recent.volume > avgVolume * volumeMultiple;
  
  if (recent.close > highOfRange && volumeSpike) {
    return { breakout: true, direction: 'up' };
  }
  if (recent.close < lowOfRange && volumeSpike) {
    return { breakout: true, direction: 'down' };
  }
  
  return { breakout: false, direction: null };
}

/**
 * Detect pullback to moving average
 */
function isPullbackToMA(bars: DailyBar[], maPeriod: number = 21): boolean {
  const closes = bars.map(b => b.close);
  const ma = sma(closes, maPeriod);
  if (!ma) return false;
  
  const currentPrice = closes[closes.length - 1];
  const distance = Math.abs(currentPrice - ma) / ma;
  
  // Within 2% of MA
  return distance < 0.02;
}

/**
 * Calculate momentum score
 */
function momentumScore(bars: DailyBar[]): number {
  if (bars.length < 20) return 50;
  
  const closes = bars.map(b => b.close);
  const rsiValue = rsi(closes) || 50;
  
  // Price vs 20 SMA
  const ma20 = sma(closes, 20) || closes[closes.length - 1];
  const priceVsMa = ((closes[closes.length - 1] / ma20) - 1) * 100;
  
  // Recent performance (5 day)
  const fiveDayReturn = ((closes[closes.length - 1] / closes[closes.length - 6]) - 1) * 100;
  
  // Combine factors
  let score = 50;
  score += (rsiValue - 50) * 0.3; // RSI contribution
  score += priceVsMa * 2; // Price vs MA contribution
  score += fiveDayReturn * 1.5; // Recent momentum contribution
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate technical signal for a symbol
 */
export async function analyzeTechnicals(symbol: string): Promise<TechnicalSignal> {
  const signal: TechnicalSignal = {
    symbol,
    signal: 'hold',
    strength: 50,
    reasons: [],
    patterns: [],
  };
  
  try {
    // Get historical data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const bars = await getDailyBars(symbol, startDate, endDate);
    if (!bars || bars.length < 30) {
      signal.reasons.push('Insufficient data');
      return signal;
    }
    
    const quote = await getQuote(symbol);
    const currentPrice = quote?.last || bars[bars.length - 1].close;
    
    const closes = bars.map(b => b.close);
    
    // Calculate indicators
    const rsiValue = rsi(closes);
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);
    const momentum = momentumScore(bars);
    const { breakout, direction } = isBreakout(bars);
    
    let buySignals = 0;
    let sellSignals = 0;
    
    // RSI signals
    if (rsiValue !== null) {
      if (rsiValue < 30) {
        buySignals += 2;
        signal.reasons.push(`RSI oversold (${rsiValue.toFixed(1)})`);
        signal.patterns.push('RSI_OVERSOLD');
      } else if (rsiValue > 70) {
        sellSignals += 2;
        signal.reasons.push(`RSI overbought (${rsiValue.toFixed(1)})`);
        signal.patterns.push('RSI_OVERBOUGHT');
      }
    }
    
    // MA trend
    if (ma20 && ma50) {
      if (ma20 > ma50 && currentPrice > ma20) {
        buySignals += 1;
        signal.reasons.push('Uptrend (price > 20 MA > 50 MA)');
        signal.patterns.push('UPTREND');
      } else if (ma20 < ma50 && currentPrice < ma20) {
        sellSignals += 1;
        signal.reasons.push('Downtrend (price < 20 MA < 50 MA)');
        signal.patterns.push('DOWNTREND');
      }
    }
    
    // Breakout detection
    if (breakout) {
      if (direction === 'up') {
        buySignals += 3;
        signal.reasons.push('Breakout with volume');
        signal.patterns.push('BREAKOUT_UP');
      } else {
        sellSignals += 3;
        signal.reasons.push('Breakdown with volume');
        signal.patterns.push('BREAKDOWN');
      }
    }
    
    // Pullback to MA (buy opportunity in uptrend)
    if (ma20 && ma50 && ma20 > ma50 && isPullbackToMA(bars)) {
      buySignals += 2;
      signal.reasons.push('Pullback to 21 MA in uptrend');
      signal.patterns.push('PULLBACK_BUY');
    }
    
    // Support/Resistance
    if (nearSupport(bars, currentPrice)) {
      buySignals += 1;
      signal.reasons.push('Near support level');
      signal.patterns.push('NEAR_SUPPORT');
    }
    if (nearResistance(bars, currentPrice)) {
      sellSignals += 1;
      signal.reasons.push('Near resistance level');
      signal.patterns.push('NEAR_RESISTANCE');
    }
    
    // Momentum boost
    if (momentum > 65) {
      buySignals += 1;
      signal.reasons.push(`Strong momentum (${momentum.toFixed(0)})`);
    } else if (momentum < 35) {
      sellSignals += 1;
      signal.reasons.push(`Weak momentum (${momentum.toFixed(0)})`);
    }
    
    // Determine signal
    const netSignal = buySignals - sellSignals;
    
    if (netSignal >= 3) {
      signal.signal = 'buy';
      signal.strength = Math.min(95, 50 + netSignal * 10);
    } else if (netSignal <= -3) {
      signal.signal = 'sell';
      signal.strength = Math.min(95, 50 + Math.abs(netSignal) * 10);
    } else {
      signal.signal = 'hold';
      signal.strength = 50;
      if (signal.reasons.length === 0) {
        signal.reasons.push('No clear signal');
      }
    }
    
    // Set entry/stop/target for buy signals
    if (signal.signal === 'buy' && ma20) {
      signal.entry = currentPrice;
      signal.stop = Math.min(currentPrice * 0.92, ma20 * 0.98); // 8% or below MA
      signal.target = currentPrice * 1.15; // 15% target
    }
    
  } catch (error: any) {
    signal.reasons.push(`Analysis error: ${error.message}`);
  }
  
  return signal;
}

/**
 * Scan multiple symbols for trade signals
 */
export async function scanForSignals(symbols: string[]): Promise<TechnicalSignal[]> {
  const results: TechnicalSignal[] = [];
  
  for (const symbol of symbols) {
    try {
      const signal = await analyzeTechnicals(symbol);
      results.push(signal);
    } catch (error) {
      console.error(`[TechnicalSignals] Error scanning ${symbol}:`, error);
    }
  }
  
  // Sort by signal strength
  return results.sort((a, b) => b.strength - a.strength);
}

/**
 * Get top trade ideas based on technical analysis
 */
export async function getTopTradeIdeas(
  symbols: string[],
  signalType: 'buy' | 'sell' | 'both' = 'buy',
  limit: number = 5
): Promise<TechnicalSignal[]> {
  const signals = await scanForSignals(symbols);
  
  return signals
    .filter(s => signalType === 'both' || s.signal === signalType)
    .filter(s => s.strength >= 60) // Only confident signals
    .slice(0, limit);
}

export default {
  analyzeTechnicals,
  scanForSignals,
  getTopTradeIdeas,
};
