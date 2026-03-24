/**
 * CORTEX CAPITAL - STOCK ANALYZER
 * Validates user's custom stock picks
 * 
 * THE DIFFERENTIATOR:
 * - We don't just accept any stock blindly (like M1)
 * - We VALIDATE fundamentals, liquidity, options availability
 * - We WARN about concentration risk
 * - We SUGGEST alternatives
 */

import type { StockAnalysis } from './preferences';

/**
 * QUALITY SCORE CALCULATION
 * 0-100 score based on multiple factors
 */
interface ScoringFactors {
  market_cap_score: number;      // 0-20 points
  liquidity_score: number;       // 0-20 points
  fundamentals_score: number;    // 0-30 points
  options_availability: number;  // 0-15 points
  risk_factors: number;          // 0-15 points (deductions)
}

/**
 * Market cap tiers
 */
const getMarketCapScore = (marketCap: number): number => {
  if (marketCap >= 200_000_000_000) return 20;  // Mega cap
  if (marketCap >= 10_000_000_000) return 18;   // Large cap
  if (marketCap >= 2_000_000_000) return 15;    // Mid cap
  if (marketCap >= 300_000_000) return 10;      // Small cap
  if (marketCap >= 50_000_000) return 5;        // Micro cap
  return 0;  // Nano cap (too risky)
};

/**
 * Liquidity scoring (can we actually trade this?)
 */
const getLiquidityScore = (avgVolume: number, bidAskSpread: number): number => {
  let score = 0;
  
  // Volume scoring (0-12 points)
  if (avgVolume >= 5_000_000) score += 12;       // Highly liquid
  else if (avgVolume >= 1_000_000) score += 10;  // Good liquidity
  else if (avgVolume >= 500_000) score += 7;     // Acceptable
  else if (avgVolume >= 100_000) score += 4;     // Low liquidity
  else score += 1;                                // Very low (risky)
  
  // Spread scoring (0-8 points)
  if (bidAskSpread <= 0.01) score += 8;          // Tight spread
  else if (bidAskSpread <= 0.05) score += 6;     // Good spread
  else if (bidAskSpread <= 0.10) score += 4;     // Acceptable
  else if (bidAskSpread <= 0.25) score += 2;     // Wide spread
  else score += 0;                                // Too wide
  
  return score;
};

/**
 * Fundamentals scoring
 */
const getFundamentalsScore = (data: {
  pe_ratio: number | null;
  revenue_growth: number | null;
  debt_to_equity: number | null;
  profitability: boolean;
}): number => {
  let score = 0;
  
  // P/E ratio (0-8 points)
  if (data.pe_ratio === null) {
    // No earnings (growth stock or unprofitable)
    score += 4;  // Neutral
  } else if (data.pe_ratio > 0 && data.pe_ratio < 15) {
    score += 8;  // Value
  } else if (data.pe_ratio >= 15 && data.pe_ratio < 30) {
    score += 6;  // Fair value
  } else if (data.pe_ratio >= 30 && data.pe_ratio < 60) {
    score += 4;  // Growth premium
  } else {
    score += 2;  // Expensive / speculative
  }
  
  // Revenue growth (0-10 points)
  if (data.revenue_growth !== null) {
    if (data.revenue_growth >= 30) score += 10;      // Hyper-growth
    else if (data.revenue_growth >= 15) score += 8;  // High growth
    else if (data.revenue_growth >= 5) score += 6;   // Moderate growth
    else if (data.revenue_growth >= 0) score += 4;   // Slow growth
    else score += 2;                                  // Declining
  }
  
  // Debt-to-equity (0-6 points)
  if (data.debt_to_equity !== null) {
    if (data.debt_to_equity < 0.3) score += 6;       // Low debt
    else if (data.debt_to_equity < 0.7) score += 5;  // Moderate debt
    else if (data.debt_to_equity < 1.5) score += 3;  // High debt
    else score += 1;                                  // Very high debt
  }
  
  // Profitability (0-6 points)
  score += data.profitability ? 6 : 0;
  
  return score;
};

