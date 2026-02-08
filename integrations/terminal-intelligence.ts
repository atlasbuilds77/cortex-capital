/**
 * Terminal Intelligence - Agent Context Enrichment
 * Enriches agent decision-making with Bloomberg Terminal data
 */

import { getBloombergBridge, MarketData, NewsItem } from './bloomberg-bridge';
import { logger } from '../utils/logger';
import * as db from '../integration/db-adapter';

const log = logger.child('TerminalIntelligence');

export interface EnrichedContext {
  symbol: string;
  marketContext: {
    currentPrice: number;
    dayChange: number;
    volume: number;
    volatility: number;
    recentNews: NewsItem[];
    marketSentiment: number; // -1 to 1
    unusualActivity: boolean;
    vixLevel?: number;
  };
  riskMetrics: {
    impliedVolatility: number;
    beta: number;
    recommendedSize: number; // In USD
  };
  newsContext: {
    positiveCount: number;
    negativeCount: number;
    topHeadlines: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  confidence?: number;
}

export class TerminalIntelligence {
  private bridge = getBloombergBridge();
  
  /**
   * Enrich agent context with comprehensive market data
   */
  async enrichAgentContext(
    agentId: string,
    symbol: string,
    proposalData?: any
  ): Promise<EnrichedContext> {
    try {
      log.info('Enriching context', { agentId, symbol });
      
      // Fetch all data in parallel
      const [marketData, news, volatility, movers] = await Promise.all([
        this.bridge.getMarketData([symbol]),
        this.bridge.getNewsFeed(50),
        this.bridge.getVolatilityMetrics(symbol),
        this.bridge.getMarketMovers(),
      ]);
      
      const quote = marketData[0];
      const relevantNews = news.filter(n => n.symbols.includes(symbol));
      const sentiment = this.bridge.calculateSentiment(relevantNews);
      
      // Check if symbol is in market movers
      const unusualActivity = this.checkUnusualActivity(symbol, quote, movers);
      
      // Calculate recommended position size based on volatility
      const recommendedSize = this.calculatePositionSize(volatility);
      
      const enriched: EnrichedContext = {
        symbol,
        marketContext: {
          currentPrice: quote.price,
          dayChange: quote.changePercent,
          volume: quote.volume,
          volatility: volatility.impliedVol,
          recentNews: relevantNews.slice(0, 5),
          marketSentiment: sentiment,
          unusualActivity,
          vixLevel: volatility.vix,
        },
        riskMetrics: {
          impliedVolatility: volatility.impliedVol,
          beta: volatility.beta,
          recommendedSize,
        },
        newsContext: {
          positiveCount: relevantNews.filter(n => 
            n.sentiment === 'positive' || n.sentiment === 'very_positive'
          ).length,
          negativeCount: relevantNews.filter(n => 
            n.sentiment === 'negative' || n.sentiment === 'very_negative'
          ).length,
          topHeadlines: relevantNews.slice(0, 3).map(n => n.title),
        },
      };
      
      // Store market context in database
      await this.storeMarketContext(enriched, proposalData?.proposalId);
      
      log.debug('Context enriched', { 
        symbol, 
        sentiment, 
        volatility: volatility.impliedVol,
        newsCount: relevantNews.length,
      });
      
      return enriched;
    } catch (error) {
      log.error('Failed to enrich context', { error, agentId, symbol });
      throw error;
    }
  }
  
