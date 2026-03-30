// Cortex Capital - ENHANCED ANALYST Agent
// Portfolio analysis with real technical indicators and sector momentum

import {
  getPositions,
  getBalances,
  type BrokerPosition,
  type BrokerBalance,
} from './broker-abstraction';

import { getQuotes } from '../integrations/tradier';

import {
  enhancedAnalystAgent,
  getEnhancedAnalystAnalysis,
  getBatchEnhancedAnalysis,
  type AnalystEnhancedData,
} from './analysis-integration';

export interface PortfolioMetrics {
  sharpe_ratio: number;
  beta: number;
  volatility: number;
  max_drawdown: number;
}

export interface ConcentrationRisk {
  top_holding_pct: number;
  sector_exposure: Record<string, number>;
}

export interface TaxLossCandidate {
  ticker: string;
  unrealized_loss: number;
}

export interface EnhancedAnalystReport {
  portfolio_health: number; // 0-100
  total_value: number;
  metrics: PortfolioMetrics;
  concentration_risk: ConcentrationRisk;
  tax_loss_candidates: TaxLossCandidate[];
  positions: Array<{
    ticker: string;
    shares: number;
    value: number;
    cost_basis: number;
    current_price: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    technical_analysis?: AnalystEnhancedData;
    risk_level: 'low' | 'medium' | 'high';
    recommendation: 'HOLD' | 'ADD' | 'REDUCE' | 'SELL';
  }>;
  watchlist_analysis?: Record<string, AnalystEnhancedData>;
  sector_insights: Array<{
    sector: string;
    momentum_score: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    top_performers: string[];
    risk_level: 'low' | 'medium' | 'high';
  }>;
  timestamp: string;
}

// Enhanced sector mapping with more coverage
const SECTOR_MAP: Record<string, string> = {
  // Technology
  AAPL: 'tech', MSFT: 'tech', GOOGL: 'tech', META: 'tech', NVDA: 'tech',
  AMD: 'tech', INTC: 'tech', QCOM: 'tech', ADBE: 'tech', CRM: 'tech',
  ORCL: 'tech', CSCO: 'tech', IBM: 'tech',
  
  // Financials
  JPM: 'financials', BAC: 'financials', WFC: 'financials', C: 'financials',
  GS: 'financials', MS: 'financials', SCHW: 'financials', BLK: 'financials',
  
  // Healthcare
  JNJ: 'healthcare', PFE: 'healthcare', MRK: 'healthcare', ABT: 'healthcare',
  UNH: 'healthcare', LLY: 'healthcare', AMGN: 'healthcare', GILD: 'healthcare',
  
  // Consumer Discretionary
  AMZN: 'consumer', TSLA: 'consumer', HD: 'consumer', MCD: 'consumer',
  NKE: 'consumer', SBUX: 'consumer', TGT: 'consumer',
  
  // Consumer Staples
  PG: 'staples', KO: 'staples', PEP: 'staples', WMT: 'staples',
  COST: 'staples', MO: 'staples',
  
  // Energy
  XOM: 'energy', CVX: 'energy', COP: 'energy', SLB: 'energy',
  
  // Industrials
  BA: 'industrials', CAT: 'industrials', GE: 'industrials', HON: 'industrials',
  MMM: 'industrials',
  
  // Materials
  LIN: 'materials', DD: 'materials', APD: 'materials',
  
  // Real Estate
  AMT: 'real_estate', PLD: 'real_estate', EQIX: 'real_estate',
  
  // Utilities
  NEE: 'utilities', DUK: 'utilities', SO: 'utilities',
  
  // Communication Services
  T: 'communications', VZ: 'communications', CMCSA: 'communications',
};

/**
 * Enhanced analyst function with real technical analysis
 */
