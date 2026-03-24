/**
 * CORTEX CAPITAL - AI PORTFOLIO BUILDER
 * Constructs custom portfolios based on preferences + tier
 * 
 * THE MAGIC:
 * - Tier 1 (Scout $49): Conservative ETF-only portfolios
 * - Tier 2 (Operator $99): ETFs + stocks + LEAPS on user picks
 * - Tier 3 (Partner $249): Everything + day trading + covered calls
 */

import type { UserPreferences, Sector, Theme, StockAnalysis } from './preferences';
import { TIER_CONFIG } from './preferences';
import { analyzeStocks, checkConcentrationRisk } from './stock-analyzer';

/**
 * PORTFOLIO ALLOCATION
 */
export interface PortfolioAllocation {
  symbol: string;
  name: string;
  type: 'ETF' | 'STOCK' | 'LEAP' | 'SPREAD' | 'COVERED_CALL';
  allocation_percentage: number;
  reasoning: string;
  sector?: string;
  theme?: string;
  is_custom_pick?: boolean;
}

/**
 * BUILT PORTFOLIO
 */
export interface BuiltPortfolio {
  tier: 'scout' | 'operator' | 'partner';
  risk_profile: string;
  allocations: PortfolioAllocation[];
  
  // Metrics
  expected_return: number;      // Annual % expected
  expected_volatility: number;  // Std deviation
  sharpe_ratio: number;
  max_drawdown: number;
  
  // Rebalancing
  rebalancing_frequency: string;
  next_rebalance: Date;
  
  // Options overlay (Tier 2-3)
  options_overlay?: {
    leaps_allocation: number;
    spreads_allocation?: number;
    covered_calls_allocation?: number;
  };
  
  // Day trading (Tier 3)
  day_trading_allocation?: number;
  
  // Validation
  validation: {
    concentration_risk: boolean;
    warnings: string[];
    suggestions: string[];
  };
}

/**
 * ETF UNIVERSE
 * Mapped to sectors/themes
 */
const ETF_DATABASE: Record<string, {
  symbol: string;
  name: string;
  sectors: Sector[];
  themes: Theme[];
  expense_ratio: number;
  yield: number;
}> = {
  // Broad market
  'SPY': {
    symbol: 'SPY',
    name: 'SPDR S&P 500',
    sectors: [],  // All sectors
    themes: ['value_investing', 'growth_investing'],
    expense_ratio: 0.0945,
    yield: 1.5,
  },
  'QQQ': {
    symbol: 'QQQ',
    name: 'Invesco QQQ (Nasdaq-100)',
    sectors: ['technology', 'consumer_discretionary'],
    themes: ['growth_investing', 'ai_and_ml', 'cloud_computing'],
    expense_ratio: 0.20,
    yield: 0.5,
  },
  'IWM': {
    symbol: 'IWM',
    name: 'iShares Russell 2000',
    sectors: [],
    themes: ['small_cap_growth', 'value_investing'],
    expense_ratio: 0.19,
    yield: 1.2,
  },
  
  // Technology
  'XLK': {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR',
    sectors: ['technology', 'semiconductors', 'cloud_computing'],
    themes: ['ai_and_ml', 'growth_investing'],
    expense_ratio: 0.10,
    yield: 0.8,
  },
  'SOXX': {
    symbol: 'SOXX',
    name: 'iShares Semiconductor ETF',
    sectors: ['semiconductors', 'technology'],
    themes: ['ai_and_ml', 'growth_investing'],
    expense_ratio: 0.35,
    yield: 0.6,
  },
  'HACK': {
    symbol: 'HACK',
    name: 'ETFMG Prime Cyber Security',
    sectors: ['cybersecurity', 'technology'],
    themes: ['cybersecurity', 'growth_investing'],
    expense_ratio: 0.60,
    yield: 0.0,
  },
  
  // Clean energy / EV
  'ICLN': {
    symbol: 'ICLN',
    name: 'iShares Global Clean Energy',
    sectors: ['clean_energy', 'utilities'],
    themes: ['renewable_energy', 'electric_vehicles'],
    expense_ratio: 0.42,
    yield: 0.5,
  },
  'LIT': {
    symbol: 'LIT',
    name: 'Global X Lithium & Battery Tech',
    sectors: ['ev_batteries', 'materials'],
    themes: ['electric_vehicles', 'renewable_energy'],
    expense_ratio: 0.75,
    yield: 0.3,
  },
  
  // Healthcare / Biotech
  'XLV': {
    symbol: 'XLV',
    name: 'Health Care Select Sector SPDR',
    sectors: ['healthcare'],
    themes: ['genomics', 'growth_investing'],
    expense_ratio: 0.10,
    yield: 1.5,
  },
  'IBB': {
    symbol: 'IBB',
    name: 'iShares Biotechnology ETF',
    sectors: ['biotechnology', 'healthcare'],
    themes: ['genomics', 'growth_investing'],
    expense_ratio: 0.45,
    yield: 0.0,
  },
  
  // Financials
  'XLF': {
    symbol: 'XLF',
    name: 'Financial Select Sector SPDR',
    sectors: ['financials'],
    themes: ['value_investing', 'fintech'],
    expense_ratio: 0.10,
    yield: 1.8,
  },
  
  // Dividends
  'SCHD': {
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity',
    sectors: ['consumer_staples', 'healthcare', 'financials'],
    themes: ['dividend_aristocrats', 'value_investing'],
    expense_ratio: 0.06,
    yield: 3.5,
  },
  'VYM': {
    symbol: 'VYM',
    name: 'Vanguard High Dividend Yield',
    sectors: ['financials', 'consumer_staples'],
    themes: ['dividend_aristocrats', 'value_investing'],
    expense_ratio: 0.06,
    yield: 3.0,
  },
  
  // Emerging / Crypto exposure
  'EEM': {
    symbol: 'EEM',
    name: 'iShares MSCI Emerging Markets',
    sectors: [],
    themes: ['emerging_markets'],
    expense_ratio: 0.68,
    yield: 2.5,
  },
  'BITO': {
    symbol: 'BITO',
    name: 'ProShares Bitcoin Strategy ETF',
    sectors: [],
    themes: ['crypto_exposure'],
    expense_ratio: 0.95,
    yield: 0.0,
  },
};

