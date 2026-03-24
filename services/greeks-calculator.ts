// Cortex Capital - Greeks Calculator Service
// Calculates and monitors option Greeks (delta, theta, gamma, vega)

import { query } from '../integrations/database';
import { OptionsPricingService } from './options-pricing';

export interface Greeks {
  delta: number;     // Price sensitivity to underlying
  theta: number;     // Time decay
  gamma: number;     // Delta sensitivity to underlying
  vega: number;      // Volatility sensitivity
  rho?: number;      // Interest rate sensitivity
  impliedVolatility: number;
  theoreticalPrice: number;
}

export interface GreeksHistory {
  timestamp: Date;
  underlyingPrice: number;
  greeks: Greeks;
}

export class GreeksCalculator {
  private pricingService: OptionsPricingService;
  
  constructor() {
    this.pricingService = new OptionsPricingService();
  }
  
  /**
   * Calculate Greeks for an option position
   */
  async calculateGreeks(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice?: number
  ): Promise<Greeks | null> {
    try {
      // Get option data
      const option = await this.pricingService.getOption(symbol, strike, optionType, expiry);
      if (!option) {
        console.warn(`[GREEKS] No option data for ${symbol} ${strike} ${optionType}`);
        return this.estimateGreeks(symbol, strike, optionType, expiry, underlyingPrice);
      }
      
      // Get underlying price if not provided
      let currentUnderlyingPrice = underlyingPrice;
      if (!currentUnderlyingPrice) {
        const chain = await this.pricingService.getOptionsChain(symbol);
        currentUnderlyingPrice = chain?.underlying_price || 0;
      }
      
      // Use provided Greeks or calculate
      const greeks: Greeks = {
        delta: option.delta || this.calculateDelta(symbol, strike, optionType, expiry, currentUnderlyingPrice),
        theta: option.theta || this.calculateTheta(symbol, strike, optionType, expiry, currentUnderlyingPrice),
        gamma: option.gamma || this.calculateGamma(symbol, strike, optionType, expiry, currentUnderlyingPrice),
        vega: option.vega || this.calculateVega(symbol, strike, optionType, expiry, currentUnderlyingPrice),
        impliedVolatility: option.implied_volatility || 0.3,
        theoreticalPrice: option.theoretical || option.last || 0,
      };
      
      return greeks;
      
    } catch (error) {
      console.error(`[GREEKS] Error calculating Greeks for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate Greeks for a portfolio of options
   */
  async calculatePortfolioGreeks(positions: Array<{
    symbol: string;
    strike: number;
    optionType: 'call' | 'put';
    expiry: Date;
    quantity: number;
    isLong: boolean; // true for long, false for short
  }>): Promise<{
    totalDelta: number;
    totalTheta: number;
    totalGamma: number;
    totalVega: number;
    positionGreeks: Map<string, Greeks>;
  }> {
    const positionGreeks = new Map<string, Greeks>();
    let totalDelta = 0;
    let totalTheta = 0;
    let totalGamma = 0;
    let totalVega = 0;
    
    for (const position of positions) {
      const key = `${position.symbol}_${position.strike}_${position.optionType}_${position.expiry.toISOString()}`;
      
      const greeks = await this.calculateGreeks(
        position.symbol,
        position.strike,
        position.optionType,
        position.expiry
      );
      
      if (greeks) {
        positionGreeks.set(key, greeks);
        
        // Adjust for quantity and direction
        const multiplier = position.isLong ? 1 : -1;
        const positionMultiplier = multiplier * position.quantity;
        
        totalDelta += greeks.delta * positionMultiplier;
        totalTheta += greeks.theta * positionMultiplier;
        totalGamma += greeks.gamma * positionMultiplier;
        totalVega += greeks.vega * positionMultiplier;
      }
    }
    
    return {
      totalDelta,
      totalTheta,
      totalGamma,
      totalVega,
      positionGreeks,
    };
  }
  
  /**
   * Monitor Greeks for options positions and log changes
   */
  async monitorAndLogGreeks(
    optionPositionId: string,
    userId: string,
    underlyingPrice: number
  ): Promise<boolean> {
    try {
      // Get option position
      const result = await query(
        `SELECT * FROM options_positions 
         WHERE id = $1 AND user_id = $2`,
        [optionPositionId, userId]
      );
      
      if (result.rows.length === 0) {
        console.warn(`[GREEKS] No position found for ID ${optionPositionId}`);
        return false;
      }
      
      const position = result.rows[0];
      const greeks = await this.calculateGreeks(
        position.symbol,
        parseFloat(position.long_strike),
        position.type.includes('call') ? 'call' : 'put',
        new Date(position.expiry),
        underlyingPrice
      );
      
      if (!greeks) {
        console.warn(`[GREEKS] Could not calculate Greeks for position ${optionPositionId}`);
        return false;
      }
      
      // Log to history
      await this.logGreeksHistory(optionPositionId, underlyingPrice, greeks);
      
      // Update position with latest Greeks
      await query(
        `UPDATE options_positions 
         SET delta = $1, theta = $2, gamma = $3, vega = $4
         WHERE id = $5`,
        [greeks.delta, greeks.theta, greeks.gamma, greeks.vega, optionPositionId]
      );
      
      console.log(`[GREEKS] Updated Greeks for ${position.symbol}: delta=${greeks.delta.toFixed(3)}, theta=${greeks.theta.toFixed(4)}`);
      return true;
      
    } catch (error) {
      console.error(`[GREEKS] Error monitoring Greeks:`, error);
      return false;
    }
  }
  
  /**
   * Get Greeks history for an option position
   */
  async getGreeksHistory(
    optionPositionId: string,
    limit: number = 100
  ): Promise<GreeksHistory[]> {
    try {
      const result = await query(
        `SELECT * FROM greeks_history 
         WHERE option_position_id = $1
         ORDER BY recorded_at DESC
         LIMIT $2`,
        [optionPositionId, limit]
      );
      
      return result.rows.map(row => ({
        timestamp: new Date(row.recorded_at),
        underlyingPrice: parseFloat(row.underlying_price),
        greeks: {
          delta: parseFloat(row.delta),
          theta: parseFloat(row.theta),
          gamma: parseFloat(row.gamma),
          vega: parseFloat(row.vega),
          impliedVolatility: parseFloat(row.implied_volatility),
          theoreticalPrice: 0, // Not stored in history
        },
      }));
    } catch (error) {
      console.error('[GREEKS] Error getting history:', error);
      return [];
    }
  }
  
  /**
   * Analyze Greeks risk for a portfolio
   */
  async analyzeRisk(portfolioGreeks: {
    totalDelta: number;
    totalTheta: number;
    totalGamma: number;
    totalVega: number;
  }): Promise<{
    deltaRisk: 'low' | 'medium' | 'high';
    thetaRisk: 'low' | 'medium' | 'high';
    gammaRisk: 'low' | 'medium' | 'high';
    vegaRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    // Delta risk analysis
    const deltaRisk = this.analyzeDeltaRisk(portfolioGreeks.totalDelta);
    if (deltaRisk === 'high') {
      recommendations.push('High delta exposure: Consider delta hedging with underlying or options');
    }
    
    // Theta risk analysis (positive theta is good for option sellers)
    const thetaRisk = this.analyzeThetaRisk(portfolioGreeks.totalTheta);
    if (thetaRisk === 'high' && portfolioGreeks.totalTheta < 0) {
      recommendations.push('High negative theta: Time decay is working against you');
    }
    
    // Gamma risk analysis
    const gammaRisk = this.analyzeGammaRisk(portfolioGreeks.totalGamma);
    if (gammaRisk === 'high') {
      recommendations.push('High gamma: Delta will change rapidly with price moves');
    }
    
    // Vega risk analysis
    const vegaRisk = this.analyzeVegaRisk(portfolioGreeks.totalVega);
    if (vegaRisk === 'high') {
      recommendations.push('High vega: Portfolio is sensitive to volatility changes');
    }
    
    return {
      deltaRisk,
      thetaRisk,
      gammaRisk,
      vegaRisk,
      recommendations,
    };
  }
  
  // Private calculation methods (simplified)
  private calculateDelta(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice: number
  ): number {
    // Simplified delta calculation
    // In production, use proper Black-Scholes
    
    const timeToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);
    const moneyness = underlyingPrice / strike;
    
    if (optionType === 'call') {
      // Call delta: 0 to 1
      if (moneyness >= 1.2) return 0.95; // Deep ITM
      if (moneyness <= 0.8) return 0.05; // Deep OTM
      return 0.5; // ATM
    } else {
      // Put delta: -1 to 0
      if (moneyness >= 1.2) return -0.05; // Deep OTM
      if (moneyness <= 0.8) return -0.95; // Deep ITM
      return -0.5; // ATM
    }
  }
  
  private calculateTheta(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice: number
  ): number {
    // Simplified theta calculation (daily time decay)
    // In production, use proper Black-Scholes
    
    const timeToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (timeToExpiry <= 0) return 0;
    
    // Theta increases as expiration approaches
    const baseTheta = -0.05; // $0.05 per day
    const timeFactor = 30 / timeToExpiry; // More decay near expiration
    
    return baseTheta * timeFactor;
  }
  
  private calculateGamma(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice: number
  ): number {
    // Simplified gamma calculation
    // Gamma is highest for ATM options near expiration
    
    const timeToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const moneyness = Math.abs(underlyingPrice / strike - 1);
    
    // Gamma peaks for ATM options
    const atmGamma = 0.1; // Base gamma for ATM
    const moneynessFactor = Math.exp(-moneyness * 10); // Decay with moneyness
    const timeFactor = 30 / timeToExpiry; // Increase near expiration
    
    return atmGamma * moneynessFactor * timeFactor;
  }
  
  private calculateVega(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice: number
  ): number {
    // Simplified vega calculation
    // Vega is sensitivity to 1% change in volatility
    
    const timeToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);
    const moneyness = Math.abs(underlyingPrice / strike - 1);
    
    // Vega increases with time to expiry
    const baseVega = 0.2; // $0.20 per 1% IV change
    const timeFactor = Math.sqrt(timeToExpiry);
    const moneynessFactor = Math.exp(-moneyness * 5); // Decay with moneyness
    
    return baseVega * timeFactor * moneynessFactor;
  }
  
  private estimateGreeks(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    underlyingPrice?: number
  ): Greeks {
    // Fallback estimation when no option data available
    const defaultUnderlyingPrice = 100;
    const currentPrice = underlyingPrice || defaultUnderlyingPrice;
    
    return {
      delta: this.calculateDelta(symbol, strike, optionType, expiry, currentPrice),
      theta: this.calculateTheta(symbol, strike, optionType, expiry, currentPrice),
      gamma: this.calculateGamma(symbol, strike, optionType, expiry, currentPrice),
      vega: this.calculateVega(symbol, strike, optionType, expiry, currentPrice),
      impliedVolatility: 0.3,
      theoreticalPrice: 5.0,
    };
  }
  
  private async logGreeksHistory(
    optionPositionId: string,
    underlyingPrice: number,
    greeks: Greeks
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO greeks_history 
         (option_position_id, recorded_at, underlying_price, delta, theta, gamma, vega, implied_volatility)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
        [
          optionPositionId,
          underlyingPrice,
          greeks.delta,
          greeks.theta,
          greeks.gamma,
          greeks.vega,
          greeks.impliedVolatility,
        ]
      );
    } catch (error) {
      console.error('[GREEKS] Error logging history:', error);
    }
  }
  
  private analyzeDeltaRisk(delta: number): 'low' | 'medium' | 'high' {
    const absDelta = Math.abs(delta);
    if (absDelta < 0.3) return 'low';
    if (absDelta < 0.7) return 'medium';
    return 'high';
  }
  
  private analyzeThetaRisk(theta: number): 'low' | 'medium' | 'high' {
    const absTheta = Math.abs(theta);
    if (absTheta < 10) return 'low';
    if (absTheta < 50) return 'medium';
    return 'high';
  }
  
  private analyzeGammaRisk(gamma: number): 'low' | 'medium' | 'high' {
    const absGamma = Math.abs(gamma);
    if (absGamma < 0.05) return 'low';
    if (absGamma < 0.15) return 'medium';
    return 'high';
  }
  
  private analyzeVegaRisk(vega: number): 'low' | 'medium' | 'high' {
    const absVega = Math.abs(vega);
    if (absVega < 20) return 'low';
    if (absVega < 100) return 'medium';
    return 'high';
  }
}

// Test function
export async function testGreeksCalculator() {
  console.log('Testing Greeks Calculator:');
  
  const calculator = new GreeksCalculator();
  
  // Test single option Greeks
  console.log('\n=== SINGLE OPTION GREEKS ===');
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1); // 1 year from now
  
  const greeks = await calculator.calculateGreeks(
    'AAPL',
    180,
    'call',
    expiry,
    185
  );
  
  if (greeks) {
    console.log(`AAPL 180 Call Greeks:`);
    console.log(`  Delta: ${greeks.delta.toFixed(3)}`);
    console.log(`  Theta: ${greeks.theta.toFixed(4)} (daily decay)`);
    console.log(`  Gamma: ${greeks.gamma.toFixed(4)}`);
    console.log(`  Vega: ${greeks.vega.toFixed(4)} (per 1% IV change)`);
    console.log(`  Implied Volatility: ${(greeks.impliedVolatility * 100).toFixed(1)}%`);
  }
  
  // Test portfolio Greeks
  console.log('\n=== PORTFOLIO GREEKS ===');
  const portfolio = [
    {
      symbol: 'AAPL',
      strike: 180,
      optionType: 'call' as const,
      expiry,
      quantity: 10,
      isLong: true,
    },
    {
      symbol: 'AAPL',
      strike: 185,
      optionType: 'call' as const,
      expiry,
      quantity: 5,
      isLong: false, // Short
    },
  ];
  
  const portfolioGreeks = await calculator.calculatePortfolioGreeks(portfolio);
  console.log(`Portfolio Greeks:`);
  console.log(`  Total Delta: ${portfolioGreeks.totalDelta.toFixed(3)}`);
  console.log(`  Total Theta: ${portfolioGreeks.totalTheta.toFixed(4)}`);
  console.log(`  Total Gamma: ${portfolioGreeks.totalGamma.toFixed(4)}`);
  console.log(`  Total Vega: ${portfolioGreeks.totalVega.toFixed(4)}`);
  
  // Test risk analysis
  console.log('\n=== RISK ANALYSIS ===');
  const riskAnalysis = await calculator.analyzeRisk(portfolioGreeks);
  console.log(`Risk Levels:`);
  console.log(`  Delta: ${riskAnalysis.deltaRisk}`);
  console.log(`  Theta: ${riskAnalysis.thetaRisk}`);
  console.log(`  Gamma: ${riskAnalysis.gammaRisk}`);
  console.log(`  Vega: ${riskAnalysis.vegaRisk}`);
  
  console.log('\nRecommendations:');
  riskAnalysis.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
  
  // Test Greeks history (simulated)
  console.log('\n=== GREEKS HISTORY (SIMULATED) ===');
  console.log('Greeks monitoring and logging would occur in production');
  
  console.log('\n=== GREEKS CALCULATOR TEST COMPLETE ===');
}

// Run test if this file is executed directly
if (require.main === module) {
  testGreeksCalculator().catch(console.error);
}