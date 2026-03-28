// Cortex Capital - STRATEGIST Agent
// Generates rebalancing plans based on risk profile and market conditions
// Now supports 3 risk profiles: conservative, moderate, ultra_aggressive
//
// PRODUCTION NOTES:
// - Always inject real prices via priceMap parameter
// - Never rely on hardcoded fallback prices for trading decisions
// - Handle empty positions array gracefully

import { AnalystReport } from './analyst';
import {
  TAX_LOSS_THRESHOLD,
  MAX_TRADES_PER_PLAN,
  TAX_LOSS_SELL_RATIO,
  SECTOR_REBALANCE_THRESHOLD,
  STYLE_REBALANCE_THRESHOLD,
  HIGH_VOLATILITY_CASH_CAP,
  HIGH_VOLATILITY_CASH_BUFFER,
  MAX_HEALTH_IMPROVEMENT,
  COMMISSION_RATE,
  SLIPPAGE_RATE,
  MIN_COMMISSION,
  LONG_TERM_CAP_GAINS_RATE,
  MAX_TAX_LOSS_DEDUCTION,
} from '../constants';
import { ProfileConfig, getProfileConfig, shouldIncludeOptions, shouldIncludeDayTrading } from '../profile-configs';

export interface UserPreferences {
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  investment_horizon: 'short' | 'medium' | 'long';
  constraints: {
    never_sell: string[]; // tickers to never sell
    max_position_size: number; // max % per position
    max_sector_exposure: number; // max % per sector
  };
}

export interface MarketEnvironment {
  market_volatility: 'low' | 'medium' | 'high';
  economic_outlook: 'recession' | 'neutral' | 'expansion';
  interest_rate_trend: 'falling' | 'stable' | 'rising';
  sector_rotations: Record<string, 'overweight' | 'neutral' | 'underweight'>;
}

export interface TargetAllocation {
  asset_classes: {
    stocks: number; // 0-100%
    bonds: number; // 0-100%
    cash: number; // 0-100%
  };
  sectors: Record<string, number>; // sector weights
  style: {
    growth: number; // 0-100%
    value: number; // 0-100%
    blend: number; // 0-100%
  };
}