/**
 * TIER 1 - SCOUT ($49)
 * ETF-only portfolios
 * Quarterly rebalancing
 */
async function buildScoutPortfolio(prefs: UserPreferences): Promise<BuiltPortfolio> {
  const allocations: PortfolioAllocation[] = [];
  
  // Start with broad market base (40-60%)
  const broadMarketAllocation = prefs.risk_profile === 'conservative' ? 60 : 
                                 prefs.risk_profile === 'moderate' ? 50 : 40;
  
  allocations.push({
    symbol: 'SPY',
    name: ETF_DATABASE['SPY'].name,
    type: 'ETF',
    allocation_percentage: broadMarketAllocation,
    reasoning: 'Core broad market exposure',
  });
  
  // Add sector-specific ETFs based on preferences
  const remainingAllocation = 100 - broadMarketAllocation;
  const sectorETFs = findMatchingETFs(prefs.sectors, prefs.themes);
  
  const perSectorAllocation = remainingAllocation / Math.max(sectorETFs.length, 1);
  
  sectorETFs.forEach(etf => {
    allocations.push({
      symbol: etf.symbol,
      name: etf.name,
      type: 'ETF',
      allocation_percentage: perSectorAllocation,
      reasoning: `Matches your interest in ${etf.sectors.join(', ')}`,
    });
  });
  
  // Dividend preference
  if (prefs.dividend_preference === 'focus') {
    // Shift allocation toward dividend ETFs
    allocations.push({
      symbol: 'SCHD',
      name: ETF_DATABASE['SCHD'].name,
      type: 'ETF',
      allocation_percentage: 15,
      reasoning: 'Dividend focus per your preference',
    });
  }
  
  // Normalize allocations to 100%
  normalizeAllocations(allocations);
  
  return {
    tier: 'scout',
    risk_profile: prefs.risk_profile,
    allocations,
    expected_return: estimateReturn(allocations, prefs.risk_profile),
    expected_volatility: estimateVolatility(prefs.risk_profile),
    sharpe_ratio: 1.2,
    max_drawdown: prefs.risk_profile === 'conservative' ? -15 : -25,
    rebalancing_frequency: 'quarterly',
    next_rebalance: getNextRebalanceDate('quarterly'),
    validation: {
      concentration_risk: false,
      warnings: [],
      suggestions: [],
    },
  };
}

/**
 * TIER 2 - OPERATOR ($99)
 * ETFs + Stocks + LEAPS
 * Monthly rebalancing
 * ALLOWS CUSTOM PICKS
 */
