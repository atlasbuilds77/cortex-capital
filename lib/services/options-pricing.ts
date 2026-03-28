// Cortex Capital - Options Pricing Service
// Fetches and caches options chain data from Tradier

import { query } from '../integrations/database';
import { getOptionsChain as fetchOptionsChain } from '../integrations/tradier';

export interface OptionChain {
  symbol: string;
  expiry: Date;
  options: Array<{
    strike: number;
    option_type: 'call' | 'put';
    last: number;
    bid: number;
    ask: number;
    volume: number;
    open_interest: number;
    expiration_date: string;
    days_to_expiration: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    implied_volatility?: number;
    theoretical?: number;
  }>;
  underlying_price: number;
  volatility: number;
  updated_at: Date;
}

export class OptionsPricingService {
  private cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  /**
   * Get options chain for a symbol, with caching
   */
  async getOptionsChain(symbol: string, expiry?: Date): Promise<OptionChain | null> {
    const symbolUpper = symbol.toUpperCase();
    
    try {
      // Check cache first
      const cached = await this.getCachedChain(symbolUpper, expiry);
      if (cached && this.isCacheValid(cached.updated_at)) {
        console.log(`[OPTIONS] Using cached chain for ${symbolUpper}`);
        return cached;
      }
      
      // Fetch from API
      console.log(`[OPTIONS] Fetching chain for ${symbolUpper} from API`);
      const chainData = await fetchOptionsChain(symbolUpper);
      if (!chainData) {
        console.warn(`[OPTIONS] No chain data for ${symbolUpper}`);
        return null;
      }
      
      // Transform to our format
      const chain: OptionChain = {
        symbol: symbolUpper,
        expiry: expiry || new Date(), // Will be set per option
        options: [],
        underlying_price: chainData.underlying_price || 0,
        volatility: chainData.volatility || 0,
        updated_at: new Date(),
      };
      
      // Process options
      if (chainData.options && chainData.options.length > 0) {
        for (const option of chainData.options) {
          const optionType = option.type === 'call' || option.type === 'put' ? option.type : 'call';
          chain.options.push({
            strike: parseFloat(String(option.strike)),
            option_type: optionType,
            last: parseFloat(String(option.last)) || 0,
            bid: parseFloat(String(option.bid)) || 0,
            ask: parseFloat(String(option.ask)) || 0,
            volume: parseInt(String(option.volume)) || 0,
            open_interest: parseInt(String(option.open_interest)) || 0,
            expiration_date: option.expiration_date,
            days_to_expiration: 0, // Calculate if needed
            delta: option.delta,
            gamma: option.gamma,
            theta: option.theta,
            vega: option.vega,
            implied_volatility: option.implied_volatility,
            theoretical: undefined, // Tradier doesn't provide theoretical value
          });
        }
      }
      
      // Cache the result
      await this.cacheChain(chain);
      
      return chain;
      
    } catch (error) {
      console.error(`[OPTIONS] Error fetching chain for ${symbolUpper}:`, error);
      
      // Try to return cached data even if expired
      const cached = await this.getCachedChain(symbolUpper, expiry);
      if (cached) {
        console.warn(`[OPTIONS] Using expired cache for ${symbolUpper}`);
        return cached;
      }
      
      return null;
    }
  }
  
  /**
   * Get specific option by strike and type
   */
  async getOption(
    symbol: string, 
    strike: number, 
    optionType: 'call' | 'put', 
    expiry: Date
  ) {
    const chain = await this.getOptionsChain(symbol);
    if (!chain || !chain.options) return null;
    
    const expiryStr = expiry.toISOString().split('T')[0];
    
    return chain.options.find(option => 
      option.strike === strike &&
      option.option_type === optionType &&
      option.expiration_date === expiryStr
    );
  }
  
