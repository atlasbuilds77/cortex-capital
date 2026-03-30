/**
 * News Research Module for Cortex Capital
 * Uses Brave Search API to fetch and analyze stock news
 */

export interface NewsArticle {
  title: string;
  url: string;
  description: string;
  published: string;
  source: string;
  category?: string;
}

export interface NewsResult {
  articles: NewsArticle[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  breakingNews: string[];
  lastUpdated: string;
}

// In-memory cache with 15-minute TTL
const cache = new Map<string, { data: NewsResult; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

// Keywords for sentiment analysis
const BULLISH_KEYWORDS = [
  'beats', 'beat', 'surpasses', 'exceeds', 'raises', 'upgrade', 'upgraded',
  'positive', 'strong', 'growth', 'profit', 'gain', 'win', 'approval',
  'FDA approval', 'breakthrough', 'partnership', 'acquisition', 'buyout',
  'dividend', 'buyback', 'record', 'all-time high', 'soars', 'jumps', 'surges'
];

const BEARISH_KEYWORDS = [
  'misses', 'miss', 'downgrade', 'downgraded', 'cuts', 'cut', 'negative',
  'weak', 'decline', 'loss', 'drop', 'fall', 'plunge', 'crash', 'lawsuit',
  'investigation', 'warning', 'recall', 'delays', 'delay', 'suspends',
  'bankruptcy', 'default', 'layoffs', 'fired', 'terminated', 'fraud'
];

const CATALYST_KEYWORDS = [
  'earnings', 'FDA', 'clinical trial', 'phase', 'approval', 'merger',
  'acquisition', 'lawsuit', 'settlement', 'investigation', 'subpoena',
  'subpoenaed', 'regulatory', 'hearing', 'trial', 'verdict', 'IPO',
  'spinoff', 'dividend announcement', 'stock split', 'buyback'
];

/**
 * Get Brave API key from environment
 */
function getBraveApiKey(): string {
  const key = process.env.BRAVE_API_KEY;
  if (!key) {
    throw new Error('BRAVE_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Search for stock news using Brave Search API
 */
export async function searchStockNews(symbol: string): Promise<NewsArticle[]> {
  const cacheKey = `news-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.articles;
  }

  try {
    const apiKey = getBraveApiKey();
    const query = `${symbol} stock news latest`;
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=20&freshness=week`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const articles: NewsArticle[] = [];
    if (data.news && data.news.results) {
      for (const result of data.news.results) {
        articles.push({
          title: result.title || '',
          url: result.url || '',
          description: result.description || '',
          published: result.published || '',
          source: result.source || '',
          category: result.category || ''
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    // Return empty array instead of throwing to be robust
    return [];
  }
}

/**
 * Analyze news sentiment for a stock
 */
export async function getNewsSentiment(symbol: string): Promise<'bullish' | 'bearish' | 'neutral'> {
  const cacheKey = `sentiment-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.sentiment;
  }

  try {
    const articles = await searchStockNews(symbol);
    
    if (articles.length === 0) {
      return 'neutral';
    }

    let bullishScore = 0;
    let bearishScore = 0;
    
    for (const article of articles) {
      const text = `${article.title} ${article.description}`.toLowerCase();
      
      // Check for bullish keywords
      for (const keyword of BULLISH_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
          bullishScore++;
        }
      }
      
      // Check for bearish keywords
      for (const keyword of BEARISH_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
          bearishScore++;
        }
      }
    }
    
    // Determine sentiment
    if (bullishScore > bearishScore * 1.5) {
      return 'bullish';
    } else if (bearishScore > bullishScore * 1.5) {
      return 'bearish';
    } else {
      return 'neutral';
    }
  } catch (error) {
    console.error(`Error analyzing sentiment for ${symbol}:`, error);
    return 'neutral';
  }
}

/**
 * Check for breaking news in the last 24 hours
 */
export async function checkBreakingNews(symbol: string): Promise<string[]> {
  const cacheKey = `breaking-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.breakingNews;
  }

  try {
    const apiKey = getBraveApiKey();
    const query = `${symbol} breaking news today`;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=10&freshness=day`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const breakingNews: string[] = [];
    if (data.news && data.news.results) {
      for (const result of data.news.results) {
        const title = result.title || '';
        const text = `${title} ${result.description || ''}`.toLowerCase();
        
        // Check for catalyst keywords
        let isCatalyst = false;
        for (const keyword of CATALYST_KEYWORDS) {
          if (text.includes(keyword.toLowerCase())) {
            isCatalyst = true;
            break;
          }
        }
        
        if (isCatalyst) {
          breakingNews.push(title);
        }
      }
    }

    return breakingNews;
  } catch (error) {
    console.error(`Error checking breaking news for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get comprehensive news research for a stock
 */
export async function getNewsResearch(symbol: string): Promise<NewsResult> {
  const cacheKey = `full-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const [articles, sentiment, breakingNews] = await Promise.all([
      searchStockNews(symbol),
      getNewsSentiment(symbol),
      checkBreakingNews(symbol)
    ]);

    const result: NewsResult = {
      articles,
      sentiment,
      breakingNews,
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error(`Error getting news research for ${symbol}:`, error);
    // Return empty result instead of throwing
    return {
      articles: [],
      sentiment: 'neutral',
      breakingNews: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Clear cache for a specific symbol or all cache
 */
export function clearCache(symbol?: string): void {
  if (symbol) {
    const prefixes = [`news-${symbol}`, `sentiment-${symbol}`, `breaking-${symbol}`, `full-${symbol}`];
    for (const prefix of prefixes) {
      cache.delete(prefix);
    }
  } else {
    cache.clear();
  }
}