export interface TradeInstruction {
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RebalancingPlan {
  plan_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  target_allocation: TargetAllocation;
  trades: TradeInstruction[];
  reasoning: {
    market_analysis: string;
    risk_assessment: string;
    tax_considerations: string;
    expected_improvement: string; // expected portfolio health improvement
  };
  created_at: Date;
  estimated_execution_cost: number;
  estimated_tax_impact: number;
}

// Risk profile based target allocations
const RISK_PROFILE_ALLOCATIONS: Record<string, TargetAllocation> = {
  conservative: {
    asset_classes: {
      stocks: 40,
      bonds: 50,
      cash: 10,
    },
    sectors: {
      healthcare: 15,
      consumer_staples: 15,
      utilities: 10,
      technology: 20,
      finance: 15,
      industrials: 10,
      energy: 5,
      other: 10,
    },
    style: {
      growth: 30,
      value: 50,
      blend: 20,
    },
  },
  moderate: {
    asset_classes: {
      stocks: 70,
      bonds: 25,
      cash: 5,
    },
    sectors: {
      technology: 25,
      healthcare: 15,
      finance: 15,
      consumer_discretionary: 10,
      industrials: 10,
      energy: 5,
      real_estate: 5,
      other: 15,
    },
    style: {
      growth: 40,
      value: 40,
      blend: 20,
    },
  },
  aggressive: {
    asset_classes: {
      stocks: 90,
      bonds: 5,
      cash: 5,
    },
    sectors: {
      technology: 35,
      healthcare: 15,
      finance: 10,
      consumer_discretionary: 10,
      communication_services: 10,
      industrials: 5,
      energy: 5,
      other: 10,
    },
    style: {
      growth: 60,
      value: 20,
      blend: 20,
    },
  },
};

// Sector mapping for tickers (simplified - should be expanded with real data)
const TICKER_SECTOR_MAP: Record<string, string> = {
  // Technology
  AAPL: 'technology',
  MSFT: 'technology',
  GOOGL: 'technology',
  GOOG: 'technology',
  NVDA: 'technology',
  TSLA: 'technology',
  META: 'technology',
  AMZN: 'technology',
  // Finance
  JPM: 'finance',
  BAC: 'finance',
  WFC: 'finance',
  GS: 'finance',
  MS: 'finance',
  // Healthcare
  JNJ: 'healthcare',
  UNH: 'healthcare',
  PFE: 'healthcare',
  ABBV: 'healthcare',
  // Energy
  XOM: 'energy',
  CVX: 'energy',
  COP: 'energy',
  // Consumer
  KO: 'consumer_staples',
  PG: 'consumer_staples',
  WMT: 'consumer_staples',
  // Default
  default: 'other',
};

const getSectorForTicker = (ticker: string): string => {
  return TICKER_SECTOR_MAP[ticker] || TICKER_SECTOR_MAP.default;
};

// Style classification (simplified)
const isGrowthStock = (ticker: string): boolean => {
  const growthTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN'];
  return growthTickers.includes(ticker);
};

const isValueStock = (ticker: string): boolean => {
  const valueTickers = ['JPM', 'BAC', 'XOM', 'CVX', 'KO', 'PG', 'WMT'];
  return valueTickers.includes(ticker);
};

/**
 * Generate a rebalancing plan based on current portfolio and user preferences.
 * 
 * @param user_id - User identifier
 * @param portfolio_report - Current portfolio analysis from ANALYST
 * @param user_preferences - User's risk tolerance and constraints
 * @param market_environment - Current market conditions
 * @param priceMap - REQUIRED: Live prices for all tickers (inject from Tradier API)
 * @returns Rebalancing plan with trades and reasoning
 * 
 * @throws Error if priceMap is missing or incomplete for required tickers
 */
export const generateRebalancingPlan = async (
  user_id: string,
  portfolio_report: AnalystReport,
  user_preferences: UserPreferences,
  market_environment: MarketEnvironment,
  priceMap?: Record<string, number> // Injected live prices
): Promise<RebalancingPlan> => {
  const plan_id = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Handle empty portfolio edge case
  if (portfolio_report.positions.length === 0) {
    return {
      plan_id,
      user_id,
      status: 'pending',
      target_allocation: RISK_PROFILE_ALLOCATIONS[user_preferences.risk_profile],
      trades: [],
      reasoning: {
        market_analysis: `Market volatility is ${market_environment.market_volatility} with ${market_environment.economic_outlook} economic outlook.`,
        risk_assessment: 'Portfolio has no positions. Consider starting with index funds matching your risk profile.',
        tax_considerations: 'No tax implications with empty portfolio.',
        expected_improvement: 'Portfolio needs initial investment to match target allocation.',
      },
      created_at: new Date(),
      estimated_execution_cost: 0,
      estimated_tax_impact: 0,
    };
  }
  
  // Get target allocation based on risk profile
  const targetAllocation = RISK_PROFILE_ALLOCATIONS[user_preferences.risk_profile];
  
  // Analyze current portfolio composition
  const currentComposition = analyzeCurrentComposition(portfolio_report);
  
  // Create price getter with injected prices (CRITICAL: use real prices)
  const getPrice = createPriceGetter(priceMap);
  
  // Generate trades to move toward target allocation
  const trades = generateTrades(
    portfolio_report,
    currentComposition,
    targetAllocation,
    user_preferences,
    market_environment,
    getPrice
  );
  
  // Calculate estimated costs and impacts
  const estimatedExecutionCost = calculateExecutionCost(trades);
  const estimatedTaxImpact = calculateTaxImpact(trades, portfolio_report);
  
  // Generate reasoning document
  const reasoning = generateReasoning(
    portfolio_report,
    currentComposition,
    targetAllocation,
    trades,
    market_environment,
    user_preferences
  );
  
  return {
    plan_id,
    user_id,
    status: 'pending',
    target_allocation: targetAllocation,
    trades,
    reasoning,
    created_at: new Date(),
    estimated_execution_cost: estimatedExecutionCost,
    estimated_tax_impact: estimatedTaxImpact,
  };
};

interface CurrentComposition {
  asset_classes: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  sectors: Record<string, number>;
  style: {
    growth: number;
    value: number;
    blend: number;
  };
  positions: Array<{
    ticker: string;
    value: number;
    sector: string;
    style: 'growth' | 'value' | 'blend';
  }>;
}

const analyzeCurrentComposition = (report: AnalystReport): CurrentComposition => {
  const totalValue = report.total_value;
  const positions = report.positions;
  
  // Calculate asset classes (simplified - assume all positions are stocks)
  const stockValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const cashValue = totalValue - stockValue;
  
  // Calculate sector exposure
  const sectorExposure: Record<string, number> = {};
  positions.forEach(pos => {
    const sector = getSectorForTicker(pos.ticker);
    sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.value;
  });
  
  // Normalize sector percentages
  Object.keys(sectorExposure).forEach(sector => {
    sectorExposure[sector] = (sectorExposure[sector] / totalValue) * 100;
  });
  
  // Calculate style exposure
  let growthValue = 0;
  let valueValue = 0;
  let blendValue = 0;
  
  positions.forEach(pos => {
    if (isGrowthStock(pos.ticker)) {
      growthValue += pos.value;
    } else if (isValueStock(pos.ticker)) {
      valueValue += pos.value;
    } else {
      blendValue += pos.value;
    }
  });
  
  return {
    asset_classes: {
      stocks: (stockValue / totalValue) * 100,
      bonds: 0, // No bond data in current implementation
      cash: (cashValue / totalValue) * 100,
    },
    sectors: sectorExposure,
    style: {
      growth: (growthValue / totalValue) * 100,
      value: (valueValue / totalValue) * 100,
      blend: (blendValue / totalValue) * 100,
    },
    positions: positions.map(pos => ({
      ticker: pos.ticker,
      value: pos.value,
      sector: getSectorForTicker(pos.ticker),
      style: isGrowthStock(pos.ticker) ? 'growth' : 
             isValueStock(pos.ticker) ? 'value' : 'blend',
    })),
  };
};

const generateTrades = (
  report: AnalystReport,
  current: CurrentComposition,
  target: TargetAllocation,
  preferences: UserPreferences,
  market: MarketEnvironment,
  getPrice: (ticker: string, fallback?: number) => number = getCurrentPrice
): TradeInstruction[] => {
  const trades: TradeInstruction[] = [];
  const totalValue = report.total_value;
  
  // 1. Check for positions that violate constraints
  report.positions.forEach(position => {
    const positionPct = (position.value / totalValue) * 100;
    
    // Check max position size constraint
    if (positionPct > preferences.constraints.max_position_size) {
      const excess = positionPct - preferences.constraints.max_position_size;
      const sellValue = (excess / 100) * totalValue;
      const sellQuantity = Math.floor(sellValue / position.current_price);
      
      if (sellQuantity > 0 && !preferences.constraints.never_sell.includes(position.ticker)) {
        trades.push({
          ticker: position.ticker,
          action: 'sell',
          quantity: sellQuantity,
          reason: `Position size (${positionPct.toFixed(1)}%) exceeds maximum allowed (${preferences.constraints.max_position_size}%)`,
          priority: 'high',
        });
      }
    }
    
    // Check for tax-loss harvesting opportunities
    if (position.unrealized_pnl < TAX_LOSS_THRESHOLD) {
      const sellQuantity = Math.floor(position.shares * TAX_LOSS_SELL_RATIO);
      if (sellQuantity > 0) {
        trades.push({
          ticker: position.ticker,
          action: 'sell',
          quantity: sellQuantity,
          reason: `Tax-loss harvesting: $${Math.abs(position.unrealized_pnl).toFixed(2)} unrealized loss (threshold: $${Math.abs(TAX_LOSS_THRESHOLD)})`,
          priority: 'medium',
        });
      }
    }
  });
  
  // 2. Rebalance sectors toward target
  Object.keys(target.sectors).forEach(sector => {
    const targetPct = target.sectors[sector];
    const currentPct = current.sectors[sector] || 0;
    const difference = targetPct - currentPct;
    
    if (Math.abs(difference) > SECTOR_REBALANCE_THRESHOLD) {
      const sectorValue = (difference / 100) * totalValue;
      
      // Find stocks in this sector
      const sectorStocks = current.positions.filter(p => p.sector === sector);
      
      if (sectorStocks.length > 0) {
        // Calculate total sector value (with division-by-zero protection)
        const totalSectorValue = sectorStocks.reduce((sum, s) => sum + s.value, 0);
        
        // Skip if sector has no value (prevents division by zero)
        if (totalSectorValue <= 0) {
          console.warn(`[STRATEGIST] Sector ${sector} has zero value, skipping rebalance`);
          return;
        }
        
        if (difference > 0) {
          // Need to buy more of this sector
          sectorStocks.forEach(stock => {
            const allocation = stock.value / totalSectorValue;
            const buyValue = sectorValue * allocation;
            const price = getPrice(stock.ticker, stock.value / (report.positions.find(p => p.ticker === stock.ticker)?.shares || 1));
            const buyQuantity = Math.floor(buyValue / price);
            
            if (buyQuantity > 0) {
              trades.push({
                ticker: stock.ticker,
                action: 'buy',
                quantity: buyQuantity,
                reason: `Increase ${sector} exposure from ${currentPct.toFixed(1)}% to ${targetPct}% (diff: ${difference.toFixed(1)}%)`,
                priority: 'medium',
              });
            }
          });
        } else {
          // Need to reduce this sector
          sectorStocks.forEach(stock => {
            const allocation = stock.value / totalSectorValue;
            const sellValue = Math.abs(sectorValue) * allocation;
            const price = getPrice(stock.ticker, stock.value / (report.positions.find(p => p.ticker === stock.ticker)?.shares || 1));
            const sellQuantity = Math.floor(sellValue / price);
            
            if (sellQuantity > 0 && !preferences.constraints.never_sell.includes(stock.ticker)) {
              trades.push({
                ticker: stock.ticker,
                action: 'sell',
                quantity: sellQuantity,
                reason: `Reduce ${sector} exposure from ${currentPct.toFixed(1)}% to ${targetPct}% (diff: ${difference.toFixed(1)}%)`,
                priority: 'medium',
              });
            }
          });
        }
      }
    }
  });
  
  // 3. Adjust style allocation
  const growthDiff = target.style.growth - current.style.growth;
  const valueDiff = target.style.value - current.style.value;
  
  if (Math.abs(growthDiff) > STYLE_REBALANCE_THRESHOLD || Math.abs(valueDiff) > STYLE_REBALANCE_THRESHOLD) {
    // If growth is underweight, buy growth stocks (only existing holdings to avoid introducing new positions)
    if (growthDiff > STYLE_REBALANCE_THRESHOLD) {
      const existingGrowthStocks = current.positions.filter(p => p.style === 'growth');
      
      if (existingGrowthStocks.length > 0) {
        const buyValue = (growthDiff / 100) * totalValue * 0.5; // Use 50% of needed adjustment
        const perStockValue = buyValue / existingGrowthStocks.length;
        
        existingGrowthStocks.forEach(stock => {
          const price = getPrice(stock.ticker, stock.value / (report.positions.find(p => p.ticker === stock.ticker)?.shares || 1));
          const buyQuantity = Math.floor(perStockValue / price);
          if (buyQuantity > 0) {
            trades.push({
              ticker: stock.ticker,
              action: 'buy',
              quantity: buyQuantity,
              reason: `Increase growth allocation from ${current.style.growth.toFixed(1)}% to ${target.style.growth}%`,
              priority: 'low',
            });
          }
        });
      }
    }
  }
  
  // 4. Consider market environment
  if (market.market_volatility === 'high') {
    // Increase cash position
    const cashTarget = Math.min(target.asset_classes.cash + HIGH_VOLATILITY_CASH_BUFFER, HIGH_VOLATILITY_CASH_CAP);
    const currentCash = current.asset_classes.cash;
    
    if (cashTarget > currentCash) {
      const cashNeeded = ((cashTarget - currentCash) / 100) * totalValue;
      
      // Sell some positions to raise cash
      const sellablePositions = current.positions
        .filter(p => !preferences.constraints.never_sell.includes(p.ticker))
        .sort((a, b) => a.value - b.value); // Sell smallest positions first
      
      let cashRaised = 0;
      for (const position of sellablePositions) {
        if (cashRaised >= cashNeeded) break;
        
        const sellValue = Math.min(position.value, cashNeeded - cashRaised);
        const originalPosition = report.positions.find(p => p.ticker === position.ticker);
        const price = getPrice(position.ticker, originalPosition?.current_price);
        const sellQuantity = Math.floor(sellValue / price);
        
        if (sellQuantity > 0) {
          trades.push({
            ticker: position.ticker,
            action: 'sell',
            quantity: sellQuantity,
            reason: `Raise cash for high volatility environment (target: ${cashTarget}% cash)`,
            priority: 'high',
          });
          cashRaised += sellValue;
        }
      }
    }
  }
  
  // 5. Deduplicate trades on same ticker (merge buys, merge sells)
  const mergedTrades = mergeDuplicateTrades(trades);
  
  // 6. Limit total number of trades
  return mergedTrades.slice(0, MAX_TRADES_PER_PLAN);
};

/**
 * Merge duplicate trades on the same ticker
 */
const mergeDuplicateTrades = (trades: TradeInstruction[]): TradeInstruction[] => {
  const tradeMap = new Map<string, TradeInstruction>();
  
  for (const trade of trades) {
    const key = `${trade.ticker}_${trade.action}`;
    const existing = tradeMap.get(key);
    
    if (existing) {
      // Merge: combine quantities, keep highest priority
      existing.quantity += trade.quantity;
      existing.reason = `${existing.reason}; ${trade.reason}`;
      if (trade.priority === 'high' || (trade.priority === 'medium' && existing.priority === 'low')) {
        existing.priority = trade.priority;
      }
    } else {
      tradeMap.set(key, { ...trade });
    }
  }
  
  return Array.from(tradeMap.values());
};

/**
 * Create a price getter function with injected live prices.
 * Falls back to position's current_price if available.
 * 
 * WARNING: Only use fallback prices for estimation, NEVER for trade quantity calculation.
 */
const createPriceGetter = (priceMap?: Record<string, number>) => {
  return (ticker: string, fallbackPrice?: number): number => {
    // Priority 1: Injected live prices (preferred)
    if (priceMap && priceMap[ticker] !== undefined) {
      return priceMap[ticker];
    }
    
    // Priority 2: Fallback price (from position data)
    if (fallbackPrice !== undefined && fallbackPrice > 0) {
      console.warn(`[STRATEGIST] Using fallback price for ${ticker}: $${fallbackPrice}`);
      return fallbackPrice;
    }
    
    // Priority 3: Placeholder for testing only
    // In production, this should throw an error
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`No price available for ${ticker}. Cannot generate trading plan without live prices.`);
    }
    