  /**
   * Get all expiries for a symbol
   */
  async getExpiries(symbol: string): Promise<Date[]> {
    const chain = await this.getOptionsChain(symbol);
    if (!chain || !chain.options) return [];
    
    const expirySet = new Set<string>();
    chain.options.forEach(option => {
      expirySet.add(option.expiration_date);
    });
    
    return Array.from(expirySet)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());
  }
  
  /**
   * Get strikes for a specific expiry
   */
  async getStrikes(symbol: string, expiry: Date): Promise<number[]> {
    const chain = await this.getOptionsChain(symbol);
    if (!chain || !chain.options) return [];
    
    const expiryStr = expiry.toISOString().split('T')[0];
    const strikeSet = new Set<number>();
    
    chain.options.forEach(option => {
      if (option.expiration_date === expiryStr) {
        strikeSet.add(option.strike);
      }
    });
    
    return Array.from(strikeSet).sort((a, b) => a - b);
  }
  
  /**
   * Calculate option price using Black-Scholes (simplified)
   * In production, use a proper options pricing library
   */
  calculateTheoreticalPrice(
    underlyingPrice: number,
    strike: number,
    timeToExpiry: number, // in years
    volatility: number,
    riskFreeRate: number = 0.05,
    optionType: 'call' | 'put'
  ): number {
    // Simplified calculation - in production use proper Black-Scholes
    const intrinsicValue = optionType === 'call' 
      ? Math.max(0, underlyingPrice - strike)
      : Math.max(0, strike - underlyingPrice);
    
    const timeValue = volatility * underlyingPrice * Math.sqrt(timeToExpiry) * 0.4;
    
    return intrinsicValue + timeValue;
  }
  
  /**
   * Get implied volatility for an option
   */
  async getImpliedVolatility(
    symbol: string,
    strike: number,
    optionType: 'call' | 'put',
    expiry: Date,
    marketPrice: number
  ): Promise<number | null> {
    const option = await this.getOption(symbol, strike, optionType, expiry);
    if (option && option.implied_volatility) {
      return option.implied_volatility;
    }
    
    // Estimate if not available
    const chain = await this.getOptionsChain(symbol);
    if (chain && chain.volatility) {
      return chain.volatility;
    }
    
    // Default estimate
    return 0.3; // 30% IV
  }
  
  private async getCachedChain(symbol: string, expiry?: Date): Promise<OptionChain | null> {
    try {
      let queryStr = `SELECT * FROM options_chain_cache WHERE symbol = $1`;
      const params: any[] = [symbol];
      
      if (expiry) {
        queryStr += ` AND expiry = $2`;
        params.push(expiry);
      }
      
      const result = await query(queryStr, params);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        symbol: row.symbol,
        expiry: new Date(row.expiry),
        options: row.chain_data.options || [],
        underlying_price: row.chain_data.underlying_price || 0,
        volatility: row.chain_data.volatility || 0,
        updated_at: new Date(row.updated_at),
      };
    } catch (error) {
      console.error('[OPTIONS] Error getting cached chain:', error);
      return null;
    }
  }
  
  private async cacheChain(chain: OptionChain): Promise<boolean> {
    try {
      // Group options by expiry for caching
      const expiryMap = new Map<string, any[]>();
      
      chain.options.forEach(option => {
        const expiry = option.expiration_date;
        if (!expiryMap.has(expiry)) {
          expiryMap.set(expiry, []);
        }
        expiryMap.get(expiry)!.push(option);
      });
      
      // Cache each expiry separately
      for (const [expiryStr, options] of expiryMap) {
        const expiry = new Date(expiryStr);
        const chainData = {
          options,
          underlying_price: chain.underlying_price,
          volatility: chain.volatility,
        };
        
        await query(
          `INSERT INTO options_chain_cache (symbol, expiry, chain_data, fetched_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (symbol, expiry) DO UPDATE 
           SET chain_data = EXCLUDED.chain_data, fetched_at = EXCLUDED.fetched_at`,
          [chain.symbol, expiry, JSON.stringify(chainData)]
        );
      }
      
      return true;
    } catch (error) {
      console.error('[OPTIONS] Error caching chain:', error);
      return false;
    }
  }
  
  private isCacheValid(updatedAt: Date): boolean {
    const now = new Date();
    const age = now.getTime() - updatedAt.getTime();
    return age < this.cacheTTL;
  }
  
  /**
   * Clean up old cache entries
   */
  async cleanupCache(daysToKeep: number = 7): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM options_chain_cache 
         WHERE fetched_at < NOW() - INTERVAL '1 day' * $1 
         RETURNING COUNT(*) as deleted_count`,
        [Math.max(1, Math.min(365, Math.floor(Number(daysToKeep) || 7)))]
      );
      
      const deletedCount = parseInt(result.rows[0]?.deleted_count) || 0;
      console.log(`[OPTIONS] Cleaned up ${deletedCount} old cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('[OPTIONS] Error cleaning up cache:', error);
      return 0;
    }
  }
}

// Test function
export async function testOptionsPricing() {
  console.log('Testing Options Pricing Service:');
  
  const service = new OptionsPricingService();
  
  // Test getting options chain
  console.log('\n=== GETTING OPTIONS CHAIN ===');
  const chain = await service.getOptionsChain('AAPL');
  
  if (chain) {
    console.log(`Symbol: ${chain.symbol}`);
    console.log(`Underlying price: $${chain.underlying_price}`);
    console.log(`Volatility: ${(chain.volatility * 100).toFixed(1)}%`);
    console.log(`Options count: ${chain.options.length}`);
    
    // Show a few options
    console.log('\nSample options:');
    chain.options.slice(0, 3).forEach((option, i) => {
      console.log(`${i + 1}. ${option.option_type.toUpperCase()} ${option.strike}`);
      console.log(`   Last: $${option.last}, Bid: $${option.bid}, Ask: $${option.ask}`);
      console.log(`   DTE: ${option.days_to_expiration}, IV: ${(option.implied_volatility || 0) * 100}%`);
    });
  }
  
  // Test getting expiries
  console.log('\n=== GETTING EXPIRIES ===');
  const expiries = await service.getExpiries('AAPL');
  console.log(`Found ${expiries.length} expiries`);
  expiries.slice(0, 3).forEach((expiry, i) => {
    console.log(`${i + 1}. ${expiry.toDateString()}`);
  });
  
  // Test theoretical price calculation
  console.log('\n=== THEORETICAL PRICE CALCULATION ===');
  const theoreticalPrice = service.calculateTheoreticalPrice(
    180, // underlying
    185, // strike
    0.5, // 6 months
    0.25, // 25% volatility
    0.05, // 5% risk-free rate
    'call'
  );
  console.log(`Theoretical call price: $${theoreticalPrice.toFixed(2)}`);
  
  // Test cache cleanup
  console.log('\n=== CACHE CLEANUP ===');
  const cleaned = await service.cleanupCache(1);
  console.log(`Cleaned ${cleaned} cache entries`);
  
  console.log('\n=== OPTIONS PRICING TEST COMPLETE ===');
}

// Run test if this file is executed directly
if (require.main === module) {
  testOptionsPricing().catch(console.error);
}