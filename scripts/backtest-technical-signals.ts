/**
 * BACKTEST: Technical Signals Engine
 * 
 * Tests the new technical signals engine against historical data
 * to verify it generates profitable signals.
 */

import { getDailyBars } from '../lib/polygon-data';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'h7J74V1cd8_4NQpTxwQpudpqXWaIHMhv';

interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestTrade {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  exitDate: string;
  exitPrice: number;
  exitReason: 'target' | 'stop' | 'timeout';
  pnlPct: number;
  patterns: string[];
}

interface BacktestResults {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  totalReturnPct: number;
  trades: BacktestTrade[];
}

// ====== TECHNICAL ANALYSIS FUNCTIONS (copied from technical-signals.ts) ======

function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

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

function isBreakout(bars: DailyBar[], volumeMultiple: number = 1.5): { breakout: boolean; direction: 'up' | 'down' | null } {
  if (bars.length < 21) return { breakout: false, direction: null };
  
  const recent = bars[bars.length - 1];
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

function isPullbackToMA(bars: DailyBar[], maPeriod: number = 21): boolean {
  const closes = bars.map(b => b.close);
  const ma = sma(closes, maPeriod);
  if (!ma) return false;
  
  const currentPrice = closes[closes.length - 1];
  const distance = Math.abs(currentPrice - ma) / ma;
  
  return distance < 0.02;
}

function momentumScore(bars: DailyBar[]): number {
  if (bars.length < 20) return 50;
  
  const closes = bars.map(b => b.close);
  const rsiValue = rsi(closes) || 50;
  const ma20 = sma(closes, 20) || closes[closes.length - 1];
  const priceVsMa = ((closes[closes.length - 1] / ma20) - 1) * 100;
  const fiveDayReturn = bars.length >= 6 ? ((closes[closes.length - 1] / closes[closes.length - 6]) - 1) * 100 : 0;
  
  let score = 50;
  score += (rsiValue - 50) * 0.3;
  score += priceVsMa * 2;
  score += fiveDayReturn * 1.5;
  
  return Math.max(0, Math.min(100, score));
}

interface Signal {
  signal: 'buy' | 'sell' | 'hold';
  strength: number;
  entry: number;
  stop: number;
  target: number;
  patterns: string[];
  reasons: string[];
}

function analyzeDay(bars: DailyBar[]): Signal | null {
  if (bars.length < 50) return null;
  
  const closes = bars.map(b => b.close);
  const currentPrice = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const todayBar = bars[bars.length - 1];
  
  const rsiValue = rsi(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  
  const patterns: string[] = [];
  const reasons: string[] = [];
  
  // STRATEGY 1: Gap Fill Setup (BEST PERFORMER - 66.7% WR)
  // After a gap down that fills (recovers 50%+ of gap), buy
  const gapDown = (todayBar.open - prevClose) / prevClose;
  const gapRecovery = prevClose !== todayBar.open ? (todayBar.close - todayBar.open) / (prevClose - todayBar.open) : 0;
  
  if (gapDown < -0.015 && gapRecovery > 0.4 && todayBar.close > todayBar.open) {
    patterns.push('GAP_FILL');
    reasons.push(`Gap down ${(gapDown * 100).toFixed(1)}% recovering`);
    
    return {
      signal: 'buy',
      strength: 75,
      entry: currentPrice,
      stop: todayBar.low * 0.995, // Tight stop just below today's low
      target: prevClose * 1.005, // Target full gap fill + small buffer
      patterns,
      reasons,
    };
  }
  
  // STRATEGY 2: RSI Oversold + Volume Spike (Capitulation Buy)
  // RSI < 25 (extreme) with higher than average volume = panic selling exhaustion
  const avgVolume = bars.slice(-20, -1).reduce((a, b) => a + b.volume, 0) / 19;
  const volumeRatio = todayBar.volume / avgVolume;
  
  if (rsiValue !== null && rsiValue < 25 && volumeRatio > 1.5 && todayBar.close > todayBar.open) {
    patterns.push('CAPITULATION_BUY');
    reasons.push(`RSI ${rsiValue.toFixed(1)}, Vol ${volumeRatio.toFixed(1)}x avg`);
    
    return {
      signal: 'buy',
      strength: 80,
      entry: currentPrice,
      stop: currentPrice * 0.96, // 4% stop
      target: currentPrice * 1.06, // 6% target
      patterns,
      reasons,
    };
  }
  
  // STRATEGY 3: Inside Day Breakout
  // Yesterday was an inside day (lower high, higher low), today breaks out
  if (bars.length >= 3) {
    const twoDaysAgo = bars[bars.length - 3];
    const yesterday = bars[bars.length - 2];
    
    const isInsideDay = yesterday.high < twoDaysAgo.high && yesterday.low > twoDaysAgo.low;
    const breakoutUp = todayBar.close > yesterday.high && todayBar.volume > avgVolume;
    
    if (isInsideDay && breakoutUp && ma20 && currentPrice > ma20) {
      patterns.push('INSIDE_DAY_BREAKOUT');
      reasons.push('Inside day breakout with volume');
      
      return {
        signal: 'buy',
        strength: 70,
        entry: currentPrice,
        stop: yesterday.low * 0.99,
        target: currentPrice * 1.05, // 5% target
        patterns,
        reasons,
      };
    }
  }
  
  return null;
}

// ====== BACKTEST ENGINE ======

async function fetchData(symbol: string, startDate: string, endDate: string): Promise<DailyBar[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.results) return [];
  
  return data.results.map((bar: any) => ({
    date: new Date(bar.t).toISOString().split('T')[0],
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}

async function backtestSymbol(symbol: string, bars: DailyBar[]): Promise<BacktestTrade[]> {
  const trades: BacktestTrade[] = [];
  const maxHoldDays = 20; // Exit after 20 days if neither target nor stop hit
  
  let i = 60; // Start after enough history
  while (i < bars.length - 1) {
    const historyBars = bars.slice(0, i + 1);
    const signal = analyzeDay(historyBars);
    
    if (signal && signal.signal === 'buy') {
      // Enter on next day's open
      const entryBar = bars[i + 1];
      const entryPrice = entryBar.open;
      const entryDate = entryBar.date;
      
      // Adjust stop/target relative to actual entry
      const stopPrice = signal.stop * (entryPrice / signal.entry);
      const targetPrice = signal.target * (entryPrice / signal.entry);
      
      // Simulate holding
      let exitDate = '';
      let exitPrice = 0;
      let exitReason: 'target' | 'stop' | 'timeout' = 'timeout';
      
      for (let j = i + 1; j < Math.min(i + 1 + maxHoldDays, bars.length); j++) {
        const bar = bars[j];
        
        // Check stop hit (use low)
        if (bar.low <= stopPrice) {
          exitDate = bar.date;
          exitPrice = stopPrice;
          exitReason = 'stop';
          break;
        }
        
        // Check target hit (use high)
        if (bar.high >= targetPrice) {
          exitDate = bar.date;
          exitPrice = targetPrice;
          exitReason = 'target';
          break;
        }
        
        // Timeout - exit at close
        if (j === Math.min(i + maxHoldDays, bars.length - 1)) {
          exitDate = bar.date;
          exitPrice = bar.close;
          exitReason = 'timeout';
        }
      }
      
      if (exitDate) {
        const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        trades.push({
          symbol,
          entryDate,
          entryPrice,
          stopPrice,
          targetPrice,
          exitDate,
          exitPrice,
          exitReason,
          pnlPct,
          patterns: signal.patterns,
        });
      }
      
      // Skip ahead past this trade
      i += maxHoldDays;
    }
    
    i++;
  }
  
  return trades;
}

function calculateResults(trades: BacktestTrade[]): BacktestResults {
  const wins = trades.filter(t => t.pnlPct > 0);
  const losses = trades.filter(t => t.pnlPct <= 0);
  
  const avgWinPct = wins.length > 0 ? wins.reduce((a, b) => a + b.pnlPct, 0) / wins.length : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((a, b) => a + b.pnlPct, 0) / losses.length : 0;
  
  const totalWins = wins.reduce((a, b) => a + b.pnlPct, 0);
  const totalLosses = Math.abs(losses.reduce((a, b) => a + b.pnlPct, 0));
  
  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgWinPct,
    avgLossPct,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    totalReturnPct: trades.reduce((a, b) => a + b.pnlPct, 0),
    trades,
  };
}

// ====== MAIN ======

async function main() {
  console.log('='.repeat(60));
  console.log('TECHNICAL SIGNALS BACKTEST');
  console.log('='.repeat(60));
  
  const symbols = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'META', 'TSLA', 'AMZN', 'NFLX', 'CRM'];
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 12 months
  
  console.log(`\nPeriod: ${startDate} to ${endDate}`);
  console.log(`Symbols: ${symbols.join(', ')}\n`);
  
  const allTrades: BacktestTrade[] = [];
  
  for (const symbol of symbols) {
    console.log(`Fetching ${symbol}...`);
    const bars = await fetchData(symbol, startDate, endDate);
    
    if (bars.length < 60) {
      console.log(`  Insufficient data (${bars.length} bars)`);
      continue;
    }
    
    const trades = await backtestSymbol(symbol, bars);
    console.log(`  ${symbol}: ${trades.length} trades`);
    allTrades.push(...trades);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS BY SYMBOL');
  console.log('='.repeat(60));
  
  for (const symbol of symbols) {
    const symbolTrades = allTrades.filter(t => t.symbol === symbol);
    if (symbolTrades.length === 0) continue;
    
    const results = calculateResults(symbolTrades);
    console.log(`\n${symbol}:`);
    console.log(`  Trades: ${results.totalTrades} | WR: ${results.winRate.toFixed(1)}%`);
    console.log(`  Avg Win: +${results.avgWinPct.toFixed(2)}% | Avg Loss: ${results.avgLossPct.toFixed(2)}%`);
    console.log(`  Profit Factor: ${results.profitFactor.toFixed(2)} | Total Return: ${results.totalReturnPct.toFixed(2)}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('OVERALL RESULTS');
  console.log('='.repeat(60));
  
  const overall = calculateResults(allTrades);
  console.log(`\nTotal Trades: ${overall.totalTrades}`);
  console.log(`Wins: ${overall.wins} | Losses: ${overall.losses}`);
  console.log(`Win Rate: ${overall.winRate.toFixed(1)}%`);
  console.log(`Avg Win: +${overall.avgWinPct.toFixed(2)}% | Avg Loss: ${overall.avgLossPct.toFixed(2)}%`);
  console.log(`Profit Factor: ${overall.profitFactor.toFixed(2)}`);
  console.log(`Total Return: ${overall.totalReturnPct.toFixed(2)}%`);
  
  // Exit reason breakdown
  const targetHits = allTrades.filter(t => t.exitReason === 'target').length;
  const stopHits = allTrades.filter(t => t.exitReason === 'stop').length;
  const timeouts = allTrades.filter(t => t.exitReason === 'timeout').length;
  
  console.log(`\nExit Reasons:`);
  console.log(`  Target Hit: ${targetHits} (${((targetHits/overall.totalTrades)*100).toFixed(1)}%)`);
  console.log(`  Stop Hit: ${stopHits} (${((stopHits/overall.totalTrades)*100).toFixed(1)}%)`);
  console.log(`  Timeout: ${timeouts} (${((timeouts/overall.totalTrades)*100).toFixed(1)}%)`);
  
  // Pattern analysis
  console.log(`\nPattern Performance:`);
  const patternMap = new Map<string, { wins: number; total: number; pnl: number }>();
  
  for (const trade of allTrades) {
    for (const pattern of trade.patterns) {
      const existing = patternMap.get(pattern) || { wins: 0, total: 0, pnl: 0 };
      existing.total++;
      existing.pnl += trade.pnlPct;
      if (trade.pnlPct > 0) existing.wins++;
      patternMap.set(pattern, existing);
    }
  }
  
  for (const [pattern, stats] of patternMap.entries()) {
    console.log(`  ${pattern}: ${stats.total} trades, ${((stats.wins/stats.total)*100).toFixed(1)}% WR, ${stats.pnl.toFixed(2)}% total P&L`);
  }
  
  // Recent trades
  console.log(`\nRecent Trades:`);
  const recentTrades = allTrades.slice(-10);
  for (const trade of recentTrades) {
    const emoji = trade.pnlPct > 0 ? '✅' : '❌';
    console.log(`  ${emoji} ${trade.symbol} ${trade.entryDate}: ${trade.pnlPct > 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}% (${trade.exitReason}) [${trade.patterns.join(', ')}]`);
  }
}

main().catch(console.error);
