import fetch from 'node-fetch';

const POLYGON_API_KEY = 'h7J74V1cd8_4NQpTxwQpudpqXWaIHMhv';

interface Bar { date: string; open: number; high: number; low: number; close: number; volume: number; }

async function fetchData(symbol: string, start: string, end: string): Promise<Bar[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${start}/${end}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (!data.results) return [];
  return data.results.map((b: any) => ({ date: new Date(b.t).toISOString().split('T')[0], open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));
}

function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((a,b) => a+b, 0) / period;
}

function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let e = prices.slice(0, period).reduce((a,b) => a+b, 0) / period;
  for (let i = period; i < prices.length; i++) e = prices[i] * k + e * (1 - k);
  return e;
}

function analyzeDay(bars: Bar[]): any {
  if (bars.length < 60) return null;
  
  const closes = bars.map(b => b.close);
  const current = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  
  const ema9 = ema(closes, 9)!;
  const ema21 = ema(closes, 21)!;
  const sma50 = sma(closes, 50)!;
  
  if (!ema9 || !ema21 || !sma50) return null;
  
  const avgVol = bars.slice(-20, -1).reduce((a,b) => a + b.volume, 0) / 19;
  const volRatio = current.volume / avgVol;
  const trendStrength = ((current.close / ema21) - 1) * 100;
  
  // SHORT: Strong downtrend + rally to EMA9 + rejection
  // TIGHTER FILTERS FOR HIGHER WIN RATE
  const strongDowntrend = ema9 < ema21 && ema21 < sma50 && current.close < sma50;
  const rallyToEma = prev.high >= ema9 * 0.98 && prev.high <= ema9 * 1.03; // Rally reached EMA
  const rejectConfirm = current.close < prev.low && current.close < ema9; // Closed below prev low AND below EMA
  const trendConfirm = trendStrength < -3; // Stronger downtrend required
  const volConfirm = volRatio > 1.2; // Higher volume required
  
  if (strongDowntrend && rallyToEma && rejectConfirm && trendConfirm && volConfirm) {
    return {
      pattern: 'EMA_REJECT_SHORT',
      entry: current.close,
      stop: Math.max(prev.high, ema9) * 1.01,
      target: current.close * 0.96,
      reason: `Trend ${trendStrength.toFixed(1)}%, Vol ${volRatio.toFixed(1)}x`
    };
  }
  
  return null;
}

async function backtest() {
  console.log('SHORT-ONLY BACKTEST (TIGHTER FILTERS)\n' + '='.repeat(50));
  
  const symbols = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'META', 'TSLA', 'AMZN', 'NFLX', 'CRM', 'COST', 'HD'];
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const trades: any[] = [];
  
  for (const symbol of symbols) {
    process.stdout.write(`${symbol}...`);
    const bars = await fetchData(symbol, start, end);
    if (bars.length < 60) { console.log(' skip'); continue; }
    
    let i = 60;
    while (i < bars.length - 5) {
      const signal = analyzeDay(bars.slice(0, i + 1));
      if (signal) {
        const entryBar = bars[i + 1];
        const entry = entryBar.open;
        const stop = signal.stop * (entry / signal.entry);
        const target = signal.target * (entry / signal.entry);
        
        let exitPrice = 0, exitReason = 'timeout';
        for (let j = i + 1; j < Math.min(i + 8, bars.length); j++) {
          if (bars[j].high >= stop) { exitPrice = stop; exitReason = 'stop'; break; }
          if (bars[j].low <= target) { exitPrice = target; exitReason = 'target'; break; }
          if (j === Math.min(i + 7, bars.length - 1)) { exitPrice = bars[j].close; }
        }
        
        const pnl = ((entry - exitPrice) / entry) * 100;
        trades.push({ symbol, date: bars[i].date, pnl, exitReason, reason: signal.reason });
        i += 7;
      }
      i++;
    }
    console.log(` ${trades.filter(t => t.symbol === symbol).length} trades`);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (trades.length === 0) { console.log('No trades'); return; }
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((a,b) => a + b.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a,b) => a + b.pnl, 0) / losses.length : 0;
  const profitFactor = Math.abs(avgLoss * losses.length) > 0 ? (avgWin * wins.length) / Math.abs(avgLoss * losses.length) : Infinity;
  
  console.log(`Trades: ${trades.length} | Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`Avg Win: +${avgWin.toFixed(2)}% | Avg Loss: ${avgLoss.toFixed(2)}%`);
  console.log(`Profit Factor: ${profitFactor.toFixed(2)} | Total: ${trades.reduce((a,b)=>a+b.pnl,0).toFixed(2)}%`);
  
  console.log('\nTrades:');
  trades.forEach(t => {
    console.log(`  ${t.pnl > 0 ? '✅' : '❌'} ${t.symbol} ${t.date}: ${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}% (${t.exitReason}) - ${t.reason}`);
  });
}

backtest().catch(console.error);