/**
 * Options availability scoring
 */
const getOptionsScore = (data: {
  available: boolean;
  has_weeklies: boolean;
  has_leaps: boolean;
  open_interest: number;
}): number => {
  let score = 0;
  
  if (!data.available) return 0;
  
  score += 5;  // Options exist
  if (data.has_weeklies) score += 3;
  if (data.has_leaps) score += 5;
  
  // Open interest (liquidity for options)
  if (data.open_interest >= 10000) score += 2;
  else if (data.open_interest >= 1000) score += 1;
  
  return score;
};

/**
 * Risk factor deductions
 */
const getRiskDeductions = (warnings: string[]): number => {
  // Each warning = -3 points, max -15
  return Math.min(warnings.length * 3, 15);
};

/**
 * MAIN ANALYZER
 * 
 * NOTE: In production, this would call:
 * - Tradier API for real-time quotes & options chains
 * - Financial data provider (Alpha Vantage, Polygon, etc.)
 * - Our own database for cached data
 * 
 * For now, returns structure with mock logic
 */
export async function analyzeStock(symbol: string): Promise<StockAnalysis> {
  // TODO: Integrate with real APIs
  // - Tradier: quotes, options chains
  // - Financial data: fundamentals
  // - Alternative data: sentiment, analyst ratings
  
  // Mock data structure
  const mockFundamentals = {
    market_cap: 50_000_000_000,
    pe_ratio: 25,
    revenue_growth: 20,
    debt_to_equity: 0.5,
    profitability: true,
  };
  
  const mockLiquidity = {
    avg_volume: 5_000_000,
    bid_ask_spread: 0.02,
    tradeable: true,
  };
  
  const mockOptions = {
    available: true,
    has_weeklies: true,
    has_leaps: true,
    open_interest: 50000,
  };
  
  // Calculate scores
  const scores: ScoringFactors = {
    market_cap_score: getMarketCapScore(mockFundamentals.market_cap),
    liquidity_score: getLiquidityScore(mockLiquidity.avg_volume, mockLiquidity.bid_ask_spread),
    fundamentals_score: getFundamentalsScore(mockFundamentals),
    options_availability: getOptionsScore(mockOptions),
    risk_factors: 0,  // Will calculate after warnings
  };
  
  // Generate warnings
  const warnings: string[] = [];
  
  if (mockFundamentals.market_cap < 2_000_000_000) {
    warnings.push('Small cap stock - higher volatility expected');
  }
  
  if (mockLiquidity.avg_volume < 500_000) {
    warnings.push('Low trading volume - may be difficult to exit position');
  }
  
  if (mockFundamentals.debt_to_equity && mockFundamentals.debt_to_equity > 1.0) {
    warnings.push('High debt levels - financial risk');
  }
  
  if (!mockFundamentals.profitability) {
    warnings.push('Currently unprofitable - speculative investment');
  }
  
  if (!mockOptions.available) {
    warnings.push('No options available - limited hedging strategies');
  }
  
  // Apply risk deductions
  scores.risk_factors = getRiskDeductions(warnings);
  
  // Calculate final quality score
  const quality_score = Math.max(0, Math.min(100,
    scores.market_cap_score +
    scores.liquidity_score +
    scores.fundamentals_score +
    scores.options_availability -
    scores.risk_factors
  ));
  
  // Determine if investable (threshold: 40)
  const investable = quality_score >= 40;
  
  // Generate alternatives (would use real similarity engine)
  const alternatives = generateAlternatives(symbol);
  
  return {
    symbol,
    quality_score,
    investable,
    fundamentals: mockFundamentals,
    liquidity: mockLiquidity,
    options: mockOptions,
    warnings,
    alternatives,
  };
}

