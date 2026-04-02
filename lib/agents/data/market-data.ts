/**
 * MARKET DATA SERVICE FOR AGENTS
 * 
 * Provides real-time market data so agents don't hallucinate prices.
 * Uses Polygon.io (FREE tier) for quotes.
 * 
 * Updated 2026-03-31: Switched from Alpaca to Polygon
 */

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';
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
const CACHE_TTL = 5000; // 5 seconds - fresh data for trading decisions

/**
 * Get LIVE quote for a single symbol using Polygon
 * Uses snapshot API for real-time data (free tier)
 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const cached = quoteCache.get(symbol);
  if (cached && cached.expires > Date.now()) {
    return cached.quote;
  }

  try {
    // Try live snapshot first (real-time data)
    const snapshotResponse = await fetch(
      `${POLYGON_BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`
    );
    const snapshotData = await snapshotResponse.json();

    if (snapshotData.status === 'OK' && snapshotData.ticker) {
      const ticker = snapshotData.ticker;
      const quote: Quote = {
        symbol,
        price: ticker.lastTrade?.p || ticker.day?.c || 0,
        change: ticker.todaysChange || 0,
        changePercent: ticker.todaysChangePerc || 0,
        high: ticker.day?.h || 0,
        low: ticker.day?.l || 0,
        volume: ticker.day?.v || 0,
        timestamp: new Date().toISOString(),
      };

      quoteCache.set(symbol, { quote, expires: Date.now() + CACHE_TTL });
      return quote;
    }

    // Fallback to last trade endpoint
    const lastTradeResponse = await fetch(
      `${POLYGON_BASE}/v2/last/trade/${symbol}?apiKey=${POLYGON_API_KEY}`
    );
    const lastTradeData = await lastTradeResponse.json();

    if (lastTradeData.status === 'OK' && lastTradeData.results) {
      const trade = lastTradeData.results;
      const quote: Quote = {
        symbol,
        price: trade.p || 0,
        change: 0, // Can't calculate without prev close
        changePercent: 0,
        high: trade.p || 0,
        low: trade.p || 0,
        volume: 0,
        timestamp: new Date(trade.t).toISOString(),
      };

      quoteCache.set(symbol, { quote, expires: Date.now() + CACHE_TTL });
      return quote;
    }

    console.error(`[MarketData] No live data for ${symbol}`);
    return null;
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
 * Force fresh live quotes (bypass cache) - use when user clicks buttons
 */
export async function getLiveQuotesFresh(symbols: string[]): Promise<Map<string, Quote>> {
  // Clear cache for these symbols
  symbols.forEach(symbol => quoteCache.delete(symbol));
  // Fetch fresh
  return getQuotes(symbols);
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

/**
 * Get LIVE options quote from Polygon
 * @param underlying - Underlying symbol (e.g., 'AAPL')
 * @param strike - Strike price (e.g., 150)
 * @param expiration - Expiration date (YYYY-MM-DD)
 * @param optionType - 'call' or 'put'
 */
export async function getOptionQuote(
  underlying: string,
  strike: number,
  expiration: string,
  optionType: 'call' | 'put'
): Promise<{
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
} | null> {
  // Build OCC option symbol: AAPL230915C00150000
  const dateCode = expiration.replace(/-/g, '').slice(2); // 2023-09-15 -> 230915
  const strikeCode = Math.round(strike * 1000).toString().padStart(8, '0');
  const optionSymbol = `${underlying}${dateCode}${optionType === 'call' ? 'C' : 'P'}${strikeCode}`;

  try {
    // Try to get snapshot for this option contract
    const response = await fetch(
      `${POLYGON_BASE}/v3/snapshot/options/${underlying}/${optionSymbol}?apiKey=${POLYGON_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      const opt = data.results;
      return {
        symbol: optionSymbol,
        price: opt.last_quote?.p || opt.day?.c || 0,
        bid: opt.last_quote?.p_bid || 0,
        ask: opt.last_quote?.p_ask || 0,
        volume: opt.day?.v || 0,
        openInterest: opt.open_interest || 0,
        impliedVolatility: opt.implied_volatility || 0,
        delta: opt.greeks?.delta || 0,
        gamma: opt.greeks?.gamma || 0,
        theta: opt.greeks?.theta || 0,
        vega: opt.greeks?.vega || 0,
      };
    }

    console.error(`[MarketData] No options data for ${optionSymbol}`);
    return null;
  } catch (error) {
    console.error(`[MarketData] Failed to get option quote for ${optionSymbol}:`, error);
    return null;
  }
}

/**
 * Get all options chain for an underlying
 */
export async function getOptionsChain(
  underlying: string,
  expiration?: string
): Promise<Array<{
  symbol: string;
  strike: number;
  optionType: 'call' | 'put';
  price: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}> | null> {
  try {
    const url = expiration
      ? `${POLYGON_BASE}/v3/snapshot/options/${underlying}?expiration_date=${expiration}&apiKey=${POLYGON_API_KEY}`
      : `${POLYGON_BASE}/v3/snapshot/options/${underlying}?apiKey=${POLYGON_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      return data.results.map((opt: any) => ({
        symbol: opt.details?.ticker || '',
        strike: opt.details?.strike_price || 0,
        optionType: opt.details?.contract_type || 'call',
        price: opt.last_quote?.p || opt.day?.c || 0,
        bid: opt.last_quote?.p_bid || 0,
        ask: opt.last_quote?.p_ask || 0,
        volume: opt.day?.v || 0,
        openInterest: opt.open_interest || 0,
        impliedVolatility: opt.implied_volatility || 0,
        delta: opt.greeks?.delta || 0,
        gamma: opt.greeks?.gamma || 0,
        theta: opt.greeks?.theta || 0,
        vega: opt.greeks?.vega || 0,
      }));
    }

    return null;
  } catch (error) {
    console.error(`[MarketData] Failed to get options chain for ${underlying}:`, error);
    return null;
  }
}

export { Quote, MarketSnapshot };