async function buildOperatorPortfolio(prefs: UserPreferences): Promise<BuiltPortfolio> {
  const allocations: PortfolioAllocation[] = [];
  
  // Broad market ETF core (30-40%)
  allocations.push({
    symbol: 'SPY',
    name: ETF_DATABASE['SPY'].name,
    type: 'ETF',
    allocation_percentage: 35,
    reasoning: 'Stable core allocation',
  });
  
  // Sector ETFs (20-30%)
  const sectorETFs = findMatchingETFs(prefs.sectors, prefs.themes);
  const etfAllocation = 25 / Math.max(sectorETFs.length, 1);
  
  sectorETFs.forEach(etf => {
    allocations.push({
      symbol: etf.symbol,
      name: etf.name,
      type: 'ETF',
      allocation_percentage: etfAllocation,
      reasoning: `Sector exposure: ${etf.sectors.join(', ')}`,
    });
  });
  
  // CUSTOM PICKS (20-30%)
  if (prefs.must_have_stocks.length > 0) {
    // Analyze their picks
    const analyses = await analyzeStocks(prefs.must_have_stocks);
    
    const approvedPicks = Object.entries(analyses)
      .filter(([_, analysis]) => analysis.investable)
      .map(([symbol, analysis]) => ({ symbol, analysis }));
    
    const stockAllocation = 25 / Math.max(approvedPicks.length, 1);
    
    approvedPicks.forEach(({ symbol, analysis }) => {
      allocations.push({
        symbol,
        name: symbol,
        type: 'STOCK',
        allocation_percentage: stockAllocation,
        reasoning: `Your custom pick - Quality score: ${analysis.quality_score}/100`,
        is_custom_pick: true,
      });
    });
    
    // LEAPS on custom picks (if options_comfort = leaps_only or full_options)
    if (prefs.options_comfort !== 'none' && prefs.max_options_allocation > 0) {
      const leapsPicks = approvedPicks.filter(p => p.analysis.options.has_leaps);
      const leapsAllocation = Math.min(prefs.max_options_allocation, 20);
      const perLeapAllocation = leapsAllocation / Math.max(leapsPicks.length, 1);
      
      leapsPicks.forEach(({ symbol }) => {
        allocations.push({
          symbol,
          name: `${symbol} LEAP`,
          type: 'LEAP',
          allocation_percentage: perLeapAllocation,
          reasoning: 'LEAP option for leveraged exposure to your custom pick',
          is_custom_pick: true,
        });
      });
    }
  }
  
  // Normalize
  normalizeAllocations(allocations);
  
  // Check concentration risk
  const existingPortfolio = allocations.reduce((acc, a) => {
    acc[a.symbol] = a.allocation_percentage;
    return acc;
  }, {} as Record<string, number>);
  
  const concentrationCheck = checkConcentrationRisk(prefs.must_have_stocks, existingPortfolio);
  
  return {
    tier: 'operator',
    risk_profile: prefs.risk_profile,
    allocations,
    expected_return: estimateReturn(allocations, prefs.risk_profile) + 2, // LEAPS boost
    expected_volatility: estimateVolatility(prefs.risk_profile) + 5,
    sharpe_ratio: 1.4,
    max_drawdown: -35,
    rebalancing_frequency: 'monthly',
    next_rebalance: getNextRebalanceDate('monthly'),
    options_overlay: {
      leaps_allocation: prefs.max_options_allocation,
    },
    validation: {
      concentration_risk: concentrationCheck.risky,
      warnings: concentrationCheck.warnings,
      suggestions: [],
    },
  };
}

/**
 * TIER 3 - PARTNER ($249)
 * Everything + Full options + Day trading
 * Weekly rebalancing
 */