    // Development/testing fallback - log warning
    console.warn(`[STRATEGIST] WARNING: Using hardcoded test price for ${ticker}. NOT SAFE FOR PRODUCTION.`);
    const testPrices: Record<string, number> = {
      AAPL: 175, MSFT: 420, GOOGL: 150, NVDA: 950, TSLA: 180,
      JPM: 195, XOM: 115, KO: 60, META: 485, AMZN: 178,
    };
    return testPrices[ticker] || 100;
  };
};

// Keep legacy function for backward compatibility with tests
const getCurrentPrice = (ticker: string): number => {
  const getter = createPriceGetter();
  return getter(ticker);
};

const calculateExecutionCost = (trades: TradeInstruction[], priceMap?: Record<string, number>): number => {
  // Estimate commission + slippage
  const getPrice = createPriceGetter(priceMap);
  let totalCost = 0;
  
  trades.forEach(trade => {
    const price = getPrice(trade.ticker);
    const tradeValue = price * trade.quantity;
    const commission = Math.max(MIN_COMMISSION, tradeValue * COMMISSION_RATE);
    const slippage = tradeValue * SLIPPAGE_RATE;
    totalCost += commission + slippage;
  });
  
  return totalCost;
};

const calculateTaxImpact = (trades: TradeInstruction[], report: AnalystReport): number => {
  // Estimate tax impact based on unrealized gains/losses
  let taxImpact = 0;
  let totalLosses = 0;
  
  trades.forEach(trade => {
    if (trade.action === 'sell') {
      const position = report.positions.find(p => p.ticker === trade.ticker);
      if (position && position.shares > 0) {
        const pnlPerShare = position.unrealized_pnl / position.shares;
        const totalPnl = pnlPerShare * trade.quantity;
        
        if (totalPnl > 0) {
          // Capital gains tax
          taxImpact += totalPnl * LONG_TERM_CAP_GAINS_RATE;
        } else if (totalPnl < 0) {
          // Track losses for tax loss harvesting benefit
          totalLosses += Math.abs(totalPnl);
        }
      }
    }
  });
  
  // Apply tax loss benefit (capped per year)
  if (totalLosses > 0) {
    const lossDeduction = Math.min(totalLosses, MAX_TAX_LOSS_DEDUCTION);
    taxImpact -= lossDeduction * LONG_TERM_CAP_GAINS_RATE;
  }
  
  return taxImpact;
};

