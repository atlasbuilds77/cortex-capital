// Cortex Capital - Sector Momentum Analysis
// Rank sectors by relative strength vs SPY

import { getQuotes, TradierQuote } from '../../integrations/tradier';

export interface Sector {
  symbol: string;
  name: string;
  category: string;
}

export interface SectorPerformance {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface SectorMomentum {
  symbol: string;
  name: string;
  oneWeek: number;      // 1-week relative strength vs SPY
  oneMonth: number;     // 1-month relative strength vs SPY
  threeMonth: number;   // 3-month relative strength vs SPY
  momentumScore: number; // Composite score (0-100)
  rank: number;
  trend: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  confidence: number;
}

// Major sector ETFs
export const SECTOR_ETFS: Sector[] = [
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', category: 'Technology' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', category: 'Financials' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', category: 'Energy' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', category: 'Healthcare' },
  { symbol: 'XLY', name: 'Consumer Discretionary Select Sector SPDR', category: 'Consumer Discretionary' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR', category: 'Industrials' },
  { symbol: 'XLB', name: 'Materials Select Sector SPDR', category: 'Materials' },
  { symbol: 'XLU', name: 'Utilities Select Sector SPDR', category: 'Utilities' },
  { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR', category: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication Services Select Sector SPDR', category: 'Communications' },
];

// Benchmark (SPY - S&P 500 ETF)
const BENCHMARK_SYMBOL = 'SPY';

/**
 * Fetch current quotes for all sector ETFs and benchmark
 */
async function fetchSectorQuotes(): Promise<{
  sectors: Record<string, TradierQuote>;
  benchmark: TradierQuote | null;
}> {
  const allSymbols = [...SECTOR_ETFS.map(s => s.symbol), BENCHMARK_SYMBOL];
  const quotes = await getQuotes(allSymbols);
  
  const sectorQuotes: Record<string, TradierQuote> = {};
  let benchmarkQuote: TradierQuote | null = null;
  
  for (const quote of quotes) {
    if (quote.symbol === BENCHMARK_SYMBOL) {
      benchmarkQuote = quote;
    } else {
      sectorQuotes[quote.symbol] = quote;
    }
  }
  
  return { sectors: sectorQuotes, benchmark: benchmarkQuote };
}

/**
 * Calculate relative strength vs benchmark
 * @param sectorReturn Sector return percentage
 * @param benchmarkReturn Benchmark return percentage
 * @returns Relative strength score (positive = outperforming, negative = underperforming)
 */
function calculateRelativeStrength(sectorReturn: number, benchmarkReturn: number): number {
  return sectorReturn - benchmarkReturn;
}

/**
 * Simulate historical returns for demonstration
 * In production, replace with actual historical API calls
 */
function simulateHistoricalReturns(
  currentPrice: number, 
  symbol: string
): { oneWeek: number; oneMonth: number; threeMonth: number } {
  // Generate realistic simulated returns based on sector volatility
  const sectorVolatility: Record<string, number> = {
    'XLK': 0.25,  // Tech: high volatility
    'XLF': 0.20,  // Financials: medium-high
    'XLE': 0.30,  // Energy: high volatility
    'XLV': 0.18,  // Healthcare: medium
    'XLY': 0.22,  // Consumer Discretionary: medium-high
    'XLI': 0.20,  // Industrials: medium
    'XLB': 0.22,  // Materials: medium-high
    'XLU': 0.15,  // Utilities: low volatility
    'XLRE': 0.18, // Real Estate: medium
    'XLC': 0.24,  // Communications: high
    'SPY': 0.18,  // Benchmark: medium
  };
  
  const volatility = sectorVolatility[symbol] || 0.20;
  
  // Simulate returns with some correlation to market conditions
  const baseReturn = Math.random() * 0.1 - 0.05; // -5% to +5% base
  const randomFactor = (Math.random() - 0.5) * 2 * volatility;
  
  const oneWeek = baseReturn * 0.25 + randomFactor * 0.5;
  const oneMonth = baseReturn + randomFactor * 0.7;
  const threeMonth = baseReturn * 3 + randomFactor * 1.2;
  
  return { oneWeek, oneMonth, threeMonth };
}

/**
 * Calculate momentum score from relative strength values
 * @param oneWeek 1-week relative strength
 * @param oneMonth 1-month relative strength
 * @param threeMonth 3-month relative strength
 * @returns Momentum score (0-100)
 */
function calculateMomentumScore(
  oneWeek: number,
  oneMonth: number,
  threeMonth: number
): number {
  // Weight recent performance more heavily
  const weights = { oneWeek: 0.4, oneMonth: 0.35, threeMonth: 0.25 };
  
  // Normalize each component to 0-100 scale
  // Assuming typical range of -20% to +20% relative strength
  const normalize = (value: number): number => {
    const normalized = ((value + 0.2) / 0.4) * 100;
    return Math.min(100, Math.max(0, normalized));
  };
  
  const score = 
    normalize(oneWeek) * weights.oneWeek +
    normalize(oneMonth) * weights.oneMonth +
    normalize(threeMonth) * weights.threeMonth;
  
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Determine trend category based on momentum score
 */
function determineTrend(score: number): {
  trend: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  confidence: number;
} {
  if (score >= 80) {
    return { trend: 'strong_bullish', confidence: 85 + (score - 80) / 20 * 15 };
  } else if (score >= 60) {
    return { trend: 'bullish', confidence: 70 + (score - 60) / 20 * 15 };
  } else if (score >= 40) {
    return { trend: 'neutral', confidence: 50 + (score - 40) / 20 * 20 };
  } else if (score >= 20) {
    return { trend: 'bearish', confidence: 70 + (40 - score) / 20 * 15 };
  } else {
    return { trend: 'strong_bearish', confidence: 85 + (20 - score) / 20 * 15 };
  }
}

/**
 * Get sector momentum analysis for all sectors
 */
export async function getSectorMomentum(): Promise<SectorMomentum[]> {
  const { sectors, benchmark } = await fetchSectorQuotes();
  
  if (!benchmark) {
    throw new Error(`Benchmark ${BENCHMARK_SYMBOL} not found`);
  }
  
  const benchmarkPrice = benchmark.last || benchmark.close || 100;
  const benchmarkReturns = simulateHistoricalReturns(benchmarkPrice, BENCHMARK_SYMBOL);
  
  const sectorMomentums: SectorMomentum[] = [];
  
  for (const sector of SECTOR_ETFS) {
    const quote = sectors[sector.symbol];
    if (!quote) continue;
    
    const sectorPrice = quote.last || quote.close || 100;
    const sectorReturns = simulateHistoricalReturns(sectorPrice, sector.symbol);
    
    // Calculate relative strength vs benchmark
    const oneWeekRS = calculateRelativeStrength(sectorReturns.oneWeek, benchmarkReturns.oneWeek);
    const oneMonthRS = calculateRelativeStrength(sectorReturns.oneMonth, benchmarkReturns.oneMonth);
    const threeMonthRS = calculateRelativeStrength(sectorReturns.threeMonth, benchmarkReturns.threeMonth);
    
    // Calculate momentum score
    const momentumScore = calculateMomentumScore(oneWeekRS, oneMonthRS, threeMonthRS);
    
    // Determine trend
    const { trend, confidence } = determineTrend(momentumScore);
    
    sectorMomentums.push({
      symbol: sector.symbol,
      name: sector.name,
      oneWeek: oneWeekRS,
      oneMonth: oneMonthRS,
      threeMonth: threeMonthRS,
      momentumScore,
      rank: 0, // Will be set after sorting
      trend,
      confidence: Math.min(100, Math.max(0, confidence))
    });
  }
  
  // Sort by momentum score (highest first) and assign ranks
  sectorMomentums.sort((a, b) => b.momentumScore - a.momentumScore);
  sectorMomentums.forEach((sector, index) => {
    sector.rank = index + 1;
  });
  
  return sectorMomentums;
}

/**
 * Get top performing sectors
 * @param count Number of top sectors to return (default: 3)
 */
export async function getTopSectors(count: number = 3): Promise<SectorMomentum[]> {
  const allSectors = await getSectorMomentum();
  return allSectors.slice(0, Math.min(count, allSectors.length));
}

/**
 * Get bottom performing sectors
 * @param count Number of bottom sectors to return (default: 3)
 */
export async function getBottomSectors(count: number = 3): Promise<SectorMomentum[]> {
  const allSectors = await getSectorMomentum();
  return allSectors.slice(-Math.min(count, allSectors.length)).reverse();
}

/**
 * Get sector momentum for a specific sector
 */
export async function getSectorMomentumBySymbol(symbol: string): Promise<SectorMomentum | null> {
  const allSectors = await getSectorMomentum();
  return allSectors.find(s => s.symbol === symbol) || null;
}

/**
 * Get sector performance summary
 */
export async function getSectorPerformanceSummary(): Promise<{
  topPerformer: SectorMomentum;
  worstPerformer: SectorMomentum;
  averageMomentum: number;
  bullishSectors: number;
  bearishSectors: number;
}> {
  const allSectors = await getSectorMomentum();
  
  if (allSectors.length === 0) {
    throw new Error('No sector data available');
  }
  
  const topPerformer = allSectors[0];
  const worstPerformer = allSectors[allSectors.length - 1];
  
  const averageMomentum = allSectors.reduce((sum, s) => sum + s.momentumScore, 0) / allSectors.length;
  
  const bullishSectors = allSectors.filter(s => 
    s.trend === 'bullish' || s.trend === 'strong_bullish'
  ).length;
  
  const bearishSectors = allSectors.filter(s => 
    s.trend === 'bearish' || s.trend === 'strong_bearish'
  ).length;
  
  return {
    topPerformer,
    worstPerformer,
    averageMomentum: Math.round(averageMomentum * 10) / 10,
    bullishSectors,
    bearishSectors
  };
}

/**
 * Compare two sectors
 */
export async function compareSectors(symbol1: string, symbol2: string): Promise<{
  sector1: SectorMomentum;
  sector2: SectorMomentum;
  difference: {
    momentumScore: number;
    oneWeekRS: number;
    oneMonthRS: number;
    threeMonthRS: number;
  };
  recommendation: 'sector1' | 'sector2' | 'neutral';
}> {
  const sector1 = await getSectorMomentumBySymbol(symbol1);
  const sector2 = await getSectorMomentumBySymbol(symbol2);
  
  if (!sector1 || !sector2) {
    throw new Error('One or both sectors not found');
  }
  
  const momentumDiff = sector1.momentumScore - sector2.momentumScore;
  const oneWeekDiff = sector1.oneWeek - sector2.oneWeek;
  const oneMonthDiff = sector1.oneMonth - sector2.oneMonth;
  const threeMonthDiff = sector1.threeMonth - sector2.threeMonth;
  
  let recommendation: 'sector1' | 'sector2' | 'neutral' = 'neutral';
  
  if (momentumDiff > 10) {
    recommendation = 'sector1';
  } else if (momentumDiff < -10) {
    recommendation = 'sector2';
  }
  
  return {
    sector1,
    sector2,
    difference: {
      momentumScore: momentumDiff,
      oneWeekRS: oneWeekDiff,
      oneMonthRS: oneMonthDiff,
      threeMonthRS: threeMonthDiff
    },
    recommendation
  };
}

/**
 * Get sector rotation analysis
 * Identifies sectors gaining/losing momentum
 */
export async function getSectorRotation(): Promise<{
  gainingMomentum: SectorMomentum[];
  losingMomentum: SectorMomentum[];
  stableSectors: SectorMomentum[];
}> {
  const allSectors = await getSectorMomentum();
  
  // For demonstration, we'll simulate momentum changes
  // In production, compare with historical momentum data
  
  const gainingMomentum: SectorMomentum[] = [];
  const losingMomentum: SectorMomentum[] = [];
  const stableSectors: SectorMomentum[] = [];
  
  for (const sector of allSectors) {
    // Simulate momentum change based on current score
    // Sectors with high scores likely to continue gaining
    // Sectors with low scores likely to continue losing
    const momentumChange = (sector.momentumScore - 50) / 50; // -1 to +1
    
    if (momentumChange > 0.3) {
      gainingMomentum.push(sector);
    } else if (momentumChange < -0.3) {
      losingMomentum.push(sector);
    } else {
      stableSectors.push(sector);
    }
  }
  
  return { gainingMomentum, losingMomentum, stableSectors };
}