  /**
   * Validate if market conditions support the proposed trade
   */
  async validateMarketConditions(proposal: any): Promise<ValidationResult> {
    try {
      const symbol = proposal.metadata?.symbol || proposal.metadata?.token;
      
      if (!symbol) {
        return { valid: false, reason: 'No symbol specified' };
      }
      
      log.info('Validating market conditions', { symbol, proposalId: proposal.id });
      
      // Get market context
      const context = await this.enrichAgentContext('validator', symbol, proposal);
      
      // Rule 1: High volatility check
      if (context.marketContext.volatility > 60) {
        return {
          valid: false,
          reason: `Extreme volatility (${context.marketContext.volatility.toFixed(1)}%), wait for stability`,
          confidence: 0.9,
        };
      }
      
      // Rule 2: Negative news check
      if (context.newsContext.negativeCount > 5) {
        return {
          valid: false,
          reason: `High negative news volume (${context.newsContext.negativeCount} articles)`,
          confidence: 0.75,
        };
      }
      
      // Rule 3: Sentiment divergence check
      const proposalSentiment = proposal.metadata?.sentiment || 0;
      if (proposalSentiment > 0.5 && context.marketContext.marketSentiment < -0.3) {
        return {
          valid: false,
          reason: 'Signal bullish but market sentiment very negative',
          confidence: 0.7,
        };
      }
      
      // Rule 4: VIX check (if available)
      if (context.marketContext.vixLevel && context.marketContext.vixLevel > 30) {
        log.warn('High VIX detected', { vix: context.marketContext.vixLevel });
        // Don't block, but reduce confidence
        return {
          valid: true,
          reason: 'High VIX, consider smaller position',
          confidence: 0.6,
        };
      }
      
      // All checks passed
      return { 
        valid: true, 
        confidence: 0.85,
      };
    } catch (error) {
      log.error('Validation failed', { error, proposal });
      return {
        valid: false,
        reason: 'Market data unavailable',
        confidence: 0,
      };
    }
  }
  
  /**
   * Get comprehensive market overview for agent roundtable
   */
  async getMarketOverview(): Promise<any> {
    try {
      log.info('Generating market overview');
      
      const [movers, news] = await Promise.all([
        this.bridge.getMarketMovers(),
        this.bridge.getNewsFeed(20),
      ]);
      
      const sentiment = this.bridge.calculateSentiment(news);
      
      return {
        topGainers: movers.gainers.slice(0, 5),
        topLosers: movers.losers.slice(0, 5),
        mostActive: movers.mostActive.slice(0, 5),
        marketSentiment: sentiment,
        topNews: news.slice(0, 10),
        timestamp: new Date(),
      };
    } catch (error) {
      log.error('Failed to generate overview', { error });
      return null;
    }
  }
  
  /**
   * Check for unusual market activity
   */
  private checkUnusualActivity(
    symbol: string,
    quote: MarketData,
    movers: any
  ): boolean {
    // Check if in top gainers/losers
    const inMovers = [
      ...movers.gainers,
      ...movers.losers,
      ...movers.mostActive,
    ].some(m => m.symbol === symbol);
    
    // Check for unusual volume (>200% of average)
    const unusualVolume = quote.volume > 10000000; // Simplified check
    
    // Check for big price move
    const bigMove = Math.abs(quote.changePercent) > 5;
    
    return inMovers || unusualVolume || bigMove;
  }
  
  /**
   * Calculate recommended position size based on volatility
   */
  private calculatePositionSize(volatility: any): number {
    const baseSize = 50; // $50 base position
    const maxSize = 60; // Max from cap gates
    
    // Reduce size as volatility increases
    let multiplier = 1.0;
    if (volatility.impliedVol > 50) {
      multiplier = 0.5; // Cut in half for high vol
    } else if (volatility.impliedVol > 40) {
      multiplier = 0.75;
    }
    
    // Adjust for beta (market risk)
    if (volatility.beta > 1.5) {
      multiplier *= 0.8; // Reduce for high beta
    }
    
    return Math.min(maxSize, baseSize * multiplier);
  }
  
  /**
   * Store market context in database for later analysis
   */
  private async storeMarketContext(
    context: EnrichedContext,
    proposalId?: string
  ): Promise<void> {
    if (!proposalId) return;
    
    try {
      const database = db.getDb();
      await database.execute(`
        INSERT INTO ops_market_context (
          proposal_id, symbol, price, volume, volatility, 
          sentiment, news_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        proposalId,
        context.symbol,
        context.marketContext.currentPrice,
        context.marketContext.volume,
        context.marketContext.volatility,
        context.marketContext.marketSentiment,
        context.newsContext.topHeadlines.join(' | '),
      ]);
    } catch (error) {
      log.error('Failed to store market context', { error, proposalId });
    }
  }
}

// Singleton instance
let intelligenceInstance: TerminalIntelligence | null = null;

export function getTerminalIntelligence(): TerminalIntelligence {
  if (!intelligenceInstance) {
    intelligenceInstance = new TerminalIntelligence();
  }
  return intelligenceInstance;
}