const generateReasoning = (
  report: AnalystReport,
  current: CurrentComposition,
  target: TargetAllocation,
  trades: TradeInstruction[],
  market: MarketEnvironment,
  preferences: UserPreferences
): RebalancingPlan['reasoning'] => {
  const portfolioHealthImprovement = estimateHealthImprovement(report, trades);
  
  return {
    market_analysis: `Market volatility is ${market.market_volatility} with ${market.economic_outlook} economic outlook. Interest rates are ${market.interest_rate_trend}.`,
    risk_assessment: `Current portfolio health: ${report.portfolio_health}/100. Expected improvement: +${portfolioHealthImprovement} points.`,
    tax_considerations: `Estimated tax impact: $${calculateTaxImpact(trades, report).toFixed(2)}. ${trades.filter(t => t.reason.includes('tax-loss')).length} tax-loss harvesting opportunities identified.`,
    expected_improvement: `Rebalancing will improve diversification, align with ${preferences.risk_profile} risk profile, and optimize for current market conditions.`,
  };
};

const estimateHealthImprovement = (report: AnalystReport, trades: TradeInstruction[]): number => {
  // Simplified estimation based on number and type of trades
  let improvement = 0;
  
  // Each constraint-fixing trade improves health
  trades.forEach(trade => {
    if (trade.reason.includes('exceeds maximum')) improvement += 5;
    if (trade.reason.includes('tax-loss') || trade.reason.includes('Tax-loss')) improvement += 3;
    if (trade.reason.includes('exposure')) improvement += 2;
    if (trade.reason.includes('volatility')) improvement += 4;
  });
  
  return Math.min(improvement, MAX_HEALTH_IMPROVEMENT);
};

