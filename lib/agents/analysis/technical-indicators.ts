// Cortex Capital - Technical Indicators Engine
// RSI(14), MACD, Ichimoku Cloud, Bollinger Bands
// Uses Tradier API for price data (env: TRADIER_API_KEY)

import { getQuote, getQuotes, TradierQuote } from '../../integrations/tradier';

export interface PriceData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSignal {
  value: number;
  signal: 'oversold' | 'overbought' | 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
}

export interface RSIResult extends IndicatorSignal {
  period: number;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  signalType: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface IchimokuResult {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
  cloudDirection: 'bullish' | 'bearish' | 'neutral';
  kumoTwist: boolean;
  confidence: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
  signal: 'oversold' | 'overbought' | 'neutral';
  confidence: number;
}

/**
 * Fetch historical price data for a symbol
 * Note: Tradier API has limited historical data endpoints
 * For production, consider using a dedicated historical data provider
 */
async function fetchHistoricalData(symbol: string, period: number = 30): Promise<PriceData[]> {
  // In a real implementation, this would fetch historical candles
  // For now, we'll use a simplified approach with recent quotes
  // and mock some historical data for demonstration
  
  const quote = await getQuote(symbol);
  if (!quote) {
    throw new Error(`No quote data available for ${symbol}`);
  }
  
  // Mock historical data for demonstration
  // In production, replace with actual historical API calls
  const mockData: PriceData[] = [];
  const basePrice = quote.last || quote.close || 100;
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = period; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
    const close = basePrice * randomFactor;
    const open = close * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    
    mockData.push({
      timestamp: date.toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return mockData;
}

/**
 * Calculate RSI (Relative Strength Index)
 * @param prices Array of closing prices
 * @param period RSI period (default: 14)
 */
export function calculateRSI(prices: number[], period: number = 14): RSIResult {
  if (prices.length < period + 1) {
    throw new Error(`Need at least ${period + 1} price points for RSI calculation`);
  }
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change; // losses are positive values
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI using Wilder's smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let currentGain = 0;
    let currentLoss = 0;
    
    if (change > 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Determine signal
  let signal: 'oversold' | 'overbought' | 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 50;
  
  if (rsi < 30) {
    signal = 'oversold';
    confidence = 80 - (rsi / 30) * 30;
  } else if (rsi > 70) {
    signal = 'overbought';
    confidence = 80 - ((100 - rsi) / 30) * 30;
  } else if (rsi > 50) {
    signal = 'bullish';
    confidence = 50 + ((rsi - 50) / 20) * 30;
  } else if (rsi < 50) {
    signal = 'bearish';
    confidence = 50 + ((50 - rsi) / 20) * 30;
  }
  
  return {
    value: rsi,
    signal,
    confidence: Math.min(100, Math.max(0, confidence)),
    period
  };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param prices Array of closing prices
 * @param fastPeriod Fast EMA period (default: 12)
 * @param slowPeriod Slow EMA period (default: 26)
 * @param signalPeriod Signal line period (default: 9)
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDResult {
  if (prices.length < slowPeriod + signalPeriod) {
    throw new Error(`Need at least ${slowPeriod + signalPeriod} price points for MACD calculation`);
  }
  
  // Calculate EMAs
  function calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema[period - 1] = sum / period;
    
    // Calculate subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    
    return ema;
  }
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macdLine[i] = fastEMA[i] - slowEMA[i];
  }
  
  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);
  
  // Calculate histogram
  const histogram: number[] = [];
  const offset = slowPeriod - 1 + signalPeriod - 1;
  for (let i = offset; i < macdLine.length; i++) {
    const macdIdx = i;
    const signalIdx = i - (slowPeriod - 1) - (signalPeriod - 1);
    histogram[i] = macdLine[macdIdx] - signalLine[signalIdx];
  }
  
  // Get latest values
  const latestMacd = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];
  const latestHistogram = histogram[histogram.length - 1];
  
  // Determine signal
  let signalType: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 50;
  
  if (latestMacd > latestSignal && latestHistogram > 0) {
    signalType = 'bullish';
    confidence = 70 + Math.min(30, Math.abs(latestHistogram) * 10);
  } else if (latestMacd < latestSignal && latestHistogram < 0) {
    signalType = 'bearish';
    confidence = 70 + Math.min(30, Math.abs(latestHistogram) * 10);
  }
  
  return {
    macd: latestMacd,
    signal: latestSignal,
    histogram: latestHistogram,
    signalType,
    confidence: Math.min(100, Math.max(0, confidence))
  };
}

/**
 * Calculate Ichimoku Cloud
 * @param prices Array of price data with high, low, close
 * @param conversionPeriod Tenkan period (default: 9)
 * @param basePeriod Kijun period (default: 26)
 * @param leadingSpanBPeriod Senkou B period (default: 52)
 */
export function calculateIchimoku(
  prices: PriceData[],
  conversionPeriod: number = 9,
  basePeriod: number = 26,
  leadingSpanBPeriod: number = 52
): IchimokuResult {
  if (prices.length < leadingSpanBPeriod) {
    throw new Error(`Need at least ${leadingSpanBPeriod} price points for Ichimoku calculation`);
  }
  
  // Helper function to calculate highest high and lowest low
  function getHighLow(data: PriceData[], start: number, end: number): { high: number, low: number } {
    let high = -Infinity;
    let low = Infinity;
    
    for (let i = start; i <= end; i++) {
      high = Math.max(high, data[i].high);
      low = Math.min(low, data[i].low);
    }
    
    return { high, low };
  }
  
  const latestIdx = prices.length - 1;
  
  // Tenkan-sen (Conversion Line)
  const tenkanRange = getHighLow(prices, latestIdx - conversionPeriod + 1, latestIdx);
  const tenkan = (tenkanRange.high + tenkanRange.low) / 2;
  
  // Kijun-sen (Base Line)
  const kijunRange = getHighLow(prices, latestIdx - basePeriod + 1, latestIdx);
  const kijun = (kijunRange.high + kijunRange.low) / 2;
  
  // Senkou Span A (Leading Span A)
  const senkouA = (tenkan + kijun) / 2;
  
  // Senkou Span B (Leading Span B)
  const senkouBRange = getHighLow(prices, latestIdx - leadingSpanBPeriod + 1, latestIdx);
  const senkouB = (senkouBRange.high + senkouBRange.low) / 2;
  
  // Chikou Span (Lagging Span) - 26 periods behind
  const chikouIdx = latestIdx - basePeriod;
  const chikou = chikouIdx >= 0 ? prices[chikouIdx].close : 0;
  
  // Determine cloud direction
  let cloudDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 50;
  
  if (senkouA > senkouB) {
    cloudDirection = 'bullish';
    confidence = 70;
  } else if (senkouA < senkouB) {
    cloudDirection = 'bearish';
    confidence = 70;
  }
  
  // Check for Kumo Twist (cloud crossing)
  const kumoTwist = Math.abs(senkouA - senkouB) / ((senkouA + senkouB) / 2) < 0.01;
  
  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    chikou,
    cloudDirection,
    kumoTwist,
    confidence
  };
}

