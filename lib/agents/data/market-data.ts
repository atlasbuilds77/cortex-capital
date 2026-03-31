/**
 * MARKET DATA SERVICE FOR AGENTS
 * 
 * Provides real-time market data so agents don't hallucinate prices.
 * Uses Polygon.io (FREE tier) for quotes.
 * 
 * Updated 2026-03-31: Switched from Alpaca to Polygon
 */

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'h7J74V1cd8_4NQpTxwQpudpqXWaIHMhv';
const POLYGON_BASE = 'https://api.polygon.io';

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
 * Get quote for a single symbol using Polygon
 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const cached = quoteCache.get(symbol);
  if (cached && cached.expires > Date.now()) {
    return cached.quote;
  }

  try {
    // Use Polygon's previous day endpoint (works on free tier)
    const response = await fetch(
      `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.[0]) {
      console.error(`[MarketData] No data for ${symbol}:`, data);
      return null;
    }

    const bar = data.results[0];
    const quote: Quote = {
      symbol,
      price: bar.c || 0,  // close
      change: (bar.c || 0) - (bar.o || 0),
      changePercent: bar.o ? ((bar.c - bar.o) / bar.o) * 100 : 0,
      high: bar.h || 0,
      low: bar.l || 0,
      volume: bar.v || 0,
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

  // Polygon doesn't have bulk quotes on free tier, fetch individually
  // But do it in parallel
  const quotes = await Promise.all(
    uncached.map(symbol => getQuote(symbol))
  );

  quotes.forEach((quote, i) => {
    if (quote) {
      results.set(uncached[i], quote);
    }
  });

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

  // Determine market status (ET timezone)
  const now = new Date();
  const etOffset = -4; // EDT (adjust for EST: -5)
  const etHour = (now.getUTCHours() + etOffset + 24) % 24;
  const day = now.getUTCDay();
  
  let marketStatus: 'pre' | 'open' | 'after' | 'closed' = 'closed';
  if (day >= 1 && day <= 5) {
    if (etHour >= 4 && etHour < 9.5) {
      marketStatus = 'pre';
    } else if (etHour >= 9.5 && etHour < 16) {
      marketStatus = 'open';
    } else if (etHour >= 16 && etHour < 20) {
      marketStatus = 'after';
    }
  }

  return {
    spy: spy || { symbol: 'SPY', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    qqq: qqq || { symbol: 'QQQ', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    iwm: iwm || { symbol: 'IWM', price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, timestamp: '' },
    vix: 0, // TODO: Add VIX via Polygon
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