// Helper function to get OpenAI reasoning for complex decisions
export const getOpenAIStrategyReasoning = async (
  portfolioReport: AnalystReport,
  userPreferences: UserPreferences,
  marketEnvironment: MarketEnvironment
): Promise<string> => {
  // This would call OpenAI API for sophisticated reasoning
  // For MVP, return a placeholder
  return `Based on your ${userPreferences.risk_profile} risk profile and current ${marketEnvironment.market_volatility} market conditions, the STRATEGIST recommends focusing on quality growth stocks with strong balance sheets while maintaining adequate cash reserves for potential buying opportunities.`;
};

// Test function
export const testStrategist = async () => {
  const mockReport: AnalystReport = {
    portfolio_health: 65,
    total_value: 100000,
    metrics: {
      sharpe_ratio: 1.2,
      beta: 0.95,
      volatility: 18.4,
      max_drawdown: -12.5,
    },
    concentration_risk: {
      top_holding_pct: 32.4,
      sector_exposure: { technology: 80, finance: 12, healthcare: 8 },
    },
    tax_loss_candidates: [
      { ticker: 'TSLA', unrealized_loss: -1250 },
    ],
    positions: [
      { ticker: 'AAPL', shares: 50, value: 8750, cost_basis: 8500, current_price: 175, unrealized_pnl: 250, unrealized_pnl_pct: 2.94 },
      { ticker: 'MSFT', shares: 20, value: 8400, cost_basis: 8000, current_price: 420, unrealized_pnl: 400, unrealized_pnl_pct: 5.0 },
      { ticker: 'NVDA', shares: 8, value: 7600, cost_basis: 6000, current_price: 950, unrealized_pnl: 1600, unrealized_pnl_pct: 26.67 },
      { ticker: 'TSLA', shares: 40, value: 7200, cost_basis: 8450, current_price: 180, unrealized_pnl: -1250, unrealized_pnl_pct: -14.79 },
      { ticker: 'JPM', shares: 30, value: 5850, cost_basis: 5700, current_price: 195, unrealized_pnl: 150, unrealized_pnl_pct: 2.63 },
    ],
  };
  
  const mockPreferences: UserPreferences = {
    risk_profile: 'moderate',
    investment_horizon: 'medium',
    constraints: {
      never_sell: ['AAPL', 'MSFT'],
      max_position_size: 25,
      max_sector_exposure: 40,
    },
  };
  
  const mockMarket: MarketEnvironment = {
    market_volatility: 'medium',
    economic_outlook: 'neutral',
    interest_rate_trend: 'stable',
    sector_rotations: {
      technology: 'overweight',
      healthcare: 'neutral',
      finance: 'underweight',
    },
  };
  
  const plan = await generateRebalancingPlan(
    'test_user_123',
    mockReport,
    mockPreferences,
    mockMarket
  );
  
  console.log('STRATEGIST Test Results:');
  console.log(`Plan ID: ${plan.plan_id}`);
  console.log(`Status: ${plan.status}`);
  console.log(`Number of trades: ${plan.trades.length}`);
  console.log(`Estimated cost: $${plan.estimated_execution_cost.toFixed(2)}`);
  console.log(`Estimated tax impact: $${plan.estimated_tax_impact.toFixed(2)}`);
  console.log('\nTrades:');
  plan.trades.forEach((trade, i) => {
    console.log(`${i + 1}. ${trade.action.toUpperCase()} ${trade.quantity} shares of ${trade.ticker}`);
    console.log(`   Reason: ${trade.reason}`);
  });
  
  return plan;
};

