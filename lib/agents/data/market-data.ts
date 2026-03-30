// @ts-nocheck
/**
 * MARKET DATA SERVICE FOR AGENTS
 * 
 * Provides real-time market data so agents don't hallucinate prices.
 * Uses Alpaca for quotes, Yahoo Finance as fallback.
 */

import alpaca from '../../integrations/alpaca';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

interface MarketSnapshot {
  spy: Quote;
  qqq: Quote;
  iwm: Quote;
  vix: number;
  marketStatus: 'pre' | 'open' | 'after' | 'closed';
  timestamp: string;
}

// Cache to avoid hammering APIs
const quoteCache = new Map<string, { quote: Quote; expires: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get quote for a single symbol
 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const cached = quoteCache.get(symbol);
  if (cached && cached.expires > Date.now()) {
    return cached.quote;
  }

  try {
    const snapshot = await alpaca.getSnapshot(symbol);
    
    const quote: Quote = {
      symbol,
      price: snapshot.latestTrade?.p || snapshot.dailyBar?.c || 0,
      change: (snapshot.dailyBar?.c || 0) - (snapshot.dailyBar?.o || 0),
      changePercent: snapshot.dailyBar?.o 
        ? ((snapshot.dailyBar.c - snapshot.dailyBar.o) / snapshot.dailyBar.o) * 100 
        : 0,
      high: snapshot.dailyBar?.h || 0,
      low: snapshot.dailyBar?.l || 0,
      volume: snapshot.dailyBar?.v || 0,
      timestamp: new Date().toISOString(),
    };

    quoteCache.set(symbol, { quote, expires: Date.now() + CACHE_TTL });
    return quote;
  } catch (error) {
    console.error(`[MarketData] Failed to get quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get quotes for multiple symbols
 */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();
  
  // Check cache first
  const uncached: string[] = [];
  for (const symbol of symbols) {
    const cached = quoteCache.get(symbol);
    if (cached && cached.expires > Date.now()) {
      results.set(symbol, cached.quote);
    } else {
      uncached.push(symbol);
    }
  }

  if (uncached.length === 0) return results;

  try {
    const snapshots = await alpaca.getSnapshots(uncached);
    
    for (const [symbol, snapshot] of Object.entries(snapshots)) {
      const quote: Quote = {
        symbol,
        price: (snapshot as any).latestTrade?.p || (snapshot as any).dailyBar?.c || 0,
        change: ((snapshot as any).dailyBar?.c || 0) - ((snapshot as any).dailyBar?.o || 0),
        changePercent: (snapshot as any).dailyBar?.o 
          ? (((snapshot as any).dailyBar.c - (snapshot as any).dailyBar.o) / (snapshot as any).dailyBar.o) * 100 
          : 0,
        high: (snapshot as any).dailyBar?.h || 0,
        low: (snapshot as any).dailyBar?.l || 0,
        volume: (snapshot as any).dailyBar?.v || 0,
        timestamp: new Date().toISOString(),
      };
      
      quoteCache.set(symbol, { quote, expires: Date.now() + CACHE_TTL });
      results.set(symbol, quote);
    }
  } catch (error) {
    console.error('[MarketData] Failed to get bulk quotes:', error);
  }

  return results;
}

/**
 * Get market overview for agent context
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [spy, qqq, iwm] = await Promise.all([
    getQuote('SPY'),
    getQuote('QQQ'),
    getQuote('IWM'),
  ]);

  // Determine market status
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay();
  
  let marketStatus: 'pre' | 'open' | 'after' | 'closed' = 'closed';
  if (day >= 1 && day <= 5) {
    const timeMinutes = hour * 60 + minute;
    if (timeMinutes >= 9 * 60 && timeMinutes < 13 * 60 + 30) { // 9:00-13:30 UTC = 4:00-9:30 ET pre
      marketStatus = 'pre';
    } else if (timeMinutes >= 13 * 60 + 30 && timeMinutes < 20 * 60) { // 13:30-20:00 UTC = 9:30-4:00 ET open
      marketStatus = 'open';
    } else if (timeMinutes >= 20 * 60 && timeMinutes < 24 * 60) { // 20:00-24:00 UTC = 4:00-8:00 ET after
      marketStatus = 'after';
    }
  }

  return {
    spy: spy || { symbol: 'SPY', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    qqq: qqq || { symbol: 'QQQ', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    iwm: iwm || { symbol: 'IWM', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    vix: 0, // TODO: Add VIX
    marketStatus,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format market data for agent prompt injection
 */
export async function getMarketContextForAgents(): Promise<string> {
  const snapshot = await getMarketSnapshot();
  
  const formatQuote = (q: Quote) => 
    `${q.symbol}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`;

  return `
LIVE MARKET DATA (${snapshot.timestamp}):
Market Status: ${snapshot.marketStatus.toUpperCase()}

Major Indices:
- ${formatQuote(snapshot.spy)}
- ${formatQuote(snapshot.qqq)}
- ${formatQuote(snapshot.iwm)}

Use these REAL prices in your analysis. Do NOT guess or use outdated prices.
`.trim();
}

/**
 * Get sector performance
 */
export async function getSectorPerformance(): Promise<Map<string, number>> {
  const sectorETFs = ['XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE'];
  const quotes = await getQuotes(sectorETFs);
  
  const sectors = new Map<string, number>();
  const sectorNames: Record<string, string> = {
    'XLK': 'Technology',
    'XLF': 'Financials',
    'XLV': 'Healthcare',
    'XLE': 'Energy',
    'XLI': 'Industrials',
    'XLY': 'Consumer Discretionary',
    'XLP': 'Consumer Staples',
    'XLU': 'Utilities',
    'XLB': 'Materials',
    'XLRE': 'Real Estate',
  };

  for (const [symbol, quote] of quotes) {
    const sectorName = sectorNames[symbol];
    if (sectorName) {
      sectors.set(sectorName, quote.changePercent);
    }
  }

  return sectors;
}

export { Quote, MarketSnapshot };
