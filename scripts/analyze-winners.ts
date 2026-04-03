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

function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes = [];
  for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i-1]);
  const gains = changes.slice(-period).filter(c => c > 0);
  const losses = changes.slice(-period).filter(c => c < 0).map(l => Math.abs(l));
  const avgGain = gains.length > 0 ? gains.reduce((a,b) => a+b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a,b) => a+b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

// ULTRA STRICT: Only the highest probability setups
function analyzeDay(bars: Bar[]): any {
  if (bars.length < 60) return null;
  
  const closes = bars.map(b => b.close);
  const current = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const prev2 = bars[bars.length - 3];
  
  const rsiVal = rsi(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const avgVol = bars.slice(-20, -1).reduce((a,b) => a + b.volume, 0) / 19;
  const volRatio = current.volume / avgVol;
  
  // SETUP 1: Extreme RSI reversal with volume confirmation
  // RSI < 20 (extremely oversold) + green candle + volume spike
  if (rsiVal && rsiVal < 20 && current.close > current.open && volRatio > 2.0) {
    return {
      pattern: 'EXTREME_RSI_REVERSAL',
      confidence: 85,
      entry: current.close,
      stop: current.low * 0.98,
      target: current.close * 1.04,
      reason: `RSI ${rsiVal.toFixed(1)}, Vol ${volRatio.toFixed(1)}x`
    };
  }
  
  // SETUP 2: 3-bar reversal pattern (hammer after downtrend)
  // 3+ red days, then hammer with long lower wick
  const threeRedDays = prev2.close < prev2.open && prev.close < prev.open;
  const hammerWick = (current.close - current.low) / (current.high - current.low) > 0.6;
  const hammerBody = current.close > current.open;
  
  if (threeRedDays && hammerWick && hammerBody && rsiVal && rsiVal < 35) {
    return {
      pattern: 'THREE_BAR_REVERSAL',
      confidence: 80,
      entry: current.close,
      stop: current.low * 0.99,
      target: current.close * 1.05,
      reason: `Hammer after 3 red days, RSI ${rsiVal.toFixed(1)}`
    };
  }
  
  // SETUP 3: Tight consolidation breakout (Bollinger squeeze)
  // Price range last 5 days < 3% AND breakout with volume
  const last5 = bars.slice(-6, -1);
  const range5 = (Math.max(...last5.map(b => b.high)) - Math.min(...last5.map(b => b.low))) / last5[0].close;
  const breakoutUp = current.close > Math.max(...last5.map(b => b.high));
  
  if (range5 < 0.03 && breakoutUp && volRatio > 1.5 && ma20 && ma50 && ma20 > ma50) {
    return {
      pattern: 'SQUEEZE_BREAKOUT',
      confidence: 75,
      entry: current.close,
      stop: Math.min(...last5.map(b => b.low)) * 0.99,
      target: current.close * 1.06,
      reason: `5-day range ${(range5*100).toFixed(1)}%, Vol ${volRatio.toFixed(1)}x`
    };
  }
  
  return null;
}

async function backtest() {
  console.log('ULTRA-STRICT BACKTEST\n' + '='.repeat(50));
  
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
        // Simulate trade
        const entryBar = bars[i + 1];
        const entry = entryBar.open;
        const stop = signal.stop * (entry / signal.entry);
        const target = signal.target * (entry / signal.entry);
        
        let exitPrice = 0, exitReason = 'timeout';
        for (let j = i + 1; j < Math.min(i + 11, bars.length); j++) {
          if (bars[j].low <= stop) { exitPrice = stop; exitReason = 'stop'; break; }
          if (bars[j].high >= target) { exitPrice = target; exitReason = 'target'; break; }
          if (j === Math.min(i + 10, bars.length - 1)) { exitPrice = bars[j].close; }
        }
        
        const pnl = ((exitPrice - entry) / entry) * 100;
        trades.push({ symbol, pattern: signal.pattern, date: bars[i].date, pnl, exitReason });
        i += 10;
      }
      i++;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((a,b) => a + b.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a,b) => a + b.pnl, 0) / losses.length : 0;
  const totalPnl = trades.reduce((a,b) => a + b.pnl, 0);
  const profitFactor = Math.abs(avgLoss) > 0 ? (avgWin * wins.length) / Math.abs(avgLoss * losses.length) : 0;
  
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
  
  console.log('\nRecent trades:');
  trades.slice(-10).forEach(t => {
    const emoji = t.pnl > 0 ? '✅' : '❌';
    console.log(`  ${emoji} ${t.symbol} ${t.date}: ${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}% (${t.exitReason}) [${t.pattern}]`);
  });
}

backtest().catch(console.error);