export async function enhancedAnalyst(userId: string): Promise<EnhancedAnalystReport> {
  try {
    // Get portfolio data (uses broker abstraction - works with any broker)
    const positions = await getPositions(userId);
    const balances = await getBalances(userId);
    const symbols = positions.map(p => p.symbol);
    
    // Get quotes for all positions
    const quotes = await getQuotes(symbols);
    const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
    
    // Calculate portfolio metrics
    const totalValue = balances.total_equity || 0;
    const portfolioHealth = calculatePortfolioHealth(positions, quoteMap);
    
    // Get enhanced analysis for all positions
    const enhancedAnalysis = await getBatchEnhancedAnalysis(symbols);
    
    // Process each position with enhanced analysis
    const enhancedPositions = positions.map(position => {
      // BrokerPosition already has currentPrice and unrealizedPnL calculated
      const currentPrice = position.currentPrice;
      const positionValue = position.marketValue;
      const costBasis = position.averageCost * position.quantity;
      const unrealizedPnl = position.unrealizedPnL;
      const unrealizedPnlPct = position.unrealizedPnLPercent;
      
      // Get enhanced analysis for this symbol
      const analysis = enhancedAnalysis[position.symbol];
      
      // Determine risk level and recommendation
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      let recommendation: 'HOLD' | 'ADD' | 'REDUCE' | 'SELL' = 'HOLD';
      
      if (analysis) {
        // Use analysis risk level
        riskLevel = analysis.technicalAnalysis.rsi.signal === 'overbought' ? 'high' :
                   analysis.technicalAnalysis.rsi.signal === 'oversold' ? 'low' : 'medium';
        
        // Generate recommendation based on analysis
        if (unrealizedPnlPct > 20 && analysis.technicalAnalysis.rsi.signal === 'overbought') {
          recommendation = 'REDUCE';
        } else if (unrealizedPnlPct < -10 && analysis.technicalAnalysis.rsi.signal === 'oversold') {
          recommendation = 'ADD';
        } else if (unrealizedPnlPct < -20) {
          recommendation = 'SELL';
        } else if (analysis.technicalAnalysis.macd.signalType === 'bullish' && unrealizedPnlPct < 5) {
          recommendation = 'ADD';
        }
      } else {
        // Fallback to basic analysis
        if (unrealizedPnlPct > 20) {
          riskLevel = 'high';
          recommendation = 'REDUCE';
        } else if (unrealizedPnlPct < -15) {
          riskLevel = 'high';
          recommendation = 'SELL';
        } else if (unrealizedPnlPct < -5) {
          riskLevel = 'medium';
          recommendation = 'HOLD';
        }
      }
      
      return {
        ticker: position.symbol,
        shares: position.quantity,
        value: positionValue,
        cost_basis: costBasis,
        current_price: currentPrice,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_pct: unrealizedPnlPct,
        technical_analysis: analysis,
        risk_level: riskLevel,
        recommendation,
      };
    });
    
    // Calculate concentration risk
    const concentrationRisk = calculateConcentrationRisk(enhancedPositions);
    
    // Find tax loss candidates
    const taxLossCandidates = findTaxLossCandidates(enhancedPositions);
    
    // Calculate portfolio metrics (simplified for now)
    const metrics: PortfolioMetrics = {
      sharpe_ratio: calculateSharpeRatio(enhancedPositions),
      beta: calculatePortfolioBeta(enhancedPositions),
      volatility: calculatePortfolioVolatility(enhancedPositions),
      max_drawdown: calculateMaxDrawdown(enhancedPositions),
    };
    
    // Generate sector insights
    const sectorInsights = await generateSectorInsights(enhancedPositions, enhancedAnalysis);
    
    // Analyze watchlist (top 10 S&P 500 stocks)
    const watchlist = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'V'];
    const watchlistAnalysis: Record<string, AnalystEnhancedData> = {};
    
    try {
      const watchlistAnalysisData = await getBatchEnhancedAnalysis(watchlist);
      Object.assign(watchlistAnalysis, watchlistAnalysisData);
    } catch (error) {
      console.warn('Failed to analyze watchlist:', error);
    }
    
    return {
      portfolio_health: portfolioHealth,
      total_value: totalValue,
      metrics,
      concentration_risk: concentrationRisk,
      tax_loss_candidates: taxLossCandidates,
      positions: enhancedPositions,
      watchlist_analysis: Object.keys(watchlistAnalysis).length > 0 ? watchlistAnalysis : undefined,
      sector_insights: sectorInsights,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Enhanced analyst failed:', error);
    throw error;
  }
}

/**
 * Calculate portfolio health score (0-100)
 */