/**
 * Calculate Bollinger Bands
 * @param prices Array of closing prices
 * @param period Moving average period (default: 20)
 * @param stdDev Standard deviation multiplier (default: 2)
 */
export function getBollingerBands(
  prices: number[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerBandsResult {
  if (prices.length < period) {
    throw new Error(`Need at least ${period} price points for Bollinger Bands calculation`);
  }
  
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((a, b) => a + b, 0);
  const middle = sum / period;
  
  // Calculate standard deviation
  const squaredDiffs = recentPrices.map(price => Math.pow(price - middle, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);
  const bandwidth = (upper - lower) / middle * 100;
  
  const latestPrice = prices[prices.length - 1];
  const percentB = (latestPrice - lower) / (upper - lower) * 100;
  
  // Determine signal
  let signal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  let confidence = 50;
  
  if (percentB < 20) {
    signal = 'oversold';
    confidence = 80 - (percentB / 20) * 30;
  } else if (percentB > 80) {
    signal = 'overbought';
    confidence = 80 - ((100 - percentB) / 20) * 30;
  }
  
  return {
    upper,
    middle,
    lower,
    bandwidth,
    percentB,
    signal,
    confidence: Math.min(100, Math.max(0, confidence))
  };
}

/**
 * Main function to calculate all technical indicators for a symbol
 */
export async function calculateAllIndicators(symbol: string): Promise<{
  rsi: RSIResult;
  macd: MACDResult;
  ichimoku: IchimokuResult;
  bollinger: BollingerBandsResult;
  priceData: PriceData[];
}> {
  // Fetch historical data
  const priceData = await fetchHistoricalData(symbol, 100); // Get 100 days of data
  
  // Extract closing prices
  const closingPrices = priceData.map(p => p.close);
  
  // Calculate all indicators
  const rsi = calculateRSI(closingPrices);
  const macd = calculateMACD(closingPrices);
  const ichimoku = calculateIchimoku(priceData);
  const bollinger = getBollingerBands(closingPrices);
  
  return {
    rsi,
    macd,
    ichimoku,
    bollinger,
    priceData
  };
}

/**
 * Get RSI for a symbol
 */
export async function getRSI(symbol: string, period: number = 14): Promise<RSIResult> {
  const priceData = await fetchHistoricalData(symbol, period * 2);
  const closingPrices = priceData.map(p => p.close);
  return calculateRSI(closingPrices, period);
}

/**
 * Get MACD for a symbol
 */
export async function getMACD(
  symbol: string, 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): Promise<MACDResult> {
  const priceData = await fetchHistoricalData(symbol, slowPeriod + signalPeriod + 20);
  const closingPrices = priceData.map(p => p.close);
  return calculateMACD(closingPrices, fastPeriod, slowPeriod, signalPeriod);
}

/**
 * Get Ichimoku Cloud for a symbol
 */
export async function getIchimoku(symbol: string): Promise<IchimokuResult> {
  const priceData = await fetchHistoricalData(symbol, 100);
  return calculateIchimoku(priceData);
}

/**
 * Get Bollinger Bands for a symbol
 */
export async function getBollinger(symbol: string, period: number = 20, stdDev: number = 2): Promise<BollingerBandsResult> {
  const priceData = await fetchHistoricalData(symbol, period * 2);
  const closingPrices = priceData.map(p => p.close);
  return getBollingerBands(closingPrices, period, stdDev);
}