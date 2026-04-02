/**
 * RESEARCH ENGINE FOR AGENTS
 * 
 * Provides financial research capabilities:
 * 1. Broker data (free) - positions, prices, P&L
 * 2. Brave Search - news, catalysts, sentiment
 * 3. Alpaca market data - bars, fundamentals
 * 
 * Agents call this to get real research, not hallucinate.
 */

import { getQuote } from '../../polygon-data';

// Brave API key from environment
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  date: string;
}

interface StockResearch {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume?: number;
  marketCap?: number;
  peRatio?: number;
  news: NewsItem[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  catalysts: string[];
}

interface SectorResearch {
  sector: string;
  performance: number;
  topMovers: { symbol: string; change: number }[];
  news: NewsItem[];
  outlook: string;
}

interface ResearchContextOptions {
  riskProfile?: string;
  exclusions?: string[];
  userTag?: string;
}

const EXCLUSION_TICKERS: Record<string, string[]> = {
  Tobacco: ['MO', 'PM', 'BTI', 'IMBBY'],
  Weapons: ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
  Gambling: ['MGM', 'WYNN', 'LVS', 'CZR', 'DKNG', 'PENN'],
  'Fossil fuels': ['XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL'],
  'Private prisons': ['GEO', 'CXW'],
};

function normalizeSymbolList(symbols: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of symbols) {
    const symbol = String(raw || '').trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }

  return out;
}

function symbolsBlockedByExclusions(exclusions: string[] = []): Set<string> {
  const blocked = new Set<string>();
  for (const exclusion of exclusions) {
    for (const ticker of EXCLUSION_TICKERS[exclusion] || []) {
      blocked.add(ticker.toUpperCase());
    }
  }
  return blocked;
}

function riskWatchlistLimit(riskProfile?: string): number {
  switch ((riskProfile || '').toLowerCase()) {
    case 'conservative':
      return 3;
    case 'aggressive':
      return 7;
    case 'ultra_aggressive':
      return 9;
    default:
      return 5;
  }
}

/**
 * Search Brave for financial news
 */
async function searchBrave(query: string, count: number = 5): Promise<NewsItem[]> {
  if (!BRAVE_API_KEY) {
    console.warn('[Research] No BRAVE_API_KEY set');
    return [];
  }

  try {
    const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      console.error('[Research] Brave API error:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      description: r.description,
      url: r.url,
      source: r.meta_url?.hostname || 'Unknown',
      date: r.age || 'Recent',
    }));
  } catch (error) {
    console.error('[Research] Brave search failed:', error);
    return [];
  }
}

/**
 * Research a specific stock
 */
export async function researchStock(symbol: string): Promise<StockResearch> {
  const [quote, news] = await Promise.all([
    getQuote(symbol),
    searchBrave(`${symbol} stock news today`, 5),
  ]);

  // Analyze sentiment from news titles
  let bullishCount = 0;
  let bearishCount = 0;
  const bullishWords = ['surge', 'soar', 'jump', 'rally', 'gain', 'buy', 'upgrade', 'beat', 'record', 'high'];
  const bearishWords = ['drop', 'fall', 'sink', 'crash', 'sell', 'downgrade', 'miss', 'low', 'fear', 'warning'];

  news.forEach(n => {
    const text = (n.title + ' ' + n.description).toLowerCase();
    bullishWords.forEach(w => { if (text.includes(w)) bullishCount++; });
    bearishWords.forEach(w => { if (text.includes(w)) bearishCount++; });
  });

  const sentiment = bullishCount > bearishCount + 2 ? 'bullish' 
    : bearishCount > bullishCount + 2 ? 'bearish' 
    : 'neutral';

  // Extract catalysts (earnings, FDA, etc.)
  const catalysts: string[] = [];
  const catalystPatterns = [
    /earnings/i, /FDA/i, /approval/i, /merger/i, /acquisition/i,
    /guidance/i, /forecast/i, /dividend/i, /split/i, /buyback/i,
  ];
  news.forEach(n => {
    catalystPatterns.forEach(pattern => {
      if (pattern.test(n.title)) {
        catalysts.push(n.title);
      }
    });
  });

  return {
    symbol,
    price: quote?.price || 0,
    change: quote?.change || 0,
    changePercent: quote?.changePercent || 0,
    volume: quote?.volume || 0,
    news,
    sentiment,
    catalysts: [...new Set(catalysts)].slice(0, 3),
  };
}

