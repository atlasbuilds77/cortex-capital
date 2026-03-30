// Cortex Capital - Smart Money Detector
// Identify potential institutional/smart money activity

import { 
  getOptionsChainFull, 
  TradierOption,
  Strike,
  Bet 
} from './options-flow';

export interface SmartMoneyDetection {
  detected: boolean;
  type: 'sweep' | 'accumulation' | 'hedge' | 'unknown';
  confidence: number; // 0-100
  details: string;
  evidence: string[];
  timestamp: string;
}

export interface SweepDetection {
  strikes: number[];
  type: 'call' | 'put';
  totalContracts: number;
  estimatedPremium: number;
  isAggressive: boolean; // True if buying at ask or selling at bid
}

export interface AccumulationDetection {
  strikes: number[];
  type: 'call' | 'put';
  totalContracts: number;
  daysToExpiry: number;
  isLEAPS: boolean; // True if > 1 year to expiry
}

export interface HedgeDetection {
  underlyingSymbol: string;
  hedgeRatio: number; // Estimated hedge ratio (options delta / shares)
  likelyStrategy: 'collar' | 'protective_put' | 'covered_call' | 'ratio_spread';
}

/**
 * Detect potential sweep orders (aggressive fills across multiple strikes)
 * @param symbol - Stock ticker symbol
 * @returns Sweep detection results
 */
export async function detectSweeps(symbol: string): Promise<SweepDetection[]> {
  const options = await getOptionsChainFull(symbol);
  const sweeps: SweepDetection[] = [];
  
  // Group options by expiry and type
  const byExpiry: Record<string, { calls: TradierOption[], puts: TradierOption[] }> = {};
  
  for (const option of options) {
    if (!option.expiration_date) continue;
    
    if (!byExpiry[option.expiration_date]) {
      byExpiry[option.expiration_date] = { calls: [], puts: [] };
    }
    
    if (option.type === 'call') {
      byExpiry[option.expiration_date].calls.push(option);
    } else {
      byExpiry[option.expiration_date].puts.push(option);
    }
  }
  
  // Look for sweep patterns in each expiry
  for (const [expiry, { calls, puts }] of Object.entries(byExpiry)) {
    // Check for call sweeps
    if (calls.length >= 3) {
      const activeCalls = calls.filter(c => c.volume && c.volume > 100);
      
      if (activeCalls.length >= 3) {
        // Look for consecutive strikes with high volume
        const sortedCalls = [...activeCalls].sort((a, b) => a.strike - b.strike);
        
        for (let i = 0; i < sortedCalls.length - 2; i++) {
          const strike1 = sortedCalls[i];
          const strike2 = sortedCalls[i + 1];
          const strike3 = sortedCalls[i + 2];
          
          // Check if strikes are consecutive and all have high volume
          const strikesConsecutive = 
            strike2.strike - strike1.strike === strike3.strike - strike2.strike &&
            Math.abs(strike2.strike - strike1.strike) <= 5; // Within $5 increments
          
          const allHighVolume = 
            strike1.volume! > 500 && 
            strike2.volume! > 500 && 
            strike3.volume! > 500;
          
          if (strikesConsecutive && allHighVolume) {
            const totalContracts = strike1.volume! + strike2.volume! + strike3.volume!;
            const avgPrice = (strike1.last || 0) + (strike2.last || 0) + (strike3.last || 0) / 3;
            const estimatedPremium = avgPrice * 100 * totalContracts;
            
            // Check if buying at ask (aggressive)
            const isAggressive = strike1.last! >= strike1.ask || 
                                strike2.last! >= strike2.ask || 
                                strike3.last! >= strike3.ask;
            
            sweeps.push({
              strikes: [strike1.strike, strike2.strike, strike3.strike],
              type: 'call',
              totalContracts,
              estimatedPremium,
              isAggressive,
            });
          }
        }
      }
    }
    
    // Check for put sweeps (same logic)
    if (puts.length >= 3) {
      const activePuts = puts.filter(p => p.volume && p.volume > 100);
      
      if (activePuts.length >= 3) {
        const sortedPuts = [...activePuts].sort((a, b) => a.strike - b.strike);
        
        for (let i = 0; i < sortedPuts.length - 2; i++) {
          const strike1 = sortedPuts[i];
          const strike2 = sortedPuts[i + 1];
          const strike3 = sortedPuts[i + 2];
          
          const strikesConsecutive = 
            strike2.strike - strike1.strike === strike3.strike - strike2.strike &&
            Math.abs(strike2.strike - strike1.strike) <= 5;
          
          const allHighVolume = 
            strike1.volume! > 500 && 
            strike2.volume! > 500 && 
            strike3.volume! > 500;
          
          if (strikesConsecutive && allHighVolume) {
            const totalContracts = strike1.volume! + strike2.volume! + strike3.volume!;
            const avgPrice = (strike1.last || 0) + (strike2.last || 0) + (strike3.last || 0) / 3;
            const estimatedPremium = avgPrice * 100 * totalContracts;
            
            const isAggressive = strike1.last! >= strike1.ask || 
                                strike2.last! >= strike2.ask || 
                                strike3.last! >= strike3.ask;
            
            sweeps.push({
              strikes: [strike1.strike, strike2.strike, strike3.strike],
              type: 'put',
              totalContracts,
              estimatedPremium,
              isAggressive,
            });
          }
        }
      }
    }
  }
  
  return sweeps;
}