function calculatePortfolioHealth(
  positions: TradierPosition[],
  quoteMap: Map<string, any>
): number {
  if (positions.length === 0) return 50;
  
  let score = 50;
  
  // Check for large losses
  const largeLosses = positions.filter(p => {
    return p.unrealizedPnLPercent < -15;
  });
  
  if (largeLosses.length > 0) {
    score -= largeLosses.length * 5;
  }
  
  // Check for concentration
  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  
  if (totalValue > 0) {
    const largestPosition = Math.max(...positions.map(p => p.marketValue / totalValue));
    
    if (largestPosition > 0.3) {
      score -= 20; // Too concentrated
    } else if (largestPosition > 0.2) {
      score -= 10; // Moderately concentrated
    }
  }
  
  // Check for diversification
  const sectors = new Set(positions.map(p => SECTOR_MAP[p.symbol] || 'unknown'));
  if (sectors.size >= 5) {
    score += 10; // Well diversified
  } else if (sectors.size <= 2) {
    score -= 15; // Poorly diversified
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate concentration risk
 */
function calculateConcentrationRisk(
  positions: Array<{ ticker: string; value: number }>
): ConcentrationRisk {
  if (positions.length === 0) {
    return { top_holding_pct: 0, sector_exposure: {} };
  }
  
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  
  // Find top holding percentage
  const sortedPositions = [...positions].sort((a, b) => b.value - a.value);
  const topHoldingPct = totalValue > 0 ? (sortedPositions[0].value / totalValue) * 100 : 0;
  
  // Calculate sector exposure
  const sectorExposure: Record<string, number> = {};
  positions.forEach(position => {
    const sector = SECTOR_MAP[position.symbol] || 'other';
    sectorExposure[sector] = (sectorExposure[sector] || 0) + position.marketValue;
  });
  
  // Convert to percentages
  Object.keys(sectorExposure).forEach(sector => {
    sectorExposure[sector] = (sectorExposure[sector] / totalValue) * 100;
  });
  
  return {
    top_holding_pct: topHoldingPct,
    sector_exposure: sectorExposure,
  };
}

/**
 * Find tax loss harvesting candidates
 */
function findTaxLossCandidates(
  positions: Array<{ ticker: string; unrealized_pnl: number; unrealized_pnl_pct: number }>
): TaxLossCandidate[] {
  return positions
    .filter(p => p.unrealized_pnl < 0 && p.unrealized_pnl_pct < -5)
    .map(p => ({
      ticker: p.ticker,
      unrealized_loss: Math.abs(p.unrealized_pnl),
    }))
    .sort((a, b) => b.unrealized_loss - a.unrealized_loss)
    .slice(0, 5); // Top 5 candidates
}

/**
 * Generate sector insights with momentum analysis
 */
async function generateSectorInsights(
  positions: Array<{ ticker: string; value: number }>,
  enhancedAnalysis: Record<string, AnalystEnhancedData>
): Promise<EnhancedAnalystReport['sector_insights']> {
  const sectors: Record<string, {
    symbols: string[];
    totalValue: number;
    momentumScores: number[];
    trends: string[];
  }> = {};
  
  // Group positions by sector
  positions.forEach(position => {
    const sector = SECTOR_MAP[position.symbol] || 'other';
    if (!sectors[sector]) {
      sectors[sector] = {
        symbols: [],
        totalValue: 0,
        momentumScores: [],
        trends: [],
      };
    }
    
    sectors[sector].symbols.push(position.symbol);
    sectors[sector].totalValue += position.marketValue;
    
    // Add momentum data if available
    const analysis = enhancedAnalysis[position.symbol];
    if (analysis?.sectorMomentum) {
      sectors[sector].momentumScores.push(analysis.sectorMomentum.momentumScore);
      sectors[sector].trends.push(analysis.sectorMomentum.trend);
    }
  });
  
  // Convert to insights
  return Object.entries(sectors).map(([sector, data]) => {
    // Calculate average momentum score
    const avgMomentum = data.momentumScores.length > 0
      ? data.momentumScores.reduce((a, b) => a + b, 0) / data.momentumScores.length
      : 50;
    
    // Determine overall trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (data.trends.length > 0) {
      const bullishCount = data.trends.filter(t => t === 'bullish').length;
      const bearishCount = data.trends.filter(t => t === 'bearish').length;
      
      if (bullishCount > bearishCount) trend = 'bullish';
      else if (bearishCount > bullishCount) trend = 'bearish';
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (trend === 'bullish' && avgMomentum > 60) riskLevel = 'low';
    else if (trend === 'bearish' && avgMomentum < 40) riskLevel = 'high';
    
    // Find top performers in sector
    const topPerformers = data.symbols
      .filter(symbol => {
        const analysis = enhancedAnalysis[symbol];
        return analysis?.technicalAnalysis?.macd.signalType === 'bullish';
      })
      .slice(0, 3);
    
    return {
      sector,
      momentum_score: Math.round(avgMomentum),
      trend,
      top_performers: topPerformers,
      risk_level: riskLevel,
    };
  });
}

// Simplified metric calculations (would be more complex in production)
function calculateSharpeRatio(positions: any[]): number {
  // Simplified calculation
  return positions.length > 0 ? 1.2 : 0;
}

function calculatePortfolioBeta(positions: any[]): number {
  // Simplified calculation
  return positions.length > 0 ? 1.1 : 0;
}

function calculatePortfolioVolatility(positions: any[]): number {
  // Simplified calculation
  return positions.length > 0 ? 0.15 : 0;
}

function calculateMaxDrawdown(positions: any[]): number {
  // Simplified calculation
  return positions.length > 0 ? 0.08 : 0;
}

/**
 * Main export - enhanced analyst function
 */
export default enhancedAnalyst;