async function buildPartnerPortfolio(prefs: UserPreferences): Promise<BuiltPortfolio> {
  const allocations: PortfolioAllocation[] = [];
  
  // Smaller core (20%)
  allocations.push({
    symbol: 'SPY',
    name: ETF_DATABASE['SPY'].name,
    type: 'ETF',
    allocation_percentage: 20,
    reasoning: 'Conservative core',
  });
  
  // Custom picks (30%)
  if (prefs.must_have_stocks.length > 0) {
    const analyses = await analyzeStocks(prefs.must_have_stocks);
    const approvedPicks = Object.entries(analyses)
      .filter(([_, analysis]) => analysis.investable)
      .map(([symbol, analysis]) => ({ symbol, analysis }));
    
    const stockAllocation = 30 / Math.max(approvedPicks.length, 1);
    
    approvedPicks.forEach(({ symbol, analysis }) => {
      allocations.push({
        symbol,
        name: symbol,
        type: 'STOCK',
        allocation_percentage: stockAllocation,
        reasoning: `High-conviction pick - Score: ${analysis.quality_score}/100`,
        is_custom_pick: true,
      });
    });
  }
  
  // LEAPS (15%)
  if (prefs.must_have_stocks.length > 0) {
    const analyses = await analyzeStocks(prefs.must_have_stocks);
    const leapsPicks = Object.entries(analyses)
      .filter(([_, analysis]) => analysis.options.has_leaps)
      .map(([symbol]) => symbol);
    
    const perLeap = 15 / Math.max(leapsPicks.length, 1);
    leapsPicks.forEach(symbol => {
      allocations.push({
        symbol,
        name: `${symbol} LEAP`,
        type: 'LEAP',
        allocation_percentage: perLeap,
        reasoning: 'Long-term leveraged exposure',
        is_custom_pick: true,
      });
    });
  }
  
  // Spreads (10%)
  allocations.push({
    symbol: 'SPX',
    name: 'SPX Bull Call Spread',
    type: 'SPREAD',
    allocation_percentage: 10,
    reasoning: 'Defined-risk bullish position on S&P 500',
  });
  
  // Covered calls on holdings (15%)
  if (prefs.covered_calls_interest) {
    allocations.push({
      symbol: 'MULTI',
      name: 'Covered Call Overlay',
      type: 'COVERED_CALL',
      allocation_percentage: 15,
      reasoning: 'Generate additional income on existing positions',
    });
  }
  
  // Day trading allocation (10%)
  if (prefs.day_trading_interest) {
    allocations.push({
      symbol: 'CASH',
      name: 'Day Trading Reserve',
      type: 'STOCK',
      allocation_percentage: 10,
      reasoning: 'Reserved for intraday momentum plays',
    });
  }
  
  // Normalize
  normalizeAllocations(allocations);
  
  return {
    tier: 'partner',
    risk_profile: prefs.risk_profile,
    allocations,
    expected_return: estimateReturn(allocations, prefs.risk_profile) + 5, // Aggressive boost
    expected_volatility: estimateVolatility(prefs.risk_profile) + 10,
    sharpe_ratio: 1.6,
    max_drawdown: -50,
    rebalancing_frequency: 'weekly',
    next_rebalance: getNextRebalanceDate('weekly'),
    options_overlay: {
      leaps_allocation: 15,
      spreads_allocation: 10,
      covered_calls_allocation: 15,
    },
    day_trading_allocation: prefs.day_trading_interest ? 10 : 0,
    validation: {
      concentration_risk: false,
      warnings: ['High volatility expected with aggressive options overlay'],
      suggestions: ['Consider hedging with protective puts during high volatility'],
    },
  };
}

/**
 * MAIN BUILDER
 */
export async function buildPortfolio(
  prefs: UserPreferences,
  tier: 'scout' | 'operator' | 'partner'
): Promise<BuiltPortfolio> {
  switch (tier) {
    case 'scout':
      return buildScoutPortfolio(prefs);
    case 'operator':
      return buildOperatorPortfolio(prefs);
    case 'partner':
      return buildPartnerPortfolio(prefs);
  }
}

/**
 * HELPERS
 */

function findMatchingETFs(sectors: Sector[], themes: Theme[]): typeof ETF_DATABASE[string][] {
  const matches = Object.values(ETF_DATABASE).filter(etf => {
    const sectorMatch = sectors.some(s => etf.sectors.includes(s));
    const themeMatch = themes.some(t => etf.themes.includes(t));
    return sectorMatch || themeMatch;
  });
  
  return matches.slice(0, 4);  // Max 4 sector ETFs
}

function normalizeAllocations(allocations: PortfolioAllocation[]): void {
  const total = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  if (total === 0) return;
  
  allocations.forEach(a => {
    a.allocation_percentage = (a.allocation_percentage / total) * 100;
  });
}

function estimateReturn(allocations: PortfolioAllocation[], risk: string): number {
  // Base expected returns
  if (risk === 'conservative') return 7;
  if (risk === 'moderate') return 10;
  return 14;
}

function estimateVolatility(risk: string): number {
  if (risk === 'conservative') return 12;
  if (risk === 'moderate') return 18;
  return 25;
}

function getNextRebalanceDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    case 'quarterly':
      const nextQuarter = Math.ceil((now.getMonth() + 1) / 3) * 3;
      return new Date(now.getFullYear(), nextQuarter, 1);
    default:
      return now;
  }
}
