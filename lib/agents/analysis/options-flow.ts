// Cortex Capital - Options Flow Analysis
// Detect unusual options activity using Tradier API

import { getOptionsChain, TradierOption } from '../../integrations/tradier';
import { withRetry } from '../../errors';

export interface Strike {
  strike: number;
  type: 'call' | 'put';
  volume: number;
  openInterest: number;
  volumeToOpenInterest: number;
  lastPrice: number;
  bid: number;
  ask: number;
  impliedVolatility?: number;
}

export interface Bet {
  strike: number;
  type: 'call' | 'put';
  contracts: number;
  premium: number;
  timestamp: string;
  isBlockTrade: boolean;
  impliedVolatility?: number;
}

export interface FlowSentiment {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  callVolume: number;
  putVolume: number;
  netVolume: number;
  callPremium: number;
  putPremium: number;
  netPremium: number;
  unusualStrikes: Strike[];
  largeBets: Bet[];
}

/**
 * Fetch full options chain for a symbol
 * @param symbol - Stock ticker symbol
 * @returns Array of options with Greeks
 */
export async function getOptionsChainFull(symbol: string): Promise<TradierOption[]> {
  return withRetry(async () => {
    const chain = await getOptionsChain(symbol);
    return chain.options;
  });
}

/**
 * Detect unusual volume activity
 * Finds strikes with volume > 3x open interest
 * @param symbol - Stock ticker symbol
 * @returns Array of unusual strikes
 */
export async function detectUnusualVolume(symbol: string): Promise<Strike[]> {
  const options = await getOptionsChainFull(symbol);
  const unusualStrikes: Strike[] = [];

  for (const option of options) {
    // Skip options with no volume or open interest
    if (!option.volume || !option.open_interest || option.open_interest === 0) {
      continue;
    }

    const volumeToOI = option.volume / option.open_interest;
    
    // Volume > 3x open interest is considered unusual
    if (volumeToOI > 3) {
      unusualStrikes.push({
        strike: option.strike,
        type: option.type,
        volume: option.volume,
        openInterest: option.open_interest,
        volumeToOpenInterest: volumeToOI,
        lastPrice: option.last ?? option.close ?? 0,
        bid: option.bid,
        ask: option.ask,
        impliedVolatility: option.implied_volatility,
      });
    }
  }

  // Sort by most unusual (highest volume to OI ratio)
  return unusualStrikes.sort((a, b) => b.volumeToOpenInterest - a.volumeToOpenInterest);
}

/**
 * Detect large block trades (> 100 contracts)
 * @param symbol - Stock ticker symbol
 * @returns Array of large bets
 */
export async function detectLargeBets(symbol: string): Promise<Bet[]> {
  const options = await getOptionsChainFull(symbol);
  const largeBets: Bet[] = [];

  for (const option of options) {
    // Skip options with no volume
    const volume = option.volume || 0;
    if (volume === 0) {
      continue;
    }

    // Calculate average trade size (simplified - in reality we'd need time & sales data)
    // For now, we'll flag any option with volume > 100 contracts as potentially containing large blocks
    if (volume > 100) {
      const avgPrice = option.last ?? ((option.bid + option.ask) / 2);
      const premium = avgPrice * 100 * volume; // Premium = price * 100 * contracts
      
      largeBets.push({
        strike: option.strike,
        type: option.type,
        contracts: volume,
        premium,
        timestamp: new Date().toISOString(), // Current time since we don't have actual trade timestamps
        isBlockTrade: volume > 500, // > 500 contracts is definitely a block trade
        impliedVolatility: option.implied_volatility,
      });
    }
  }

  // Sort by largest contracts
  return largeBets.sort((a, b) => b.contracts - a.contracts);
}

/**
 * Calculate flow sentiment based on net call vs put volume
 * @param symbol - Stock ticker symbol
 * @returns Flow sentiment with metrics
 */
export async function getFlowSentiment(symbol: string): Promise<FlowSentiment> {
  const options = await getOptionsChainFull(symbol);
  
  let callVolume = 0;
  let putVolume = 0;
  let callPremium = 0;
  let putPremium = 0;
  
  for (const option of options) {
    const volume = option.volume || 0;
    if (volume === 0) continue;
    
    const avgPrice = option.last ?? ((option.bid + option.ask) / 2);
    const premium = avgPrice * 100 * volume;
    
    if (option.type === 'call') {
      callVolume += volume;
      callPremium += premium;
    } else {
      putVolume += volume;
      putPremium += premium;
    }
  }
  
  const netVolume = callVolume - putVolume;
  const netPremium = callPremium - putPremium;
  
  // Get unusual strikes and large bets for context
  const unusualStrikes = await detectUnusualVolume(symbol);
  const largeBets = await detectLargeBets(symbol);
  
  // Determine sentiment
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (netVolume > 0 && netPremium > 0) {
    sentiment = 'bullish';
  } else if (netVolume < 0 && netPremium < 0) {
    sentiment = 'bearish';
  }
  
  // Override with unusual activity if present
  if (unusualStrikes.length > 0 || largeBets.length > 0) {
    // Check if unusual activity is predominantly calls or puts
    const unusualCalls = unusualStrikes.filter(s => s.type === 'call').length;
    const unusualPuts = unusualStrikes.filter(s => s.type === 'put').length;
    
    if (unusualCalls > unusualPuts * 2) {
      sentiment = 'bullish';
    } else if (unusualPuts > unusualCalls * 2) {
      sentiment = 'bearish';
    }
  }
  
  return {
    sentiment,
    callVolume,
    putVolume,
    netVolume,
    callPremium,
    putPremium,
    netPremium,
    unusualStrikes,
    largeBets,
  };
}

/**
 * Get all flow analysis for a symbol
 * @param symbol - Stock ticker symbol
 * @returns Complete flow analysis
 */
export async function analyzeOptionsFlow(symbol: string): Promise<{
  unusualVolume: Strike[];
  largeBets: Bet[];
  sentiment: FlowSentiment;
}> {
  const [unusualVolume, largeBets, sentiment] = await Promise.all([
    detectUnusualVolume(symbol),
    detectLargeBets(symbol),
    getFlowSentiment(symbol),
  ]);
  
  return {
    unusualVolume,
    largeBets,
    sentiment,
  };
}

// Export types for use in other modules
export type { TradierOption };