/**
 * Detect LEAPS accumulation (long-dated options accumulation)
 * @param symbol - Stock ticker symbol
 * @returns Accumulation detection results
 */
export async function detectLEAPSAccumulation(symbol: string): Promise<AccumulationDetection[]> {
  const options = await getOptionsChainFull(symbol);
  const accumulations: AccumulationDetection[] = [];
  
  // Filter for LEAPS (options with > 1 year to expiry)
  const leaps = options.filter(option => {
    if (!option.expiration_date) return false;
    
    const expiryDate = new Date(option.expiration_date);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const volume = option.volume || 0;
    return daysToExpiry > 365 && volume > 100;
  });
  
  // Group by type (calls/puts)
  const leapsCalls = leaps.filter(o => o.type === 'call');
  const leapsPuts = leaps.filter(o => o.type === 'put');
  
  // Check for call LEAPS accumulation
  if (leapsCalls.length >= 2) {
    const highVolumeCalls = leapsCalls.filter(c => c.volume! > 500);
    
    if (highVolumeCalls.length >= 2) {
      const strikes = highVolumeCalls.map(c => c.strike);
      const totalContracts = highVolumeCalls.reduce((sum, c) => sum + c.volume!, 0);
      const avgDaysToExpiry = highVolumeCalls.reduce((sum, c) => {
        const expiryDate = new Date(c.expiration_date!);
        const today = new Date();
        return sum + Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / highVolumeCalls.length;
      
      accumulations.push({
        strikes,
        type: 'call',
        totalContracts,
        daysToExpiry: Math.round(avgDaysToExpiry),
        isLEAPS: true,
      });
    }
  }
  
  // Check for put LEAPS accumulation
  if (leapsPuts.length >= 2) {
    const highVolumePuts = leapsPuts.filter(p => p.volume! > 500);
    
    if (highVolumePuts.length >= 2) {
      const strikes = highVolumePuts.map(p => p.strike);
      const totalContracts = highVolumePuts.reduce((sum, p) => sum + p.volume!, 0);
      const avgDaysToExpiry = highVolumePuts.reduce((sum, p) => {
        const expiryDate = new Date(p.expiration_date!);
        const today = new Date();
        return sum + Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / highVolumePuts.length;
      
      accumulations.push({
        strikes,
        type: 'put',
        totalContracts,
        daysToExpiry: Math.round(avgDaysToExpiry),
        isLEAPS: true,
      });
    }
  }
  
  return accumulations;
}

/**
 * Detect large OTM (out of the money) bets
 * @param symbol - Stock ticker symbol
 * @returns Array of large OTM bets
 */
export async function detectLargeOTMBets(symbol: string): Promise<Bet[]> {
  const options = await getOptionsChainFull(symbol);
  const largeOTMBets: Bet[] = [];
  
  // We need the underlying price to determine what's OTM
  // For simplicity, we'll use the first option's underlying price or assume
  // This would be better with actual stock price data
  const sampleOption = options.find(o => o.underlying);
  const underlyingPrice = sampleOption?.underlying ? 
    parseFloat(sampleOption.underlying) : 100; // Default fallback
  
  for (const option of options) {
    const volume = option.volume || 0;
    if (volume < 500) continue;
    
    const isOTM = option.type === 'call' ? 
      option.strike > underlyingPrice * 1.1 : // Call OTM if strike > 110% of current price
      option.strike < underlyingPrice * 0.9;  // Put OTM if strike < 90% of current price
    
    if (isOTM) {
      const avgPrice = option.last ?? ((option.bid + option.ask) / 2) ?? 0;
      const premium = avgPrice * 100 * volume;
      
      largeOTMBets.push({
        strike: option.strike,
        type: option.type,
        contracts: volume,
        premium,
        timestamp: new Date().toISOString(),
        isBlockTrade: volume > 1000,
        impliedVolatility: option.implied_volatility,
      });
    }
  }
  
  return largeOTMBets.sort((a, b) => b.contracts - a.contracts);
}

/**
 * Detect potential hedging activity
 * @param symbol - Stock ticker symbol
 * @returns Hedge detection results
 */
export async function detectHedgingActivity(symbol: string): Promise<HedgeDetection[]> {
  const options = await getOptionsChainFull(symbol);
  const hedges: HedgeDetection[] = [];
  
  // Look for collar-like patterns (long stock + long put + short call)
  // This is simplified - real detection would need position data
  
  // Check for protective puts (OTM puts with high volume)
  const otmPuts = options.filter(o => 
    o.type === 'put' && 
    o.volume && o.volume > 200 &&
    o.strike < 100 // Simplified OTM check
  );
  
  if (otmPuts.length > 0) {
    const totalPutContracts = otmPuts.reduce((sum, p) => sum + p.volume!, 0);
    
    // Check if there are also covered calls (OTM calls)
    const otmCalls = options.filter(o => 
      o.type === 'call' && 
      o.volume && o.volume > 200 &&
      o.strike > 100 // Simplified OTM check
    );
    
    if (otmCalls.length > 0) {
      const totalCallContracts = otmCalls.reduce((sum, c) => sum + c.volume!, 0);
      
      // If puts and calls are roughly balanced, could be a collar
      const putCallRatio = totalPutContracts / totalCallContracts;
      if (putCallRatio > 0.5 && putCallRatio < 2) {
        hedges.push({
          underlyingSymbol: symbol,
          hedgeRatio: putCallRatio,
          likelyStrategy: 'collar',
        });
      }
    } else {
      // Just protective puts
      hedges.push({
        underlyingSymbol: symbol,
        hedgeRatio: 1, // Assuming 1:1 hedge
        likelyStrategy: 'protective_put',
      });
    }
  }
  
  // Check for covered calls (OTM calls with very high volume)
  const highVolumeCalls = options.filter(o => 
    o.type === 'call' && 
    o.volume && o.volume > 1000 &&
    o.strike > 100 // Simplified OTM check
  );
  
  if (highVolumeCalls.length > 0 && otmPuts.length === 0) {
    hedges.push({
      underlyingSymbol: symbol,
      hedgeRatio: 1, // Assuming 1:1 covered call
      likelyStrategy: 'covered_call',
    });
  }
  
  return hedges;
}

/**
 * Main smart money detection function
 * @param symbol - Stock ticker symbol
 * @returns Smart money detection results
 */
export async function detectSmartMoney(symbol: string): Promise<SmartMoneyDetection> {
  const evidence: string[] = [];
  let confidence = 0;
  let detectedType: 'sweep' | 'accumulation' | 'hedge' | 'unknown' = 'unknown';
  
  try {
    // Run all detection algorithms in parallel
    const [sweeps, accumulations, largeOTMBets, hedges] = await Promise.all([
      detectSweeps(symbol),
      detectLEAPSAccumulation(symbol),
      detectLargeOTMBets(symbol),
      detectHedgingActivity(symbol),
    ]);
    
    // Evaluate evidence
    if (sweeps.length > 0) {
      detectedType = 'sweep';
      confidence += 40;
      evidence.push(`Found ${sweeps.length} sweep patterns`);
      
      const aggressiveSweeps = sweeps.filter(s => s.isAggressive);
      if (aggressiveSweeps.length > 0) {
        confidence += 20;
        evidence.push(`${aggressiveSweeps.length} aggressive sweeps detected`);
      }
    }
    
    if (accumulations.length > 0) {
      if (detectedType === 'unknown') detectedType = 'accumulation';
      confidence += 30;
      evidence.push(`Found ${accumulations.length} LEAPS accumulation patterns`);
      
      const leapsAccumulations = accumulations.filter(a => a.isLEAPS);
      if (leapsAccumulations.length > 0) {
        confidence += 15;
        evidence.push(`${leapsAccumulations.length} LEAPS accumulations detected`);
      }
    }
    
    if (largeOTMBets.length > 0) {
      confidence += 25;
      evidence.push(`Found ${largeOTMBets.length} large OTM bets`);
      
      const veryLargeBets = largeOTMBets.filter(b => b.contracts > 1000);
      if (veryLargeBets.length > 0) {
        confidence += 15;
        evidence.push(`${veryLargeBets.length} very large OTM bets (>1000 contracts)`);
      }
    }
    
    if (hedges.length > 0) {
      if (detectedType === 'unknown') detectedType = 'hedge';
      confidence += 35;
      evidence.push(`Found ${hedges.length} potential hedging patterns`);
      
      // Check for complex hedges
      const complexHedges = hedges.filter(h => h.likelyStrategy === 'collar' || h.likelyStrategy === 'ratio_spread');
      if (complexHedges.length > 0) {
        confidence += 10;
        evidence.push(`${complexHedges.length} complex hedging strategies detected`);
      }
    }
    
    // Cap confidence
    confidence = Math.min(100, confidence);
    
    // Determine if smart money is detected
    const detected = confidence >= 50;
    
    if (!detected) {
      evidence.push('Insufficient evidence for smart money detection');
    }
    
    // Generate details summary
    let details = `Smart money analysis for ${symbol}: `;
    if (detected) {
      details += `Detected ${detectedType} activity with ${confidence}% confidence. `;
      details += evidence.join('; ');
    } else {
      details += `No strong smart money signals detected (confidence: ${confidence}%).`;
    }
    
    return {
      detected,
      type: detectedType,
      confidence,
      details,
      evidence,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error(`Error detecting smart money for ${symbol}:`, error);
    
    return {
      detected: false,
      type: 'unknown',
      confidence: 0,
      details: `Error analyzing smart money activity for ${symbol}: ${error}`,
      evidence: ['Analysis failed'],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Batch detect smart money across multiple symbols
 * @param symbols - Array of stock ticker symbols
 * @returns Array of smart money detections
 */
export async function detectSmartMoneyBatch(symbols: string[]): Promise<SmartMoneyDetection[]> {
  const detections: SmartMoneyDetection[] = [];
  
  for (const symbol of symbols) {
    try {
      const detection = await detectSmartMoney(symbol);
      detections.push(detection);
    } catch (error) {
      console.error(`Error in batch detection for ${symbol}:`, error);
      detections.push({
        detected: false,
        type: 'unknown',
        confidence: 0,
        details: `Error analyzing ${symbol}: ${error}`,
        evidence: ['Analysis failed'],
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return detections;
}

/**
 * Filter detections by confidence threshold
 * @param detections - Array of smart money detections
 * @param minConfidence - Minimum confidence score (0-100)
 * @returns Filtered detections
 */
export function filterDetectionsByConfidence(
  detections: SmartMoneyDetection[], 
  minConfidence: number = 60
): SmartMoneyDetection[] {
  return detections.filter(d => d.confidence >= minConfidence && d.detected);
}

/**
 * Rank detections by confidence
 * @param detections - Array of smart money detections
 * @returns Ranked detections (highest confidence first)
 */
export function rankDetections(detections: SmartMoneyDetection[]): SmartMoneyDetection[] {
  return [...detections].sort((a, b) => b.confidence - a.confidence);
}

// Export types for use in other modules
export type { Strike, Bet };