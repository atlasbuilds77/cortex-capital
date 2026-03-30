/**
 * Research Aggregator for Cortex Capital
 * Combines news and earnings research into comprehensive reports
 */

import { NewsResult, getNewsResearch } from './news-research';
import { EarningsHistory, EarningsWhisper, getEarningsResearch } from './earnings-research';

export interface ResearchReport {
  symbol: string;
  news: NewsResult;
  earningsHistory: EarningsHistory;
  earningsWhisper: EarningsWhisper;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  upcomingCatalysts: string[];
  riskFactors: string[];
  confidence: number; // 0-100 scale
  summary: string;
  lastUpdated: string;
}

// In-memory cache with 15-minute TTL
const cache = new Map<string, { data: ResearchReport; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Extract risk factors from news and earnings data
 */
function extractRiskFactors(
  news: NewsResult,
  earningsHistory: EarningsHistory,
  earningsWhisper: EarningsWhisper
): string[] {
  const riskFactors: string[] = [];

  // News-based risks
  if (news.sentiment === 'bearish') {
    riskFactors.push('Negative news sentiment');
  }
  
  if (news.breakingNews.length > 0) {
    riskFactors.push('Breaking news events detected');
  }

  // Check for specific risk keywords in news
  const riskKeywords = [
    'lawsuit', 'investigation', 'regulatory', 'warning', 'recall',
    'delay', 'suspension', 'bankruptcy', 'default', 'layoff',
    'downgrade', 'cut', 'reduction', 'decline', 'loss'
  ];

  for (const article of news.articles) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    for (const keyword of riskKeywords) {
      if (text.includes(keyword) && !riskFactors.includes(`News contains "${keyword}"`)) {
        riskFactors.push(`News contains "${keyword}"`);
      }
    }
  }

  // Earnings-based risks
  if (earningsHistory.beatRate < 50) {
    riskFactors.push(`Low earnings beat rate (${earningsHistory.beatRate.toFixed(1)}%)`);
  }

  if (earningsHistory.averageSurprise < 0) {
    riskFactors.push(`Negative average earnings surprise (${earningsHistory.averageSurprise.toFixed(1)}%)`);
  }

  if (earningsHistory.recentHistory.length === 0) {
    riskFactors.push('Limited earnings history available');
  }

  // Whisper-based risks
  if (earningsWhisper.whisperNumber !== undefined && 
      earningsWhisper.consensusEstimate !== undefined) {
    const whisperVsConsensus = ((earningsWhisper.whisperNumber - earningsWhisper.consensusEstimate) / 
                               Math.abs(earningsWhisper.consensusEstimate)) * 100;
    
    if (whisperVsConsensus < -10) {
      riskFactors.push(`Whisper number significantly below consensus (${whisperVsConsensus.toFixed(1)}%)`);
    }
  }

  if (earningsWhisper.confidence === 'low') {
    riskFactors.push('Low confidence in whisper numbers');
  }

  return riskFactors.slice(0, 10); // Limit to top 10 risk factors
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(
  news: NewsResult,
  earningsHistory: EarningsHistory,
  earningsWhisper: EarningsWhisper
): number {
  let confidence = 50; // Base confidence

  // News factors (max 30 points)
  if (news.articles.length >= 10) confidence += 10;
  else if (news.articles.length >= 5) confidence += 5;
  
  if (news.sentiment !== 'neutral') confidence += 5;
  
  if (news.breakingNews.length > 0) confidence += 5;

  // Earnings history factors (max 30 points)
  if (earningsHistory.recentHistory.length >= 4) confidence += 10;
  else if (earningsHistory.recentHistory.length >= 2) confidence += 5;
  
  if (earningsHistory.beatRate >= 75) confidence += 10;
  else if (earningsHistory.beatRate >= 50) confidence += 5;
  
  if (earningsHistory.averageSurprise > 5) confidence += 10;
  else if (earningsHistory.averageSurprise > 0) confidence += 5;

  // Whisper factors (max 20 points)
  if (earningsWhisper.whisperNumber !== undefined) {
    confidence += 10;
    
    if (earningsWhisper.confidence === 'high') confidence += 10;
    else if (earningsWhisper.confidence === 'medium') confidence += 5;
  }

  // Cap at 0-100
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Generate summary based on research findings
 */
function generateSummary(
  symbol: string,
  news: NewsResult,
  earningsHistory: EarningsHistory,
  earningsWhisper: EarningsWhisper,
  sentiment: 'bullish' | 'bearish' | 'neutral',
  confidence: number
): string {
  const parts: string[] = [];
  
  // Overall sentiment
  parts.push(`${symbol} shows ${sentiment} sentiment based on recent research.`);
  
  // News summary
  if (news.articles.length > 0) {
    parts.push(`Found ${news.articles.length} recent news articles.`);
  }
  
  if (news.breakingNews.length > 0) {
    parts.push(`Detected ${news.breakingNews.length} breaking news catalyst(s).`);
  }
  
  // Earnings summary
  if (earningsHistory.recentHistory.length > 0) {
    parts.push(`Historical earnings beat rate: ${earningsHistory.beatRate.toFixed(1)}%`);
  }
  
  if (earningsHistory.upcomingEarnings) {
    parts.push(`Upcoming earnings: ${earningsHistory.upcomingEarnings.quarter} ${earningsHistory.upcomingEarnings.fiscalYear}`);
  }
  
  // Whisper summary
  if (earningsWhisper.whisperNumber !== undefined) {
    parts.push(`Earnings whisper: $${earningsWhisper.whisperNumber.toFixed(2)} (${earningsWhisper.confidence} confidence)`);
    
    if (earningsWhisper.consensusEstimate !== undefined) {
      const diff = ((earningsWhisper.whisperNumber - earningsWhisper.consensusEstimate) / 
                   Math.abs(earningsWhisper.consensusEstimate)) * 100;
      parts.push(`Whisper vs consensus: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
    }
  }
  
  // Confidence
  if (confidence >= 80) {
    parts.push(`High confidence research (${confidence}%)`);
  } else if (confidence >= 60) {
    parts.push(`Moderate confidence research (${confidence}%)`);
  } else {
    parts.push(`Low confidence research (${confidence}%) - consider additional verification`);
  }
  
  return parts.join(' ');
}

/**
 * Get comprehensive research report for a symbol
 */
export async function getFullResearch(symbol: string): Promise<ResearchReport> {
  const cacheKey = `full-research-${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Fetch all research in parallel
    const [news, earnings] = await Promise.all([
      getNewsResearch(symbol),
      getEarningsResearch(symbol)
    ]);

    const { history: earningsHistory, whisper: earningsWhisper } = earnings;

    // Determine overall sentiment (weighted: 60% news, 40% earnings)
    let sentimentScore = 0;
    
    // News sentiment (60% weight)
    if (news.sentiment === 'bullish') sentimentScore += 60;
    else if (news.sentiment === 'bearish') sentimentScore -= 60;
    
    // Earnings sentiment (40% weight)
    if (earningsHistory.beatRate > 60) sentimentScore += 40;
    else if (earningsHistory.beatRate < 40) sentimentScore -= 40;
    
    if (earningsHistory.averageSurprise > 5) sentimentScore += 20;
    else if (earningsHistory.averageSurprise < -5) sentimentScore -= 20;

    // Determine final sentiment
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (sentimentScore > 30) {
      sentiment = 'bullish';
    } else if (sentimentScore < -30) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }

    // Extract upcoming catalysts (from breaking news and upcoming earnings)
    const upcomingCatalysts = [...news.breakingNews];
    if (earningsHistory.upcomingEarnings) {
      upcomingCatalysts.push(
        `${earningsHistory.upcomingEarnings.quarter} ${earningsHistory.upcomingEarnings.fiscalYear} Earnings`
      );
    }

    // Extract risk factors
    const riskFactors = extractRiskFactors(news, earningsHistory, earningsWhisper);

    // Calculate confidence
    const confidence = calculateConfidence(news, earningsHistory, earningsWhisper);

    // Generate summary
    const summary = generateSummary(
      symbol,
      news,
      earningsHistory,
      earningsWhisper,
      sentiment,
      confidence
    );

    const report: ResearchReport = {
      symbol: symbol.toUpperCase(),
      news,
      earningsHistory,
      earningsWhisper,
      sentiment,
      upcomingCatalysts,
      riskFactors,
      confidence,
      summary,
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    cache.set(cacheKey, {
      data: report,
      timestamp: Date.now()
    });

    return report;
  } catch (error) {
    console.error(`Error generating research report for ${symbol}:`, error);
    
    // Return minimal report instead of throwing
    return {
      symbol: symbol.toUpperCase(),
      news: {
        articles: [],
        sentiment: 'neutral',
        breakingNews: [],
        lastUpdated: new Date().toISOString()
      },
      earningsHistory: {
        symbol,
        recentHistory: [],
        beatRate: 0,
        averageSurprise: 0,
        lastUpdated: new Date().toISOString()
      },
      earningsWhisper: {
        confidence: 'low',
        lastUpdated: new Date().toISOString()
      },
      sentiment: 'neutral',
      upcomingCatalysts: [],
      riskFactors: ['Research data unavailable due to error'],
      confidence: 0,
      summary: `Unable to generate research report for ${symbol}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Get research for multiple symbols
 */
export async function getBatchResearch(
  symbols: string[]
): Promise<Map<string, ResearchReport>> {
  try {
    const reports = new Map<string, ResearchReport>();
    
    // Process symbols in batches of 3 to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => getFullResearch(symbol));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const symbol = batch[j];
        
        if (result.status === 'fulfilled') {
          reports.set(symbol, result.value);
        } else {
          console.error(`Error getting research for ${symbol}:`, result.reason);
          // Add error report
          reports.set(symbol, {
            symbol: symbol.toUpperCase(),
            news: {
              articles: [],
              sentiment: 'neutral',
              breakingNews: [],
              lastUpdated: new Date().toISOString()
            },
            earningsHistory: {
              symbol,
              recentHistory: [],
              beatRate: 0,
              averageSurprise: 0,
              lastUpdated: new Date().toISOString()
            },
            earningsWhisper: {
              confidence: 'low',
              lastUpdated: new Date().toISOString()
            },
            sentiment: 'neutral',
            upcomingCatalysts: [],
            riskFactors: ['Research failed'],
            confidence: 0,
            summary: `Research failed for ${symbol}`,
            lastUpdated: new Date().toISOString()
          });
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return reports;
  } catch (error) {
    console.error('Error in batch research:', error);
    return new Map();
  }
}

/**
 * Clear cache for a specific symbol or all cache
 */
export function clearCache(symbol?: string): void {
  if (symbol) {
    cache.delete(`full-research-${symbol}`);
  } else {
    cache.clear();
  }
}

/**
 * Export all functions for convenience
 */
export { 
  getNewsResearch,
  searchStockNews,
  getNewsSentiment,
  checkBreakingNews 
} from './news-research';

export { 
  getEarningsResearch,
  checkEarningsWhisper,
  getUpcomingEarnings,
  getEarningsHistory
} from './earnings-research';

export type { NewsArticle, NewsResult } from './news-research';
export type { EarningsEvent, EarningsHistory, EarningsWhisper } from './earnings-research';