/**
 * ALTERNATIVE SUGGESTIONS
 * "You like RIVN? Consider these similar stocks with better scores"
 */
function generateAlternatives(symbol: string): string[] {
  // TODO: Implement real similarity engine
  // - Sector matching
  // - Theme matching
  // - Correlation analysis
  // - Higher quality scores
  
  const alternativesMap: Record<string, string[]> = {
    'RIVN': ['TSLA', 'F', 'GM', 'LCID'],
    'SOFI': ['AFRM', 'UPST', 'LC', 'NU'],
    'HIMS': ['TDOC', 'AMWL', 'OSCR'],
    'PLTR': ['SNOW', 'AI', 'NET'],
    'RKLB': ['ASTS', 'SPCE', 'BA'],
  };
  
  return alternativesMap[symbol] || [];
}

/**
 * BATCH ANALYZE
 * Analyze multiple stocks at once
 */
export async function analyzeStocks(symbols: string[]): Promise<Record<string, StockAnalysis>> {
  const results: Record<string, StockAnalysis> = {};
  
  // In production: parallelize these calls
  for (const symbol of symbols) {
    results[symbol] = await analyzeStock(symbol);
  }
  
  return results;
}

/**
 * CONCENTRATION RISK WARNING
 * Too much in one stock/sector?
 */
export function checkConcentrationRisk(
  picks: string[],
  existingPortfolio: Record<string, number>
): { risky: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Single stock > 15% = risky
  const totalValue = Object.values(existingPortfolio).reduce((sum, val) => sum + val, 0);
  
  for (const [symbol, value] of Object.entries(existingPortfolio)) {
    const percentage = (value / totalValue) * 100;
    if (percentage > 15) {
      warnings.push(`${symbol} is ${percentage.toFixed(1)}% of portfolio - concentration risk`);
    }
  }
  
  // Total custom picks > 40% = too concentrated
  const customPicksValue = picks.reduce((sum, symbol) => {
    return sum + (existingPortfolio[symbol] || 0);
  }, 0);
  
  const customPicksPercentage = (customPicksValue / totalValue) * 100;
  if (customPicksPercentage > 40) {
    warnings.push(`Custom picks are ${customPicksPercentage.toFixed(1)}% of portfolio - diversification recommended`);
  }
  
  return {
    risky: warnings.length > 0,
    warnings,
  };
}

/**
 * QUALITY TIER CLASSIFICATION
 */
export function getQualityTier(score: number): {
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  color: string;
} {
  if (score >= 85) return { tier: 'S', label: 'Excellent', color: '#00ff00' };
  if (score >= 70) return { tier: 'A', label: 'Good', color: '#7fff00' };
  if (score >= 55) return { tier: 'B', label: 'Fair', color: '#ffff00' };
  if (score >= 40) return { tier: 'C', label: 'Risky', color: '#ff8800' };
  return { tier: 'D', label: 'Very Risky', color: '#ff0000' };
}

/**
 * EXPORT ANALYSIS SUMMARY
 * Human-readable summary for onboarding flow
 */
export function formatAnalysisSummary(analysis: StockAnalysis): string {
  const tier = getQualityTier(analysis.quality_score);
  
  let summary = `${analysis.symbol} - Quality Score: ${analysis.quality_score}/100 (${tier.label})\n\n`;
  
  if (analysis.investable) {
    summary += '✅ APPROVED for portfolio inclusion\n\n';
  } else {
    summary += '⚠️ NOT RECOMMENDED - quality score below threshold\n\n';
  }
  
  if (analysis.warnings.length > 0) {
    summary += 'Warnings:\n';
    analysis.warnings.forEach(w => {
      summary += `  • ${w}\n`;
    });
    summary += '\n';
  }
  
  if (analysis.alternatives.length > 0) {
    summary += `Similar stocks to consider: ${analysis.alternatives.join(', ')}\n`;
  }
  
  return summary;
}