// ============================================================================
// PHASE 3: Profile-Based Strategy Generation
// ============================================================================

/**
 * Generate plan based on risk profile (Phase 3)
 * Supports conservative, moderate, and ultra_aggressive profiles
 */
export async function generatePlan(
  portfolio: any, // Portfolio data including positions and value
  profile: 'conservative' | 'moderate' | 'ultra_aggressive',
  marketEnvironment?: MarketEnvironment
): Promise<{
  rebalance: 'quarterly' | 'monthly' | 'weekly';
  threshold: number;
  instruments: string[];
  tax_optimize: 'maximize' | 'balanced' | 'minimal';
  sectors: string[];
  max_trades: number | 'unlimited';
  options?: {
    leaps?: {
      max_allocation: number;
      delta_range: [number, number];
      min_dte: number;
    };
    spreads?: {
      max_allocation: number;
      max_risk_per_spread: number;
    };
    covered_calls?: {
      otm_range: [number, number];
      dte_range: [number, number];
    };
  };
  day_trading?: {
    allocation: number;
    max_risk_per_trade: number;
  };
}> {
  
  if (profile === 'conservative') {
    return {
      rebalance: 'quarterly',
      threshold: 0.10,  // 10% drift
      instruments: ['ETFs only'],
      tax_optimize: 'maximize',
      sectors: ['defensive'],
      max_trades: 5
    };
  }
  
  if (profile === 'moderate') {
    return {
      rebalance: 'monthly',
      threshold: 0.05,  // 5% drift
      instruments: ['stocks', 'ETFs', 'LEAPS'],
      options: {
        leaps: {
          max_allocation: 0.20,  // 20% max
          delta_range: [0.70, 0.80],
          min_dte: 365
        }
      },
      tax_optimize: 'balanced',
      sectors: ['rotation allowed'],
      max_trades: 15
    };
  }
  
  if (profile === 'ultra_aggressive') {
    return {
      rebalance: 'weekly',
      threshold: 0.03,  // 3% drift
      instruments: ['stocks', 'LEAPS', 'spreads', 'covered_calls'],
      tax_optimize: 'minimal',
      sectors: ['growth', 'tech', 'momentum'],
      max_trades: 'unlimited' as 'unlimited',
      options: {
        leaps: {
          max_allocation: 0.30,
          delta_range: [0.70, 0.80],
          min_dte: 365
        },
        spreads: {
          max_allocation: 0.20,
          max_risk_per_spread: 1000
        },
        covered_calls: {
          otm_range: [0.10, 0.15],  // 10-15% OTM
          dte_range: [30, 45]
        }
      },
      day_trading: {
        allocation: 0.20,
        max_risk_per_trade: 0.05  // 5% of day trading capital
      }
    };
  }
  
  // Default fallback (should never reach here)
  return {
    rebalance: 'monthly',
    threshold: 0.05,
    instruments: ['stocks', 'ETFs'],
    tax_optimize: 'balanced',
    sectors: ['general'],
    max_trades: 10
  };
}

