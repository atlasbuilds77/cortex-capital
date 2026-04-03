import fetch from 'node-fetch';

const POLYGON_API_KEY = 'h7J74V1cd8_4NQpTxwQpudpqXWaIHMhv';

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchData(symbol: string, start: string, end: string): Promise<Bar[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${start}/${end}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (!data.results) return [];
  return data.results.map((b: any) => ({
    date: new Date(b.t).toISOString().split('T')[0],
    open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
  }));
}

function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((a,b) => a+b, 0) / period;
}

function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a,b) => a+b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// MERIDIAN-STYLE: Strong trend + pullback + confirmation
function analyzeDay(bars: Bar[]): any {
  if (bars.length < 60) return null;
  
  const closes = bars.map(b => b.close);
  const current = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const sma50 = sma(closes, 50);
  
  if (!ema9 || !ema21 || !sma50) return null;
  
  const avgVol = bars.slice(-20, -1).reduce((a,b) => a + b.volume, 0) / 19;
  const volRatio = current.volume / avgVol;
  
  // Calculate trend strength (how far above EMAs)
  const trendStrength = ((current.close / ema21) - 1) * 100;
  
  // LONG SETUP: Strong uptrend + pullback to EMA9 + bounce
  const strongUptrend = ema9 > ema21 && ema21 > sma50 && current.close > sma50;
  const pullbackToEma = prev.low <= ema9 * 1.01 && prev.low >= ema9 * 0.98; // Within 1-2% of EMA9
  const bounceConfirm = current.close > prev.high && current.close > ema9;
  const volumeConfirm = volRatio > 1.0;
  
  // STRICT: All conditions must be met
  if (strongUptrend && pullbackToEma && bounceConfirm && volumeConfirm && trendStrength > 2) {
    return {
      pattern: 'EMA_BOUNCE_LONG',
      entry: current.close,
      stop: Math.min(prev.low, ema21) * 0.99,
      target: current.close * 1.04, // Conservative 4% target
      reason: `Trend +${trendStrength.toFixed(1)}%, Vol ${volRatio.toFixed(1)}x`
    };
  }
  
  // SHORT SETUP: Strong downtrend + rally to EMA9 + rejection
  const strongDowntrend = ema9 < ema21 && ema21 < sma50 && current.close < sma50;
  const rallyToEma = prev.high >= ema9 * 0.99 && prev.high <= ema9 * 1.02;
  const rejectConfirm = current.close < prev.low && current.close < ema9;
  
  if (strongDowntrend && rallyToEma && rejectConfirm && volumeConfirm && trendStrength < -2) {
    return {
      pattern: 'EMA_REJECT_SHORT',
      entry: current.close,
      stop: Math.max(prev.high, ema21) * 1.01,
      target: current.close * 0.96,
      reason: `Trend ${trendStrength.toFixed(1)}%, Vol ${volRatio.toFixed(1)}x`
    };
  }
  
  return null;
}

async function backtest() {
  console.log('TREND FOLLOWING BACKTEST (Meridian-style)\n' + '='.repeat(50));
  
  const symbols = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'META', 'TSLA', 'AMZN'];
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const trades: any[] = [];
  
  for (const symbol of symbols) {
    console.log(`Scanning ${symbol}...`);
    const bars = await fetchData(symbol, start, end);
    if (bars.length < 60) continue;
    
    let i = 60;
    while (i < bars.length - 5) {
      const signal = analyzeDay(bars.slice(0, i + 1));
      if (signal) {
        const entryBar = bars[i + 1];
        const entry = entryBar.open;
        const isLong = signal.pattern.includes('LONG');
        const stop = signal.stop * (entry / signal.entry);
        const target = signal.target * (entry / signal.entry);
        
        let exitPrice = 0, exitReason = 'timeout';
        for (let j = i + 1; j < Math.min(i + 8, bars.length); j++) { // Max 7 days hold
          if (isLong) {
            if (bars[j].low <= stop) { exitPrice = stop; exitReason = 'stop'; break; }
            if (bars[j].high >= target) { exitPrice = target; exitReason = 'target'; break; }
          } else {
            if (bars[j].high >= stop) { exitPrice = stop; exitReason = 'stop'; break; }
            if (bars[j].low <= target) { exitPrice = target; exitReason = 'target'; break; }
          }
          if (j === Math.min(i + 7, bars.length - 1)) { exitPrice = bars[j].close; }
        }
        
        const pnl = isLong ? ((exitPrice - entry) / entry) * 100 : ((entry - exitPrice) / entry) * 100;
        trades.push({ symbol, pattern: signal.pattern, date: bars[i].date, pnl, exitReason, reason: signal.reason });
        i += 7;
      }
      i++;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  
  if (trades.length === 0) {
    console.log('No trades found - criteria too strict');
    return;
  }
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((a,b) => a + b.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a,b) => a + b.pnl, 0) / losses.length : 0;
  const totalPnl = trades.reduce((a,b) => a + b.pnl, 0);
  const profitFactor = Math.abs(avgLoss * losses.length) > 0 ? (avgWin * wins.length) / Math.abs(avgLoss * losses.length) : Infinity;
  
  console.log(`\nTotal Trades: ${trades.length}`);
  console.log(`Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`Avg Win: +${avgWin.toFixed(2)}% | Avg Loss: ${avgLoss.toFixed(2)}%`);
  console.log(`Profit Factor: ${profitFactor.toFixed(2)}`);
  console.log(`Total Return: ${totalPnl.toFixed(2)}%`);
  
  console.log('\nBy Pattern:');
  const patterns = [...new Set(trades.map(t => t.pattern))];
  for (const p of patterns) {
    const pt = trades.filter(t => t.pattern === p);
    const pw = pt.filter(t => t.pnl > 0);
    console.log(`  ${p}: ${pt.length} trades, ${((pw.length/pt.length)*100).toFixed(1)}% WR, ${pt.reduce((a,b)=>a+b.pnl,0).toFixed(2)}% P&L`);
  }
  
  console.log('\nAll trades:');
  trades.forEach(t => {
    const emoji = t.pnl > 0 ? '✅' : '❌';
    console.log(`  ${emoji} ${t.symbol} ${t.date}: ${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}% (${t.exitReason}) [${t.pattern}] - ${t.reason}`);
  });
}

backtest().catch(console.error);
