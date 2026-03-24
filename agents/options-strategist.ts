// Cortex Capital - OPTIONS STRATEGIST Agent
// Handles LEAPS selection, spreads, covered calls, and Greeks monitoring
// For moderate and ultra_aggressive profiles only

import { ProfileConfig, getProfileConfig, shouldIncludeOptions } from '../lib/profile-configs';
import { query } from '../integrations/database';
import { getOptionsChain } from '../integrations/tradier';

export type RiskProfile = 'conservative' | 'moderate' | 'ultra_aggressive';

export interface OptionPosition {
  symbol: string;
  type: 'LEAP' | 'covered_call' | 'bull_call_spread' | 'bear_call_spread';
  longStrike: number;
  shortStrike?: number; // For spreads
  expiry: Date;
  delta: number;
  theta: number;
  gamma: number;
  premiumPaid: number;
  premiumReceived?: number; // For covered calls/spreads
  quantity: number;
  currentPrice?: number;
  daysToExpiry: number;
}

export interface LeapsSelectionParams {
  stock: string;
  capital: number; // Capital allocated for this LEAP
  targetDelta: [number, number]; // Target delta range
  minDTE: number; // Minimum days to expiry
}

export interface CoveredCallParams {
  stockPosition: {
    symbol: string;
    shares: number;
    costBasis: number;
    currentPrice: number;
  };
  otmRange: [number, number]; // % OTM range
  dteRange: [number, number]; // Days to expiry range
}

export interface SpreadParams {
  symbol: string;
  outlook: 'bullish' | 'bearish' | 'neutral';
  capital: number;
  maxRisk: number;
}

export interface Greeks {
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
  impliedVolatility: number;
}

export class OptionsStrategist {
  private profile: RiskProfile;
  private config: ProfileConfig;
  
  constructor(profile: RiskProfile) {
    if (!shouldIncludeOptions(profile)) {
      throw new Error(`Options not supported for ${profile} profile`);
    }
    
    this.profile = profile;
    this.config = getProfileConfig(profile);
  }
  
