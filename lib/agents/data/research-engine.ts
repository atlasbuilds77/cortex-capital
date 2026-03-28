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

import alpaca from '../../integrations/alpaca';

// Brave API key - get from environment or hardcoded fallback
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || 'BSAGCUFwmAYKm6tdjsO5FTnq_QR6ewc';

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
  const [snapshot, news] = await Promise.all([
    alpaca.getSnapshot(symbol).catch(() => null),
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
    price: snapshot?.latestTrade?.p || snapshot?.dailyBar?.c || 0,
    change: snapshot?.dailyBar ? (snapshot.dailyBar.c - snapshot.dailyBar.o) : 0,
    changePercent: snapshot?.dailyBar 
      ? ((snapshot.dailyBar.c - snapshot.dailyBar.o) / snapshot.dailyBar.o) * 100 
      : 0,
    volume: snapshot?.dailyBar?.v || 0,
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
  
  const [etfSnapshot, news] = await Promise.all([
    alpaca.getSnapshot(sectorInfo.etf).catch(() => null),
    searchBrave(`${sector} sector stocks market news today`, 5),
  ]);

  // Get top movers in sector
  const topMovers: { symbol: string; change: number }[] = [];
  try {
    const snapshots = await alpaca.getSnapshots(sectorInfo.stocks);
    for (const [sym, snap] of Object.entries(snapshots)) {
      const s = snap as any;
      if (s.dailyBar) {
        const change = ((s.dailyBar.c - s.dailyBar.o) / s.dailyBar.o) * 100;
        topMovers.push({ symbol: sym, change });
      }
    }
    topMovers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  } catch (err) {
    console.error('[Research] Failed to get sector stocks:', err);
  }

  const performance = etfSnapshot?.dailyBar 
    ? ((etfSnapshot.dailyBar.c - etfSnapshot.dailyBar.o) / etfSnapshot.dailyBar.o) * 100 
    : 0;

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
  const [spySnap, qqqSnap, iwmSnap, news] = await Promise.all([
    alpaca.getSnapshot('SPY').catch(() => null),
    alpaca.getSnapshot('QQQ').catch(() => null),
    alpaca.getSnapshot('IWM').catch(() => null),
    searchBrave('stock market news today', 5),
  ]);

  const indices = [
    { 
      symbol: 'SPY', 
      price: spySnap?.latestTrade?.p || 0, 
      change: spySnap?.dailyBar ? ((spySnap.dailyBar.c - spySnap.dailyBar.o) / spySnap.dailyBar.o) * 100 : 0 
    },
    { 
      symbol: 'QQQ', 
      price: qqqSnap?.latestTrade?.p || 0, 
      change: qqqSnap?.dailyBar ? ((qqqSnap.dailyBar.c - qqqSnap.dailyBar.o) / qqqSnap.dailyBar.o) * 100 : 0 
    },
    { 
      symbol: 'IWM', 
      price: iwmSnap?.latestTrade?.p || 0, 
      change: iwmSnap?.dailyBar ? ((iwmSnap.dailyBar.c - iwmSnap.dailyBar.o) / iwmSnap.dailyBar.o) * 100 : 0 
    },
  ];

  // Determine market sentiment
  const avgChange = indices.reduce((sum, i) => sum + i.change, 0) / indices.length;
  const marketSentiment = avgChange > 0.5 ? 'risk-on' : avgChange < -0.5 ? 'risk-off' : 'neutral';

  // Calculate key levels (simple support/resistance)
  const spyPrice = spySnap?.latestTrade?.p || 500;
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
  userPositions: string[]
): Promise<string> {
  const sections: string[] = [];

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

  // User's sector research
  for (const sector of userSectors.slice(0, 2)) {
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
  for (const symbol of userPositions.slice(0, 3)) {
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

export {
  searchBrave,
  NewsItem,
  StockResearch,
  SectorResearch,
};
