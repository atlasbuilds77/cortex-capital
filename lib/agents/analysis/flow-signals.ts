// Cortex Capital - Flow Signals
// Convert options flow into trading signals

import { 
  analyzeOptionsFlow, 
  Strike, 
  Bet, 
  FlowSentiment 
} from './options-flow';

export interface FlowSignal {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  unusualStrikes: Strike[];
  largeBets: Bet[];
  confidence: number; // 0-100
  reasons: string[];
  timestamp: string;
}

export interface FlowAnalysisResult {
  sentiment: string;
  unusualStrikes: Strike[];
  largeBets: Bet[];
  confidence: number;
}

/**
 * Analyze options flow and convert to trading signals
 * @param symbol - Stock ticker symbol
 * @returns Flow signal with confidence score
 */
export async function analyzeFlow(symbol: string): Promise<FlowAnalysisResult> {
  const flowAnalysis = await analyzeOptionsFlow(symbol);
  const { unusualVolume, largeBets, sentiment } = flowAnalysis;
  
  let confidence = 50; // Start with neutral confidence
  
  const reasons: string[] = [];
  
  // Calculate confidence based on signals
  if (unusualVolume.length > 0) {
    confidence += 10;
    reasons.push(`Found ${unusualVolume.length} unusual volume strikes`);
    
    // Check if unusual volume is concentrated in one direction
    const unusualCalls = unusualVolume.filter(s => s.type === 'call').length;
    const unusualPuts = unusualVolume.filter(s => s.type === 'put').length;
    
    if (unusualCalls > unusualPuts * 2) {
      confidence += 10;
      reasons.push(`Unusual volume heavily skewed to calls (${unusualCalls}:${unusualPuts})`);
    } else if (unusualPuts > unusualCalls * 2) {
      confidence += 10;
      reasons.push(`Unusual volume heavily skewed to puts (${unusualPuts}:${unusualCalls})`);
    }
  }
  
  if (largeBets.length > 0) {
    confidence += 15;
    reasons.push(`Found ${largeBets.length} large block trades`);
    
    // Check if large bets are concentrated in one direction
    const largeCallBets = largeBets.filter(b => b.type === 'call').length;
    const largePutBets = largeBets.filter(b => b.type === 'put').length;
    
    if (largeCallBets > largePutBets * 2) {
      confidence += 15;
      reasons.push(`Large blocks heavily skewed to calls (${largeCallBets}:${largePutBets})`);
    } else if (largePutBets > largeCallBets * 2) {
      confidence += 15;
      reasons.push(`Large blocks heavily skewed to puts (${largePutBets}:${largeCallBets})`);
    }
    
    // Check for very large blocks (> 1000 contracts)
    const veryLargeBets = largeBets.filter(b => b.contracts > 1000);
    if (veryLargeBets.length > 0) {
      confidence += 10;
      reasons.push(`Found ${veryLargeBets.length} very large blocks (>1000 contracts)`);
    }
  }
  
  // Check if signals align
  const callSignals = unusualVolume.filter(s => s.type === 'call').length + 
                     largeBets.filter(b => b.type === 'call').length;
  const putSignals = unusualVolume.filter(s => s.type === 'put').length + 
                    largeBets.filter(b => b.type === 'put').length;
  
  if (callSignals > 0 && putSignals === 0) {
    // All signals point to calls
    confidence += 20;
    reasons.push('All flow signals point to bullish direction');
  } else if (putSignals > 0 && callSignals === 0) {
    // All signals point to puts
    confidence += 20;
    reasons.push('All flow signals point to bearish direction');
  } else if (callSignals > 0 && putSignals > 0) {
    // Mixed signals - reduce confidence
    confidence -= 15;
    reasons.push('Mixed flow signals (both calls and puts showing activity)');
  }
  
  // Check volume strength
  if (sentiment.callVolume > 10000 || sentiment.putVolume > 10000) {
    confidence += 5;
    reasons.push('High absolute volume detected');
  }
  
  // Check premium flow
  const totalPremium = Math.abs(sentiment.netPremium);
  if (totalPremium > 1000000) { // $1M+ in premium flow
    confidence += 10;
    reasons.push(`Significant premium flow detected ($${(totalPremium / 1000000).toFixed(2)}M)`);
  }
  
  // Cap confidence at 0-100
  confidence = Math.max(0, Math.min(100, confidence));
  
  // Determine final sentiment (can override based on confidence)
  let finalSentiment = sentiment.sentiment;
  
  // If confidence is low (< 40), revert to neutral
  if (confidence < 40) {
    finalSentiment = 'neutral';
    reasons.push('Low confidence - insufficient signal strength');
  }
  
  // If confidence is very high (> 80) and signals are strong, reinforce sentiment
  if (confidence > 80) {
    if (finalSentiment === 'bullish') {
      reasons.push('High confidence bullish signal');
    } else if (finalSentiment === 'bearish') {
      reasons.push('High confidence bearish signal');
    }
  }
  
  return {
    sentiment: finalSentiment,
    unusualStrikes: unusualVolume,
    largeBets,
    confidence,
  };
}

/**
 * Generate a complete flow signal with metadata
 * @param symbol - Stock ticker symbol
 * @returns Complete flow signal
 */
export async function generateFlowSignal(symbol: string): Promise<FlowSignal> {
  const analysis = await analyzeFlow(symbol);
  
  return {
    symbol,
    sentiment: analysis.sentiment as 'bullish' | 'bearish' | 'neutral',
    unusualStrikes: analysis.unusualStrikes,
    largeBets: analysis.largeBets,
    confidence: analysis.confidence,
    reasons: [], // Would be populated in a more detailed implementation
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch analyze multiple symbols
 * @param symbols - Array of stock ticker symbols
 * @returns Array of flow signals
 */
export async function analyzeMultipleFlows(symbols: string[]): Promise<FlowAnalysisResult[]> {
  const results: FlowAnalysisResult[] = [];
  
  for (const symbol of symbols) {
    try {
      const result = await analyzeFlow(symbol);
      results.push(result);
    } catch (error) {
      console.error(`Error analyzing flow for ${symbol}:`, error);
      // Push neutral result on error
      results.push({
        sentiment: 'neutral',
        unusualStrikes: [],
        largeBets: [],
        confidence: 0,
      });
    }
  }
  
  return results;
}

/**
 * Filter signals by confidence threshold
 * @param signals - Array of flow analysis results
 * @param minConfidence - Minimum confidence score (0-100)
 * @returns Filtered signals
 */
export function filterSignalsByConfidence(
  signals: FlowAnalysisResult[], 
  minConfidence: number = 70
): FlowAnalysisResult[] {
  return signals.filter(signal => signal.confidence >= minConfidence);
}

/**
 * Rank signals by confidence
 * @param signals - Array of flow analysis results
 * @returns Ranked signals (highest confidence first)
 */
export function rankSignals(signals: FlowAnalysisResult[]): FlowAnalysisResult[] {
  return [...signals].sort((a, b) => b.confidence - a.confidence);
}

// Export types for use in other modules
export type { Strike, Bet };
