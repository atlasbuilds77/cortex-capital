/**
 * POSITION SIZING ENGINE
 * Calculates position size based on user's risk profile and account balance
 * 
 * Rules:
 * - Conservative: 3-5% per position, max 3 concurrent
 * - Moderate: 5-10% per position, max 4 concurrent
 * - Aggressive: 10-15% per position, max 5 concurrent
 * - Ultra Aggressive: 15-25% per position, max 6 concurrent
 * 
 * Also scales based on:
 * - Account size (smaller accounts get slightly larger % to be tradeable)
 * - Signal confidence (higher confidence = larger size within range)
 */

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';

interface PositionSizeConfig {
  minPercent: number;
  maxPercent: number;
  maxConcurrentPositions: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

const RISK_CONFIGS: Record<RiskProfile, PositionSizeConfig> = {
  conservative: {
    minPercent: 3,
    maxPercent: 5,
    maxConcurrentPositions: 3,
    stopLossPercent: 5,
    takeProfitPercent: 10,
  },
  moderate: {
    minPercent: 5,
    maxPercent: 10,
    maxConcurrentPositions: 4,
    stopLossPercent: 7,
    takeProfitPercent: 15,
  },
  aggressive: {
    minPercent: 10,
    maxPercent: 15,
    maxConcurrentPositions: 5,
    stopLossPercent: 10,
    takeProfitPercent: 25,
  },
  ultra_aggressive: {
    minPercent: 15,
    maxPercent: 25,
    maxConcurrentPositions: 6,
    stopLossPercent: 15,
    takeProfitPercent: 40,
  },
};

// Small account boost - accounts under $10k get a bump to make positions tradeable
const SMALL_ACCOUNT_THRESHOLD = 10000;
const SMALL_ACCOUNT_MULTIPLIER = 1.5; // 50% boost for small accounts

interface PositionSizeResult {
  positionPercent: number;
  positionDollars: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxRiskDollars: number; // Max loss if stop hit
  reasoning: string;
}

/**
 * Calculate position size for a user
 * 
 * @param accountBalance - User's account balance in dollars
 * @param riskProfile - User's risk profile
 * @param signalConfidence - Trade signal confidence (0-100)
 * @param currentPositions - Number of currently open positions
 */
export function calculatePositionSize(
  accountBalance: number,
  riskProfile: RiskProfile,
  signalConfidence: number = 70,
  currentPositions: number = 0
): PositionSizeResult {
  const config = RISK_CONFIGS[riskProfile];
  
  // Check if at max positions
  if (currentPositions >= config.maxConcurrentPositions) {
    return {
      positionPercent: 0,
      positionDollars: 0,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxRiskDollars: 0,
      reasoning: `At max concurrent positions (${config.maxConcurrentPositions}). Wait for exit before new entry.`,
    };
  }
  
  // Base position size from confidence (scale between min and max)
  const confidenceNormalized = Math.max(0, Math.min(100, signalConfidence)) / 100;
  let positionPercent = config.minPercent + 
    (config.maxPercent - config.minPercent) * confidenceNormalized;
  
  // Small account boost
  let smallAccountBoost = false;
  if (accountBalance < SMALL_ACCOUNT_THRESHOLD) {
    positionPercent = Math.min(
      positionPercent * SMALL_ACCOUNT_MULTIPLIER,
      config.maxPercent * SMALL_ACCOUNT_MULTIPLIER
    );
    smallAccountBoost = true;
  }
  
  // Cap at max percent
  positionPercent = Math.min(positionPercent, 30); // Never more than 30% regardless
  
  const positionDollars = accountBalance * (positionPercent / 100);
  const maxRiskDollars = positionDollars * (config.stopLossPercent / 100);
  
  let reasoning = `${riskProfile} profile: ${positionPercent.toFixed(1)}% position ($${positionDollars.toFixed(0)})`;
  if (smallAccountBoost) {
    reasoning += ` [small account boost applied]`;
  }
  reasoning += `. Stop: ${config.stopLossPercent}%, TP: ${config.takeProfitPercent}%. Max risk: $${maxRiskDollars.toFixed(0)}`;
  
  return {
    positionPercent,
    positionDollars,
    stopLossPercent: config.stopLossPercent,
    takeProfitPercent: config.takeProfitPercent,
    maxRiskDollars,
    reasoning,
  };
}

/**
 * Get position sizing config for display in UI
 */
export function getPositionSizeConfig(riskProfile: RiskProfile): PositionSizeConfig {
  return RISK_CONFIGS[riskProfile];
}

/**
 * Calculate position size for a specific dollar amount trade
 * Returns number of shares/contracts
 */
export function calculateQuantity(
  positionDollars: number,
  pricePerUnit: number,
  minQuantity: number = 1
): number {
  if (pricePerUnit <= 0) return 0;
  const qty = Math.floor(positionDollars / pricePerUnit);
  return Math.max(qty, qty >= 1 ? qty : 0);
}

// Example usage for Simon's account
// calculatePositionSize(7000, 'moderate', 75)
// Returns: { positionPercent: 11.25%, positionDollars: $787, ... }