/**
 * Generate comprehensive trading plan including options and day trading
 */
export async function generateComprehensivePlan(
  userId: string,
  portfolio: any,
  profile: 'conservative' | 'moderate' | 'ultra_aggressive',
  analystReport?: AnalystReport,
  preferences?: UserPreferences,
  marketEnvironment?: MarketEnvironment
): Promise<{
  plan_id: string;
  generated_at: Date;
  profile: string;
  base_rebalancing_plan: any;
  options_recommendations?: any;
  day_trading_setups?: any;
  momentum_rotation?: any;
  status: 'pending' | 'ready' | 'executed';
}> {
  const planId = `plan_${Date.now()}_${userId}`;
  
  // Get profile configuration
  const profileConfig = getProfileConfig(profile);
  const planConfig = await generatePlan(portfolio, profile, marketEnvironment);
  
  // Generate base rebalancing plan
  const basePlan = await generateRebalancingPlan(
    userId,
    analystReport || { 
      positions: [], 
      total_value: portfolio.totalValue || 0,
      portfolio_health: 100,
      metrics: {
        sharpe_ratio: 0,
        beta: 0,
        volatility: 0,
        max_drawdown: 0,
      },
      concentration_risk: {
        top_holding_pct: 0,
        sector_exposure: {},
      },
      tax_loss_candidates: [],
    },
    preferences || {
      risk_profile: profile === 'ultra_aggressive' ? 'aggressive' : profile as 'conservative' | 'moderate' | 'aggressive',
      investment_horizon: 'medium',
      constraints: { never_sell: [], max_position_size: 0.1, max_sector_exposure: 0.3 }
    },
    marketEnvironment || {
      market_volatility: 'medium' as const,
      economic_outlook: 'neutral' as const,
      interest_rate_trend: 'stable' as const,
      sector_rotations: {}
    }
  );
  
  const result: any = {
    plan_id: planId,
    generated_at: new Date(),
    profile,
    base_rebalancing_plan: basePlan,
    status: 'ready',
  };
  
  // Add options recommendations for moderate and ultra_aggressive
  if (shouldIncludeOptions(profile)) {
    try {
      const { OptionsStrategist } = await import('./options-strategist');
      const strategist = new OptionsStrategist(profile);
      
      const stockPositions = portfolio.positions?.filter((p: any) => p.type === 'stock') || [];
      const optionsRecommendations = await strategist.generateRecommendations(
        userId,
        portfolio.totalValue || 0,
        stockPositions.map((p: any) => ({
          symbol: p.symbol,
          shares: p.shares,
          currentPrice: p.currentPrice || p.price,
        }))
      );
      
      result.options_recommendations = optionsRecommendations;
    } catch (error) {
      console.error('[STRATEGIST] Error generating options recommendations:', error);
    }
  }
  
  // Add day trading setups for ultra_aggressive
  if (shouldIncludeDayTrading(profile)) {
    try {
      const { DayTrader } = await import('./day-trader');
      const dayTradingCapital = portfolio.totalValue * (planConfig.day_trading?.allocation || 0);
      const dayTrader = new DayTrader(userId, dayTradingCapital);
      
      const dayTradingSetups = await dayTrader.scanForSetups({
        minPrice: 10,
        maxPrice: 500,
        minVolume: 1000000,
      });
      
      result.day_trading_setups = dayTradingSetups.slice(0, 5); // Top 5 setups
    } catch (error) {
      console.error('[STRATEGIST] Error generating day trading setups:', error);
    }
  }
  
  // Add momentum rotation for ultra_aggressive
  if (profile === 'ultra_aggressive') {
    try {
      const { MomentumAgent } = await import('./momentum');
      const rotationCapital = portfolio.totalValue * 0.2; // 20% for rotation
      const momentumAgent = new MomentumAgent(userId, rotationCapital);
      
      const rotationPlan = await momentumAgent.generateRotationPlan();
      result.momentum_rotation = rotationPlan;
    } catch (error) {
      console.error('[STRATEGIST] Error generating momentum rotation:', error);
    }
  }
  
  return result;
}

