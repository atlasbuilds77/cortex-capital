/**
 * Earnings Research Module for Cortex Capital
 * Uses Brave Search API to fetch earnings data and whisper numbers
 */

export interface EarningsEvent {
  date: string;
  quarter: string;
  fiscalYear: number;
  estimatedEPS?: number;
  reportedEPS?: number;
  surprise?: number; // Percentage surprise
  surpriseDirection?: 'beat' | 'miss' | 'meet';
}

export interface EarningsHistory {
  symbol: string;
  upcomingEarnings?: EarningsEvent;
  recentHistory: EarningsEvent[];
  beatRate: number; // Percentage of beats in recent history
  averageSurprise: number; // Average surprise percentage
  lastUpdated: string;
}

export interface EarningsWhisper {
  whisperNumber?: number;
  consensusEstimate?: number;
  source?: string;
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

// In-memory cache with 15-minute TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

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
 * Search for upcoming earnings date using Brave Search
 */
export async function getUpcomingEarnings(symbol: string): Promise<EarningsEvent | null> {
  const cacheKey = `upcoming-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = getBraveApiKey();
    const query = `${symbol} Q1 2026 earnings date`;
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
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
    
    // Parse the search results for earnings date
    let earningsDate: string | null = null;
    let quarter: string = 'Q1';
    let fiscalYear: number = 2026;
    
    if (data.web && data.web.results) {
      for (const result of data.web.results) {
        const text = `${result.title} ${result.description}`.toLowerCase();
        
        // Look for date patterns
        const datePatterns = [
          /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},\s+\d{4}/i,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /\d{4}-\d{2}-\d{2}/
        ];
        
        for (const pattern of datePatterns) {
          const match = text.match(pattern);
          if (match) {
            earningsDate = match[0];
            break;
          }
        }
        
        // Look for quarter info
        const quarterMatch = text.match(/(Q[1-4])\s+(\d{4})/i);
        if (quarterMatch) {
          quarter = quarterMatch[1].toUpperCase();
          fiscalYear = parseInt(quarterMatch[2]);
        }
        
        if (earningsDate) break;
      }
    }

    if (!earningsDate) {
      // Try a different query pattern
      const altQuery = `${symbol} next earnings report date`;
      const altResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(altQuery)}&count=3`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey
          }
        }
      );
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        if (altData.web && altData.web.results) {
          for (const result of altData.web.results) {
            const text = `${result.title} ${result.description}`.toLowerCase();
            const datePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},\s+\d{4}/i;
            const match = text.match(datePattern);
            if (match) {
              earningsDate = match[0];
              break;
            }
          }
        }
      }
    }

    if (earningsDate) {
      const event: EarningsEvent = {
        date: earningsDate,
        quarter,
        fiscalYear
      };
      
      cache.set(cacheKey, {
        data: event,
        timestamp: Date.now()
      });
      
      return event;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching upcoming earnings for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get earnings history (beat/miss pattern)
 */
export async function getEarningsHistory(symbol: string): Promise<EarningsHistory> {
  const cacheKey = `history-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = getBraveApiKey();
    const query = `${symbol} earnings history beat miss Q4 2025 Q3 2025 Q2 2025 Q1 2025`;
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
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
    
    const history: EarningsEvent[] = [];
    let beatCount = 0;
    let totalSurprise = 0;
    let surpriseCount = 0;
    
    if (data.web && data.web.results) {
      for (const result of data.web.results) {
        const text = `${result.title} ${result.description}`.toLowerCase();
        
        // Look for earnings patterns
        const earningsPattern = /(Q[1-4])\s+(\d{4})\s+.*?(?:EPS|earnings).*?(\$?\d+\.?\d*).*?(?:vs|versus|compared to).*?(\$?\d+\.?\d*)/i;
        const match = text.match(earningsPattern);
        
        if (match) {
          const quarter = match[1].toUpperCase();
          const fiscalYear = parseInt(match[2]);
          const reported = parseFloat(match[3].replace('$', ''));
          const estimated = parseFloat(match[4].replace('$', ''));
          
          if (!isNaN(reported) && !isNaN(estimated)) {
            const surprise = ((reported - estimated) / Math.abs(estimated)) * 100;
            const surpriseDirection = surprise > 0 ? 'beat' : surprise < 0 ? 'miss' : 'meet';
            
            const event: EarningsEvent = {
              date: '', // We don't have exact date from this pattern
              quarter,
              fiscalYear,
              reportedEPS: reported,
              estimatedEPS: estimated,
              surprise,
              surpriseDirection
            };
            
            history.push(event);
            
            if (surpriseDirection === 'beat') {
              beatCount++;
            }
            
            if (!isNaN(surprise)) {
              totalSurprise += Math.abs(surprise);
              surpriseCount++;
            }
          }
        }
      }
    }

    // Get upcoming earnings
    const upcomingEarnings = await getUpcomingEarnings(symbol);
    
    const beatRate = history.length > 0 ? (beatCount / history.length) * 100 : 0;
    const averageSurprise = surpriseCount > 0 ? totalSurprise / surpriseCount : 0;
    
    const result: EarningsHistory = {
      symbol,
      upcomingEarnings: upcomingEarnings || undefined,
      recentHistory: history.slice(0, 8), // Last 8 quarters max
      beatRate,
      averageSurprise,
      lastUpdated: new Date().toISOString()
    };
    
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching earnings history for ${symbol}:`, error);
    
    // Return empty history instead of throwing
    return {
      symbol,
      recentHistory: [],
      beatRate: 0,
      averageSurprise: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Search for earnings whisper numbers
 */
export async function checkEarningsWhisper(symbol: string): Promise<EarningsWhisper> {
  const cacheKey = `whisper-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = getBraveApiKey();
    const query = `${symbol} earnings whisper number Q1 2026`;
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
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
    
    let whisperNumber: number | undefined;
    let consensusEstimate: number | undefined;
    let source: string | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    if (data.web && data.web.results) {
      for (const result of data.web.results) {
        const text = `${result.title} ${result.description}`;
        const lowerText = text.toLowerCase();
        
        // Look for whisper number patterns
        const whisperPatterns = [
          /whisper.*?\$(\d+\.?\d*)/i,
          /whisper.*?(\d+\.?\d*)\s*EPS/i,
          /whisper.*?EPS.*?\$(\d+\.?\d*)/i,
          /whisper.*?estimate.*?\$(\d+\.?\d*)/i
        ];
        
        for (const pattern of whisperPatterns) {
          const match = text.match(pattern);
          if (match) {
            const num = parseFloat(match[1]);
            if (!isNaN(num)) {
              whisperNumber = num;
              source = result.url;
              
              // Check source credibility
              if (result.url.includes('earningswhispers.com') || 
                  result.url.includes('marketbeat.com') ||
                  result.url.includes('zacks.com')) {
                confidence = 'high';
              } else if (result.url.includes('seekingalpha.com') ||
                        result.url.includes('yahoo.com') ||
                        result.url.includes('bloomberg.com')) {
                confidence = 'medium';
              }
              break;
            }
          }
        }
        
        // Look for consensus estimate patterns
        const consensusPatterns = [
          /consensus.*?\$(\d+\.?\d*)/i,
          /consensus.*?EPS.*?\$(\d+\.?\d*)/i,
          /estimate.*?\$(\d+\.?\d*).*?consensus/i,
          /analysts.*?expect.*?\$(\d+\.?\d*)/i
        ];
        
        for (const pattern of consensusPatterns) {
          const match = text.match(pattern);
          if (match) {
            const num = parseFloat(match[1]);
            if (!isNaN(num)) {
              consensusEstimate = num;
              if (!source) source = result.url;
              break;
            }
          }
        }
        
        if (whisperNumber) break;
      }
    }

    // If no whisper found, try alternative query
    if (!whisperNumber) {
      const altQuery = `${symbol} whisper number earnings estimate`;
      const altResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(altQuery)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey
          }
        }
      );
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        if (altData.web && altData.web.results) {
          for (const result of altData.web.results) {
            const text = `${result.title} ${result.description}`;
            const whisperPattern = /(\d+\.?\d*)\s*whisper/i;
            const match = text.match(whisperPattern);
            
            if (match) {
              const num = parseFloat(match[1]);
              if (!isNaN(num)) {
                whisperNumber = num;
                source = result.url;
                confidence = 'medium';
                break;
              }
            }
          }
        }
      }
    }

    const result: EarningsWhisper = {
      whisperNumber,
      consensusEstimate,
      source,
      confidence,
      lastUpdated: new Date().toISOString()
    };
    
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching earnings whisper for ${symbol}:`, error);
    
    // Return empty whisper instead of throwing
    return {
      confidence: 'low',
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Get comprehensive earnings research
 */
export async function getEarningsResearch(symbol: string): Promise<{
  history: EarningsHistory;
  whisper: EarningsWhisper;
}> {
  try {
    const [history, whisper] = await Promise.all([
      getEarningsHistory(symbol),
      checkEarningsWhisper(symbol)
    ]);

    return {
      history,
      whisper
    };
  } catch (error) {
    console.error(`Error getting earnings research for ${symbol}:`, error);
    
    // Return empty results instead of throwing
    return {
      history: {
        symbol,
        recentHistory: [],
        beatRate: 0,
        averageSurprise: 0,
        lastUpdated: new Date().toISOString()
      },
      whisper: {
        confidence: 'low',
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Clear cache for a specific symbol or all cache
 */
export function clearCache(symbol?: string): void {
  if (symbol) {
    const prefixes = [`upcoming-${symbol}`, `history-${symbol}`, `whisper-${symbol}`];
    for (const prefix of prefixes) {
      cache.delete(prefix);
    }
  } else {
    cache.clear();
  }
}