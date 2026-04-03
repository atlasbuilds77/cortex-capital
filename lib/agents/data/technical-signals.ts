/**
 * TECHNICAL SIGNALS ENGINE v2
 * 
 * BACKTESTED STRATEGIES:
 * 
 * EMA_REJECT_SHORT (PRIMARY): 69.4% WR, 2.37 PF, +47% annual
 * - Strong downtrend (EMA9 < EMA21 < SMA50)
 * - Rally to EMA9 (dead cat bounce)
 * - Rejection candle closes below prev low
 * - Volume > 1.2x average
 * - Trend strength < -3%
 * 
 * EMA_BOUNCE_LONG (SECONDARY): 58.1% WR, 1.13 PF
 * - Strong uptrend (EMA9 > EMA21 > SMA50)
 * - Pullback touches EMA9
 * - Bounce candle closes above prev high
 * - Volume > 1.2x average
 * - Trend +3% to +15% (not extended)
 */

import { getDailyBars, getQuote } from '../../polygon-data';

export interface TechnicalSignal {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  strength: number;
  reasons: string[];
  entry?: number;
  stop?: number;
  target?: number;
  patterns: string[];
  direction?: 'long' | 'short';
}

interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let e = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    e = prices[i] * k + e * (1 - k);
  }
  return e;
}

/**
 * Analyze a symbol for high-probability setups
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
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const bars = await getDailyBars(symbol, startDate, endDate);
    if (!bars || bars.length < 60) {
      signal.reasons.push('Insufficient data');
      return signal;
    }

    const closes = bars.map((b: any) => b.close);
    const current = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    const sma50 = sma(closes, 50);

    if (!ema9 || !ema21 || !sma50) {
      signal.reasons.push('Insufficient data for EMAs');
      return signal;
    }

    const avgVol = bars.slice(-20, -1).reduce((a: number, b: any) => a + b.volume, 0) / 19;
    const volRatio = current.volume / avgVol;
    const trendStrength = ((current.close / ema21) - 1) * 100;

    // ============================================
    // STRATEGY 1: EMA_REJECT_SHORT (69.4% WR)
    // ============================================
    const strongDowntrend = ema9 < ema21 && ema21 < sma50 && current.close < sma50;
    const rallyToEma = prev.high >= ema9 * 0.98 && prev.high <= ema9 * 1.03;
    const rejectConfirm = current.close < prev.low && current.close < ema9;
    const shortTrendConfirm = trendStrength < -3;
    const shortVolConfirm = volRatio > 1.2;

    if (strongDowntrend && rallyToEma && rejectConfirm && shortTrendConfirm && shortVolConfirm) {
      signal.signal = 'sell';
      signal.strength = 80;
      signal.direction = 'short';
      signal.patterns.push('EMA_REJECT_SHORT');
      signal.reasons.push(`Downtrend ${trendStrength.toFixed(1)}%`);
      signal.reasons.push(`Volume ${volRatio.toFixed(1)}x avg`);
      signal.reasons.push('Rally rejected at EMA9');
      signal.entry = current.close;
      signal.stop = Math.max(prev.high, ema9) * 1.01;
      signal.target = current.close * 0.96;
      return signal;
    }

    // ============================================
    // STRATEGY 2: EMA_BOUNCE_LONG (58.1% WR)
    // ============================================
    const strongUptrend = ema9 > ema21 && ema21 > sma50 && current.close > sma50;
    const pullbackToEma = prev.low <= ema9 * 1.02 && prev.low >= ema9 * 0.97;
    const bounceConfirm = current.close > prev.high && current.close > ema9;
    const longTrendConfirm = trendStrength > 3 && trendStrength < 15;
    const longVolConfirm = volRatio > 1.2;

    if (strongUptrend && pullbackToEma && bounceConfirm && longTrendConfirm && longVolConfirm) {
      signal.signal = 'buy';
      signal.strength = 70;
      signal.direction = 'long';
      signal.patterns.push('EMA_BOUNCE_LONG');
      signal.reasons.push(`Uptrend +${trendStrength.toFixed(1)}%`);
      signal.reasons.push(`Volume ${volRatio.toFixed(1)}x avg`);
      signal.reasons.push('Pullback bounced off EMA9');
      signal.entry = current.close;
      signal.stop = Math.min(prev.low, ema21) * 0.99;
      signal.target = current.close * 1.04;
      return signal;
    }

    // No setup found
    signal.reasons.push('No high-probability setup');
    if (strongDowntrend) {
      signal.reasons.push('Downtrend but no confirmation');
    } else if (strongUptrend) {
      signal.reasons.push('Uptrend but no confirmation');
    } else {
      signal.reasons.push('No clear trend');
    }

  } catch (error: any) {
    signal.reasons.push(`Error: ${error.message}`);
  }

  return signal;
}

/**
 * Scan multiple symbols for signals
 */
export async function scanForSignals(symbols: string[]): Promise<TechnicalSignal[]> {
  const results: TechnicalSignal[] = [];

  for (const symbol of symbols) {
    try {
      const signal = await analyzeTechnicals(symbol);
      results.push(signal);
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`[TechnicalSignals] Error scanning ${symbol}:`, error);
    }
  }

  return results.sort((a, b) => b.strength - a.strength);
}

/**
 * Get actionable trade ideas (signals that are buy/sell, not hold)
 */
export async function getTopTradeIdeas(
  symbols: string[],
  signalType: 'buy' | 'sell' | 'both' = 'both',
  limit: number = 5
): Promise<TechnicalSignal[]> {
  const signals = await scanForSignals(symbols);

  return signals
    .filter(s => s.signal !== 'hold')
    .filter(s => signalType === 'both' || s.signal === signalType)
    .filter(s => s.strength >= 65)
    .slice(0, limit);
}

export default {
  analyzeTechnicals,
  scanForSignals,
  getTopTradeIdeas,
};