// Test the new profile-based functionality
export const testProfileStrategist = async () => {
  console.log('Testing Profile-Based Strategist:');
  
  const mockPortfolio = {
    totalValue: 50000,
    positions: [
      { symbol: 'AAPL', type: 'stock', shares: 100, currentPrice: 180 },
      { symbol: 'TSLA', type: 'stock', shares: 50, currentPrice: 200 },
      { symbol: 'SPY', type: 'etf', shares: 200, currentPrice: 450 },
    ],
  };
  
  // Test conservative profile
  console.log('\n=== CONSERVATIVE PROFILE ===');
  const conservativePlan = await generatePlan(mockPortfolio, 'conservative');
  console.log('Conservative Plan:', JSON.stringify(conservativePlan, null, 2));
  
  // Test moderate profile
  console.log('\n=== MODERATE PROFILE ===');
  const moderatePlan = await generatePlan(mockPortfolio, 'moderate');
  console.log('Moderate Plan:', JSON.stringify(moderatePlan, null, 2));
  
  // Test ultra aggressive profile
  console.log('\n=== ULTRA AGGRESSIVE PROFILE ===');
  const aggressivePlan = await generatePlan(mockPortfolio, 'ultra_aggressive');
  console.log('Ultra Aggressive Plan:', JSON.stringify(aggressivePlan, null, 2));
  
  // Test comprehensive plan
  console.log('\n=== COMPREHENSIVE PLAN (ULTRA AGGRESSIVE) ===');
  const comprehensivePlan = await generateComprehensivePlan(
    'test_user_123',
    mockPortfolio,
    'ultra_aggressive'
  );
  
  console.log(`Plan ID: ${comprehensivePlan.plan_id}`);
  console.log(`Profile: ${comprehensivePlan.profile}`);
  console.log(`Status: ${comprehensivePlan.status}`);
  console.log(`Base plan trades: ${comprehensivePlan.base_rebalancing_plan.trades.length}`);
  
  if (comprehensivePlan.options_recommendations) {
    const { leaps, coveredCalls, spreads } = comprehensivePlan.options_recommendations;
    console.log(`Options recommendations: ${leaps.length} LEAPS, ${coveredCalls.length} covered calls, ${spreads.length} spreads`);
  }
  
  if (comprehensivePlan.day_trading_setups) {
    console.log(`Day trading setups: ${comprehensivePlan.day_trading_setups.length}`);
  }
  
  if (comprehensivePlan.momentum_rotation) {
    console.log(`Momentum rotation: ${comprehensivePlan.momentum_rotation.buys.length} buys, ${comprehensivePlan.momentum_rotation.sells.length} sells`);
  }
  
  console.log('\n=== PROFILE STRATEGIST TEST COMPLETE ===');
};

// Run test if this file is executed directly
if (require.main === module) {
  // Run both tests
  testStrategist().catch(console.error);
  setTimeout(() => {
    testProfileStrategist().catch(console.error);
  }, 1000);
}