  /**
   * Select LEAPS options for a given stock
   * Deep ITM (0.70-0.80 delta), 12+ months to expiry
   */
  async selectLeaps(params: LeapsSelectionParams): Promise<OptionPosition | null> {
    const { stock, capital, targetDelta, minDTE } = params;
    
    try {
      // Get options chain for the stock
      const chain = await getOptionsChain(stock);
      if (!chain || !chain.options) {
        console.warn(`[OPTIONS] No options chain available for ${stock}`);
        return null;
      }
      
      // Filter for LEAPS (long-dated calls)
      const now = new Date();
      
      const leaps = chain.options.filter(option => {
        if (!option.delta) return false;
        
        const expiry = new Date(option.expiration_date);
        const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          option.option_type === 'call' &&
          dte >= minDTE &&
          option.delta >= targetDelta[0] &&
          option.delta <= targetDelta[1] &&
          option.strike > 0
        );
      });
      
      if (leaps.length === 0) {
        console.warn(`[OPTIONS] No LEAPS found for ${stock} with delta ${targetDelta[0]}-${targetDelta[1]} and DTE >= ${minDTE}`);
        return null;
      }
      
      // Sort by delta closest to midpoint of target range
      const targetDeltaMid = (targetDelta[0] + targetDelta[1]) / 2;
      leaps.sort((a, b) => {
        const aDeltaDiff = Math.abs((a.delta || 0) - targetDeltaMid);
        const bDeltaDiff = Math.abs((b.delta || 0) - targetDeltaMid);
        return aDeltaDiff - bDeltaDiff;
      });
      
      const bestLeap = leaps[0];
      const expiry = new Date(bestLeap.expiration_date);
      const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate quantity based on capital
      const premium = bestLeap.ask || bestLeap.last || bestLeap.bid || 0;
      const maxQuantity = Math.floor(capital / (premium * 100)); // Options are 100 shares per contract
      const quantity = Math.max(1, Math.min(maxQuantity, 10)); // Limit to 10 contracts max
      
      return {
        symbol: stock,
        type: 'LEAP',
        longStrike: bestLeap.strike,
        expiry,
        delta: bestLeap.delta || 0,
        theta: bestLeap.theta || 0,
        gamma: bestLeap.gamma || 0,
        premiumPaid: premium * 100 * quantity,
        quantity,
        daysToExpiry: dte,
      };
    } catch (error) {
      console.error(`[OPTIONS] Error selecting LEAPS for ${stock}:`, error);
      return null;
    }
  }
  
  /**
   * Roll LEAPS when they have less than 90 days to expiry
   */
  async rollLeaps(position: OptionPosition, daysToExpiry: number = 90): Promise<OptionPosition | null> {
    if (position.type !== 'LEAP') {
      throw new Error('Can only roll LEAPS positions');
    }
    
    if (position.daysToExpiry > daysToExpiry) {
      console.log(`[OPTIONS] LEAP ${position.symbol} has ${position.daysToExpiry} DTE, no need to roll yet`);
      return null;
    }
    
    console.log(`[OPTIONS] Rolling LEAP ${position.symbol} (${position.daysToExpiry} DTE < ${daysToExpiry})`);
    
    // Select new LEAP with similar delta
    const targetDelta: [number, number] = [
      Math.max(0.70, position.delta - 0.05),
      Math.min(0.80, position.delta + 0.05),
    ];
    
    const newLeap = await this.selectLeaps({
      stock: position.symbol,
      capital: position.premiumPaid, // Use similar capital
      targetDelta,
      minDTE: 365,
    });
    
    if (!newLeap) {
      console.warn(`[OPTIONS] Failed to find replacement LEAP for ${position.symbol}`);
      return null;
    }
    
    console.log(`[OPTIONS] Found replacement LEAP: ${newLeap.longStrike} strike, ${newLeap.daysToExpiry} DTE, delta ${newLeap.delta}`);
    return newLeap;
  }
  
  /**
   * Generate covered calls for existing stock positions
   * 10-15% OTM, 30-45 DTE
   */
  async generateCoveredCalls(params: CoveredCallParams): Promise<OptionPosition | null> {
    const { stockPosition, otmRange, dteRange } = params;
    const { symbol, shares, currentPrice } = stockPosition;
    
    try {
      const chain = await getOptionsChain(symbol);
      if (!chain || !chain.options) {
        console.warn(`[OPTIONS] No options chain available for ${symbol}`);
        return null;
      }
      
      const now = new Date();
      const calls = chain.options.filter((option) => {
        if (option.option_type !== 'call') return false;
        
        const expiry = new Date(option.expiration_date);
        const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check DTE range
        if (dte < dteRange[0] || dte > dteRange[1]) return false;
        
        // Check OTM range
        const otmPercent = (option.strike - currentPrice) / currentPrice;
        return otmPercent >= otmRange[0] && otmPercent <= otmRange[1];
      });
      
      if (calls.length === 0) {
        console.warn(`[OPTIONS] No covered calls found for ${symbol} with OTM ${otmRange[0]}-${otmRange[1]}% and DTE ${dteRange[0]}-${dteRange[1]}`);
        return null;
      }
      
      // Sort by highest premium (bid price)
      calls.sort((a, b) => (b.bid || 0) - (a.bid || 0));
      
      const bestCall = calls[0];
      const expiry = new Date(bestCall.expiration_date);
      const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate max contracts based on shares (1 contract = 100 shares)
      const maxContracts = Math.floor(shares / 100);
      const quantity = Math.max(1, Math.min(maxContracts, 5)); // Limit to 5 contracts max
      
      return {
        symbol,
        type: 'covered_call',
        longStrike: bestCall.strike,
        expiry,
        delta: bestCall.delta || 0,
        theta: bestCall.theta || 0,
        gamma: bestCall.gamma || 0,
        premiumPaid: 0, // No premium paid for covered calls
        premiumReceived: (bestCall.bid || 0) * 100 * quantity,
        quantity,
        daysToExpiry: dte,
      };
    } catch (error) {
      console.error(`[OPTIONS] Error generating covered calls for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Create bull call spreads (defined risk, lower cost)
   */
  async createSpreads(params: SpreadParams): Promise<OptionPosition | null> {
    const { symbol, outlook, capital, maxRisk } = params;
    
    if (outlook !== 'bullish') {
      console.warn(`[OPTIONS] Only bullish spreads implemented for MVP`);
      return null;
    }
    
    try {
      const chain = await getOptionsChain(symbol);
      if (!chain || !chain.options) {
        console.warn(`[OPTIONS] No options chain available for ${symbol}`);
        return null;
      }
      
      const now = new Date();
      const calls = chain.options.filter((option) => {
        if (option.option_type !== 'call') return false;
        
        const expiry = new Date(option.expiration_date);
        const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Look for 30-60 DTE for spreads
        return dte >= 30 && dte <= 60;
      });
      
      if (calls.length < 2) {
        console.warn(`[OPTIONS] Not enough calls for spread on ${symbol}`);
        return null;
      }
      
      // Sort by strike price
      calls.sort((a, b) => a.strike - b.strike);
      
      // Find ITM/ATM call for long leg
      const longLeg = calls.find((call) => call.delta && call.delta >= 0.70);
      if (!longLeg) {
        console.warn(`[OPTIONS] No suitable long leg for ${symbol} spread`);
        return null;
      }
      
      // Find OTM call for short leg (10-20% higher strike)
      const targetStrike = longLeg.strike * 1.15; // 15% higher
      const shortLeg = calls.reduce((best, call) => {
        if (call.strike <= longLeg.strike) return best;
        const diff = Math.abs(call.strike - targetStrike);
        const bestDiff = best ? Math.abs(best.strike - targetStrike) : Infinity;
        return diff < bestDiff ? call : best;
      }, calls[0]);
      
      if (!shortLeg || shortLeg.strike <= longLeg.strike) {
        console.warn(`[OPTIONS] No suitable short leg for ${symbol} spread`);
        return null;
      }
      
      // Calculate spread cost
      const longCost = longLeg.ask || longLeg.last || longLeg.bid || 0;
      const shortCredit = shortLeg.bid || shortLeg.last || shortLeg.ask || 0;
      const spreadCost = (longCost - shortCredit) * 100; // Per contract
      
      if (spreadCost > maxRisk) {
        console.warn(`[OPTIONS] Spread cost $${spreadCost} exceeds max risk $${maxRisk}`);
        return null;
      }
      
      const maxContracts = Math.floor(capital / spreadCost);
      const quantity = Math.max(1, Math.min(maxContracts, 10)); // Limit to 10 spreads max
      
      const expiry = new Date(longLeg.expiration_date);
      const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        symbol,
        type: 'bull_call_spread',
        longStrike: longLeg.strike,
        shortStrike: shortLeg.strike,
        expiry,
        delta: (longLeg.delta || 0) - (shortLeg.delta || 0),
        theta: (longLeg.theta || 0) + (shortLeg.theta || 0), // Positive theta for credit spreads
        gamma: (longLeg.gamma || 0) - (shortLeg.gamma || 0),
        premiumPaid: spreadCost * quantity,
        quantity,
        daysToExpiry: dte,
      };
    } catch (error) {
      console.error(`[OPTIONS] Error creating spread for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Monitor Greeks for options positions
   */
  async monitorGreeks(positions: OptionPosition[]): Promise<Map<string, Greeks>> {
    const greeksMap = new Map<string, Greeks>();
    
    for (const position of positions) {
      try {
        const chain = await getOptionsChain(position.symbol);
        if (!chain || !chain.options) continue;
        
        const now = new Date();
        const option = chain.options.find((opt) => {
          if (opt.option_type !== 'call') return false;
          if (opt.strike !== position.longStrike) return false;
          
          const expiry = new Date(opt.expiration_date);
          return expiry.getTime() === position.expiry.getTime();
        });
        
        if (option) {
          greeksMap.set(position.symbol, {
            delta: option.delta || 0,
            theta: option.theta || 0,
            gamma: option.gamma || 0,
            vega: option.vega || 0,
            impliedVolatility: option.implied_volatility || 0,
          });
        }
      } catch (error) {
        console.error(`[OPTIONS] Error monitoring Greeks for ${position.symbol}:`, error);
      }
    }
    
    return greeksMap;
  }
  
  /**
   * Get all open options positions for a user
   */
  async getOpenPositions(userId: string): Promise<OptionPosition[]> {
    try {
      const result = await query(
        `SELECT * FROM options_positions 
         WHERE user_id = $1 AND status = 'open'
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows.map(row => ({
        symbol: row.symbol,
        type: row.type as any,
        longStrike: parseFloat(row.long_strike),
        shortStrike: row.short_strike ? parseFloat(row.short_strike) : undefined,
        expiry: new Date(row.expiry),
        delta: parseFloat(row.delta),
        theta: parseFloat(row.theta),
        gamma: parseFloat(row.gamma),
        premiumPaid: parseFloat(row.premium_paid),
        premiumReceived: row.premium_received ? parseFloat(row.premium_received) : undefined,
        quantity: row.quantity,
        daysToExpiry: Math.ceil((new Date(row.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }));
    } catch (error) {
      console.error(`[OPTIONS] Error fetching open positions:`, error);
      return [];
    }
  }
  
  /**
   * Save option position to database
   */
  async savePosition(userId: string, position: OptionPosition): Promise<boolean> {
    try {
      await query(
        `INSERT INTO options_positions 
         (user_id, symbol, type, long_strike, short_strike, expiry, delta, theta, gamma, 
          premium_paid, premium_received, quantity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open')`,
        [
          userId,
          position.symbol,
          position.type,
          position.longStrike,
          position.shortStrike || null,
          position.expiry,
          position.delta,
          position.theta,
          position.gamma,
          position.premiumPaid,
          position.premiumReceived || null,
          position.quantity,
        ]
      );
      
      console.log(`[OPTIONS] Saved ${position.type} position for ${position.symbol}`);
      return true;
    } catch (error) {
      console.error(`[OPTIONS] Error saving position:`, error);
      return false;
    }
  }
  
  /**
   * Close option position
   */
  async closePosition(positionId: string, exitPrice: number): Promise<boolean> {
    try {
      await query(
        `UPDATE options_positions 
         SET status = 'closed', closed_at = NOW()
         WHERE id = $1`,
        [positionId]
      );
      
      console.log(`[OPTIONS] Closed position ${positionId} at $${exitPrice}`);
      return true;
    } catch (error) {
      console.error(`[OPTIONS] Error closing position:`, error);
      return false;
    }
  }
  
  /**
   * Generate options recommendations based on profile
   */
  async generateRecommendations(
    userId: string,
    portfolioValue: number,
    stockPositions: Array<{symbol: string; shares: number; currentPrice: number;}>
  ): Promise<{
    leaps: OptionPosition[];
    coveredCalls: OptionPosition[];
    spreads: OptionPosition[];
  }> {
    const recommendations = {
      leaps: [] as OptionPosition[],
      coveredCalls: [] as OptionPosition[],
      spreads: [] as OptionPosition[],
    };
    
    // Get profile-specific allocation
    const optionsAllocation = this.config.options;
    if (!optionsAllocation) return recommendations;
    
    // Generate LEAPS recommendations
    if (optionsAllocation.leaps) {
      const leapsAllocation = portfolioValue * optionsAllocation.leaps.maxAllocation;
      const capitalPerLeap = leapsAllocation / 3; // Split across 3 positions
      
      // Use top 3 stock positions for LEAPS
      const topStocks = stockPositions.slice(0, 3);
      for (const stock of topStocks) {
        const leap = await this.selectLeaps({
          stock: stock.symbol,
          capital: capitalPerLeap,
          targetDelta: optionsAllocation.leaps.deltaRange,
          minDTE: optionsAllocation.leaps.minDTE,
        });
        
        if (leap) {
          recommendations.leaps.push(leap);
        }
      }
    }
    
    // Generate covered call recommendations
    if (optionsAllocation.coveredCalls && stockPositions.length > 0) {
      for (const stock of stockPositions.slice(0, 5)) { // Limit to 5 positions
        const coveredCall = await this.generateCoveredCalls({
          stockPosition: {
            symbol: stock.symbol,
            shares: stock.shares,
            costBasis: 0, // Not needed for selection
            currentPrice: stock.currentPrice,
          },
          otmRange: optionsAllocation.coveredCalls.otmRange,
          dteRange: optionsAllocation.coveredCalls.dteRange,
        });
        
        if (coveredCall) {
          recommendations.coveredCalls.push(coveredCall);
        }
      }
    }
    
    // Generate spread recommendations
    if (optionsAllocation.spreads) {
      const spreadsAllocation = portfolioValue * optionsAllocation.spreads.maxAllocation;
      const capitalPerSpread = spreadsAllocation / 2; // Split across 2 spreads
      
      // Use stocks with high volatility for spreads
      const volatileStocks = stockPositions.slice(0, 2);
      for (const stock of volatileStocks) {
        const spread = await this.createSpreads({
          symbol: stock.symbol,
          outlook: 'bullish',
          capital: capitalPerSpread,
          maxRisk: optionsAllocation.spreads.maxRiskPerSpread,
        });
        
        if (spread) {
          recommendations.spreads.push(spread);
        }
      }
    }
    
    return recommendations;
  }
}

// Test function
export async function testOptionsStrategist() {
  console.log('Testing Options Strategist:');
  
  // Test moderate profile
  console.log('\n=== MODERATE PROFILE ===');
  const moderateStrategist = new OptionsStrategist('moderate');
  
  const leapsParams: LeapsSelectionParams = {
    stock: 'AAPL',
    capital: 5000,
    targetDelta: [0.70, 0.80],
    minDTE: 365,
  };
  
  console.log('Testing LEAPS selection...');
  const leap = await moderateStrategist.selectLeaps(leapsParams);
  if (leap) {
    console.log(`Selected LEAP: ${leap.symbol} ${leap.longStrike} strike, ${leap.daysToExpiry} DTE`);
    console.log(`Delta: ${leap.delta}, Theta: ${leap.theta}, Cost: $${leap.premiumPaid}`);
  } else {
    console.log('No LEAP found (likely mock data)');
  }
  
  // Test ultra aggressive profile
  console.log('\n=== ULTRA AGGRESSIVE PROFILE ===');
  const aggressiveStrategist = new OptionsStrategist('ultra_aggressive');
  
  const coveredCallParams: CoveredCallParams = {
    stockPosition: {
      symbol: 'TSLA',
      shares: 100,
      costBasis: 180,
      currentPrice: 200,
    },
    otmRange: [0.10, 0.15],
    dteRange: [30, 45],
  };
  
  console.log('Testing covered call generation...');
  const coveredCall = await aggressiveStrategist.generateCoveredCalls(coveredCallParams);
  if (coveredCall) {
    console.log(`Covered call: ${coveredCall.symbol} ${coveredCall.longStrike} strike`);
    console.log(`Premium: $${coveredCall.premiumReceived}, DTE: ${coveredCall.daysToExpiry}`);
  } else {
    console.log('No covered call found (likely mock data)');
  }
  
  const spreadParams: SpreadParams = {
    symbol: 'NVDA',
    outlook: 'bullish',
    capital: 2000,
    maxRisk: 500,
  };
  
  console.log('Testing spread creation...');
  const spread = await aggressiveStrategist.createSpreads(spreadParams);
  if (spread) {
    console.log(`Bull call spread: ${spread.longStrike}/${spread.shortStrike}`);
    console.log(`Cost: $${spread.premiumPaid}, Delta: ${spread.delta}`);
  } else {
    console.log('No spread found (likely mock data)');
  }
  
  console.log('\n=== GREEKS MONITORING ===');
  const testPositions: OptionPosition[] = [];
  if (leap) testPositions.push(leap);
  if (coveredCall) testPositions.push(coveredCall);
  if (spread) testPositions.push(spread);
  
  if (testPositions.length > 0) {
    const greeks = await aggressiveStrategist.monitorGreeks(testPositions);
    console.log('Greeks monitoring complete');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOptionsStrategist().catch(console.error);
}