/**
 * Research a sector
 */
export async function researchSector(sector: string): Promise<SectorResearch> {
  const sectorETFs: Record<string, { etf: string; stocks: string[] }> = {
    'Technology': { etf: 'XLK', stocks: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'] },
    'Healthcare': { etf: 'XLV', stocks: ['UNH', 'JNJ', 'PFE', 'ABBV', 'MRK'] },
    'Financials': { etf: 'XLF', stocks: ['JPM', 'BAC', 'WFC', 'GS', 'MS'] },
    'Energy': { etf: 'XLE', stocks: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'] },
    'Consumer': { etf: 'XLY', stocks: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'] },
    'Real Estate': { etf: 'XLRE', stocks: ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG'] },
  };

  const sectorInfo = sectorETFs[sector] || sectorETFs['Technology'];
  
  const [etfQuote, news] = await Promise.all([
    getQuote(sectorInfo.etf),
    searchBrave(`${sector} sector stocks market news today`, 5),
  ]);

  // Get top movers in sector
  const topMovers: { symbol: string; change: number }[] = [];
  try {
    const quotes = await Promise.all(sectorInfo.stocks.map(s => getQuote(s)));
    sectorInfo.stocks.forEach((sym, i) => {
      const q = quotes[i];
      if (q) {
        topMovers.push({ symbol: sym, change: q.changePercent });
      }
    });
    topMovers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  } catch (err) {
    console.error('[Research] Failed to get sector stocks:', err);
  }

  const performance = etfQuote?.changePercent || 0;

  // Generate outlook based on performance and news
  let outlook = 'Mixed signals in the sector.';
  if (performance > 1) {
    outlook = `${sector} showing strength today, up ${performance.toFixed(1)}%. `;
  } else if (performance < -1) {
    outlook = `${sector} under pressure today, down ${Math.abs(performance).toFixed(1)}%. `;
  }
  
  if (topMovers.length > 0) {
    const leader = topMovers[0];
    outlook += `${leader.symbol} leading with ${leader.change > 0 ? '+' : ''}${leader.change.toFixed(1)}%.`;
  }

  return {
    sector,
    performance,
    topMovers: topMovers.slice(0, 5),
    news,
    outlook,
  };
}

/**
 * Get market-wide research summary
 */
export async function getMarketResearch(): Promise<{
  indices: { symbol: string; price: number; change: number }[];
  topNews: NewsItem[];
  marketSentiment: 'risk-on' | 'risk-off' | 'neutral';
  keyLevels: { spy: { support: number; resistance: number } };
}> {
  const [spyQuote, qqqQuote, iwmQuote, news] = await Promise.all([
    getQuote('SPY'),
    getQuote('QQQ'),
    getQuote('IWM'),
    searchBrave('stock market news today', 5),
  ]);

  const indices = [
    { symbol: 'SPY', price: spyQuote?.price || 0, change: spyQuote?.changePercent || 0 },
    { symbol: 'QQQ', price: qqqQuote?.price || 0, change: qqqQuote?.changePercent || 0 },
    { symbol: 'IWM', price: iwmQuote?.price || 0, change: iwmQuote?.changePercent || 0 },
  ];

  // Determine market sentiment
  const avgChange = indices.reduce((sum, i) => sum + i.change, 0) / indices.length;
  const marketSentiment = avgChange > 0.5 ? 'risk-on' : avgChange < -0.5 ? 'risk-off' : 'neutral';

  // Calculate key levels (simple support/resistance)
  const spyPrice = spyQuote?.price || 500;
  const keyLevels = {
    spy: {
      support: Math.floor(spyPrice / 5) * 5 - 5,  // Round down to nearest 5
      resistance: Math.ceil(spyPrice / 5) * 5 + 5, // Round up to nearest 5
    },
  };

  return {
    indices,
    topNews: news,
    marketSentiment,
    keyLevels,
  };
}

/**
 * Generate full research context for agents
 */
export async function getFullResearchContext(
  userSectors: string[],
  userPositions: string[],
  allowedSymbols: string[] = [],
  options: ResearchContextOptions = {}
): Promise<string> {
  const sections: string[] = [];
  const normalizedSectors = (userSectors || []).map((s) => String(s || '').trim()).filter(Boolean);
  const excludedSet = symbolsBlockedByExclusions(options.exclusions || []);
  const filteredAllowedSymbols = normalizeSymbolList(allowedSymbols).filter((s) => !excludedSet.has(s));
  const filteredPositionSymbols = normalizeSymbolList(userPositions).filter((s) => !excludedSet.has(s));

  sections.push(`CLIENT PROFILE:
Risk: ${(options.riskProfile || 'moderate').toUpperCase()}
Sectors: ${normalizedSectors.length > 0 ? normalizedSectors.join(', ') : 'Broad market'}
Allowed Symbols: ${filteredAllowedSymbols.length > 0 ? filteredAllowedSymbols.join(', ') : 'Not restricted'}
Exclusions: ${options.exclusions && options.exclusions.length > 0 ? options.exclusions.join(', ') : 'None'}
Positions Considered: ${filteredPositionSymbols.length}
Profile Tag: ${options.userTag || 'default'}`);

  // Market overview
  try {
    const market = await getMarketResearch();
    sections.push(`MARKET OVERVIEW:
Sentiment: ${market.marketSentiment.toUpperCase()}
${market.indices.map(i => `${i.symbol}: $${i.price.toFixed(2)} (${i.change >= 0 ? '+' : ''}${i.change.toFixed(2)}%)`).join('\n')}
SPY Key Levels: Support $${market.keyLevels.spy.support} | Resistance $${market.keyLevels.spy.resistance}

Top Headlines:
${market.topNews.slice(0, 3).map(n => `- ${n.title}`).join('\n')}`);
  } catch (err) {
    console.error('[Research] Market research failed:', err);
  }

  // If user has allowed symbols, research those specifically
  if (filteredAllowedSymbols.length > 0) {
    const watchlist = filteredAllowedSymbols.slice(0, riskWatchlistLimit(options.riskProfile));
    sections.push(`\nFOCUSED WATCHLIST RESEARCH:`);
    for (const symbol of watchlist) {
      try {
        const stockRes = await researchStock(symbol);
        sections.push(`\n${symbol}:
Price: $${stockRes.price.toFixed(2)} (${stockRes.changePercent >= 0 ? '+' : ''}${stockRes.changePercent.toFixed(2)}%)
Sentiment: ${stockRes.sentiment}
${stockRes.catalysts.length > 0 ? `Catalysts: ${stockRes.catalysts.join('; ')}` : 'No major catalysts'}
${stockRes.news.slice(0, 1).map(n => `News: ${n.title}`).join('\n')}`);
      } catch (err) {
        console.error(`[Research] Allowed symbol ${symbol} failed:`, err);
      }
    }
  }

  // Always include at least some sector framing so users with identical
  // watchlists still receive preference-specific research context.
  const sectorsToCover = normalizedSectors.length > 0 ? normalizedSectors.slice(0, 2) : ['Technology', 'Healthcare'];
  for (const sector of sectorsToCover) {
    try {
      const sectorRes = await researchSector(sector);
      sections.push(`\n${sector.toUpperCase()} SECTOR:
Performance: ${sectorRes.performance >= 0 ? '+' : ''}${sectorRes.performance.toFixed(2)}%
Top Movers: ${sectorRes.topMovers.slice(0, 3).map(m => `${m.symbol} ${m.change >= 0 ? '+' : ''}${m.change.toFixed(1)}%`).join(', ')}
Outlook: ${sectorRes.outlook}`);
    } catch (err) {
      console.error(`[Research] Sector ${sector} failed:`, err);
    }
  }

  // Research user's positions
  for (const symbol of filteredPositionSymbols.slice(0, 3)) {
    try {
      const stockRes = await researchStock(symbol);
      if (stockRes.news.length > 0 || stockRes.catalysts.length > 0) {
        sections.push(`\n${symbol} NEWS:
Sentiment: ${stockRes.sentiment}
${stockRes.catalysts.length > 0 ? `Catalysts: ${stockRes.catalysts.join('; ')}` : ''}
${stockRes.news.slice(0, 2).map(n => `- ${n.title}`).join('\n')}`);
      }
    } catch (err) {
      console.error(`[Research] Stock ${symbol} failed:`, err);
    }
  }

  return sections.join('\n\n');
}

export { searchBrave };
export type { NewsItem, StockResearch, SectorResearch, ResearchContextOptions };
