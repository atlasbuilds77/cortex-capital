/**
 * Bloomberg Bridge - Market Intelligence Integration
 * Connects Bloomberg Terminal data to Cortex Capital agents
 */

import { logger } from '../utils/logger';

const log = logger.child('BloombergBridge');

export interface MarketData {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  symbols: string[];
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  impactScore: number; // 0-1
  publishedAt: Date;
  url?: string;
  keywords: string[];
}

export interface Movers {
  gainers: MarketData[];
  losers: MarketData[];
  mostActive: MarketData[];
}

export interface VolatilityData {
  symbol: string;
  impliedVol: number;
  historicalVol: number;
  beta: number;
  vix?: number;
}

export class BloombergBridge {
  private baseUrl: string;
  private apiKey: string;
  
  constructor() {
    this.baseUrl = process.env.BLOOMBERG_API_URL || 'http://localhost:3001';
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.apiKey) {
      log.warn('No Alpha Vantage API key configured, using simulated data');
    }
  }
  
  /**
   * Get real-time market data for symbols
   */
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    try {
      log.info('Fetching market data', { symbols, count: symbols.length });
      
      // Call Bloomberg Terminal API
      const response = await fetch(`${this.baseUrl}/api/bloomberg/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      log.debug('Market data received', { count: data.length });
      return data;
    } catch (error) {
      log.error('Failed to fetch market data', { error, symbols });
      // Return simulated data as fallback
      return this.getSimulatedMarketData(symbols);
    }
  }
  
  /**
   * Get news feed with sentiment analysis
   */
  async getNewsFeed(limit: number = 50): Promise<NewsItem[]> {
    try {
      log.info('Fetching news feed', { limit });
      
      const response = await fetch(`${this.baseUrl}/api/bloomberg/news?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const news = await response.json();
      
      log.debug('News received', { count: news.length });
      return news;
    } catch (error) {
      log.error('Failed to fetch news', { error });
      return [];
    }
  }
  
  /**
   * Get market movers (gainers, losers, most active)
   */
  async getMarketMovers(): Promise<Movers> {
    try {
      log.info('Fetching market movers');
      
      const response = await fetch(`${this.baseUrl}/api/bloomberg/movers`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const movers = await response.json();
      
      log.debug('Movers received', {
        gainers: movers.gainers.length,
        losers: movers.losers.length,
        active: movers.mostActive.length,
      });
      
      return movers;
    } catch (error) {
      log.error('Failed to fetch movers', { error });
      return { gainers: [], losers: [], mostActive: [] };
    }
  }
  
  /**
   * Get volatility metrics for symbol
   */
  async getVolatilityMetrics(symbol: string): Promise<VolatilityData> {
    try {
      log.info('Fetching volatility', { symbol });
      
      const response = await fetch(`${this.baseUrl}/api/bloomberg/volatility/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const vol = await response.json();
      
      log.debug('Volatility received', { symbol, impliedVol: vol.impliedVol });
      return vol;
    } catch (error) {
      log.error('Failed to fetch volatility', { error, symbol });
      return {
        symbol,
        impliedVol: 30,
        historicalVol: 28,
        beta: 1.0,
      };
    }
  }
  
  /**
   * Calculate market sentiment from news
   */
  calculateSentiment(news: NewsItem[]): number {
    if (news.length === 0) return 0;
    
    const sentimentMap = {
      very_negative: -1,
      negative: -0.5,
      neutral: 0,
      positive: 0.5,
      very_positive: 1,
    };
    
    const total = news.reduce((sum, item) => {
      const score = sentimentMap[item.sentiment] || 0;
      return sum + (score * item.impactScore);
    }, 0);
    
    return total / news.length;
  }
  
  /**
   * Simulated market data (fallback when API unavailable)
   */
  private getSimulatedMarketData(symbols: string[]): MarketData[] {
    return symbols.map(symbol => ({
      symbol,
      price: 100 + Math.random() * 400,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 10000000),
      high: 0,
      low: 0,
      open: 0,
      timestamp: Date.now(),
    }));
  }
}

// Singleton instance
let bridgeInstance: BloombergBridge | null = null;

export function getBloombergBridge(): BloombergBridge {
  if (!bridgeInstance) {
    bridgeInstance = new BloombergBridge();
  }
  return bridgeInstance;
}
