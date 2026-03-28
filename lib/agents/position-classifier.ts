// Cortex Capital - Position Classifier
// Determines which asset class playbook applies to each position
// Generates alerts for risky conditions (0 DTE, OTM strikes, theta decay)

import { AlpacaPosition } from '../integrations/alpaca';

export type Playbook = 
  | 'OPTIONS_SCALP'     // 0-1 DTE
  | 'OPTIONS_SWING'     // 2-14 DTE
  | 'OPTIONS_LEAPS'     // 45+ DTE
  | 'STOCKS_ACTIVE'     // Stocks - active trading
  | 'STOCKS_LONGTERM';  // Stocks - long-term hold

export interface ClassifiedPosition {
  symbol: string;
  playbook: Playbook;
  assetClass: 'option' | 'stock';
  
  // Option-specific fields
  dte?: number;  // days to expiry
  strike?: number;
  optionType?: 'call' | 'put';
  expiryDate?: Date;
  underlyingSymbol?: string;
  underlyingPrice?: number;
  
  // Greeks (if available - may need external data)
  theta?: number;
  delta?: number;
  
  // Position metrics
  entryPrice: number;
  currentPrice: number;
  unrealizedPnlPct: number;
  qty: number;
  marketValue: number;
  
  // Risk alerts
  alerts: string[];
}

/**
 * Parse OCC option symbol format: SPY260327C00660000
 * Format: SYMBOL + YYMMDD + C/P + STRIKE (8 digits with 3 decimal places)
 */
function parseOCCSymbol(symbol: string): {
  underlying: string;
  expiry: Date;
  type: 'call' | 'put';
  strike: number;
} | null {
  // OCC format: 6 chars for symbol, 6 for date (YYMMDD), 1 for C/P, 8 for strike
  // Example: SPY260327C00660000
  // But symbols can be shorter (AAPL) or longer
  
  const match = symbol.match(/^([A-Z]+)(\d{6})([CP])(\d{8})$/);
  if (!match) return null;
  
  const [, underlying, dateStr, typeChar, strikeStr] = match;
  
  // Parse date: YYMMDD
  const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(4, 6), 10);
  const expiry = new Date(year, month, day);
  
  // Parse strike: 8 digits with 3 decimals (00660000 = 660.000)
  const strike = parseInt(strikeStr, 10) / 1000;
  
  const type = typeChar === 'C' ? 'call' : 'put';
  
  return { underlying, expiry, type, strike };
}

/**
 * Calculate days to expiry (DTE)
 */
function calculateDTE(expiryDate: Date): number {
  const now = new Date();
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryUTC = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const dte = Math.floor((expiryUTC - nowUTC) / msPerDay);
  
  return Math.max(0, dte); // Never negative
}

/**
 * Classify position and generate alerts
 */
export function classifyPosition(
  position: AlpacaPosition,
  underlyingPrice?: number
): ClassifiedPosition {
  const symbol = position.symbol;
  const currentPrice = parseFloat(position.current_price);
  const entryPrice = parseFloat(position.avg_entry_price);
  const qty = parseFloat(position.qty);
  const marketValue = parseFloat(position.market_value);
  const unrealizedPnlPct = parseFloat(position.unrealized_plpc) * 100; // Convert to percentage
  
  const alerts: string[] = [];
  
  // Try to parse as option
  const optionData = parseOCCSymbol(symbol);
  
  if (optionData) {
    // It's an option
    const { underlying, expiry, type, strike } = optionData;
    const dte = calculateDTE(expiry);
    
    // Determine playbook based on DTE
    let playbook: Playbook;
    if (dte <= 1) {
      playbook = 'OPTIONS_SCALP';
    } else if (dte <= 14) {
      playbook = 'OPTIONS_SWING';
    } else if (dte >= 45) {
      playbook = 'OPTIONS_LEAPS';
    } else {
      // Gray zone: 15-44 DTE, default to swing
      playbook = 'OPTIONS_SWING';
    }
    
    // Generate alerts
    if (dte === 0) {
      alerts.push('⚠️ Expires TODAY');
    } else if (dte === 1) {
      alerts.push('⚠️ Expires tomorrow');
    }
    
    // Check if OTM (requires underlying price)
    if (underlyingPrice) {
      const distanceFromStrike = Math.abs(underlyingPrice - strike);
      const percentOTM = (distanceFromStrike / underlyingPrice) * 100;
      
      const isOTM = 
        (type === 'call' && underlyingPrice < strike) ||
        (type === 'put' && underlyingPrice > strike);
      
      if (isOTM && percentOTM > 5) {
        alerts.push(`⚠️ Strike $${strike.toFixed(2)} is ${percentOTM.toFixed(1)}% OTM`);
      }
      
      if (isOTM && percentOTM > 10) {
        alerts.push('⚠️ Extremely unlikely to hit strike');
      }
    }
    
    // Check hard stop
    if (unrealizedPnlPct <= -35) {
      alerts.push('⚠️ At hard stop (-35%)');
    }
    
    // Theta decay warning (rough estimate: 0DTE loses ~10%/hour after noon)
    if (dte === 0 && unrealizedPnlPct < 0) {
      alerts.push('⚠️ Theta eating position alive (0 DTE)');
    } else if (dte === 1 && unrealizedPnlPct < -20) {
      alerts.push('⚠️ Theta decay accelerating (1 DTE)');
    }
    
    // DTE transition warning
    if (dte === 2 && playbook === 'OPTIONS_SWING') {
      alerts.push('⚠️ DTE transition: will become scalp rules tomorrow');
    } else if (dte === 30 && playbook === 'OPTIONS_LEAPS') {
      alerts.push('⚠️ DTE transition: LEAP becoming swing position');
    }
    
    return {
      symbol,
      playbook,
      assetClass: 'option',
      dte,
      strike,
      optionType: type,
      expiryDate: expiry,
      underlyingSymbol: underlying,
      underlyingPrice,
      entryPrice,
      currentPrice,
      unrealizedPnlPct,
      qty,
      marketValue,
      alerts,
    };
  } else {
    // It's a stock
    // Default to active trading (can be overridden by user preference)
    const playbook: Playbook = 'STOCKS_ACTIVE';
    
    // Check hard stop for active trading
    if (unrealizedPnlPct <= -8) {
      alerts.push('⚠️ At hard stop (-8% for active stocks)');
    }
    
    // Warning if position is flat for too long (would need historical data)
    // For now, just basic alerts
    
    return {
      symbol,
      playbook,
      assetClass: 'stock',
      entryPrice,
      currentPrice,
      unrealizedPnlPct,
      qty,
      marketValue,
      alerts,
    };
  }
}

/**
 * Classify multiple positions
 */
export function classifyPositions(
  positions: AlpacaPosition[],
  underlyingPrices?: Map<string, number>
): ClassifiedPosition[] {
  return positions.map(position => {
    // Try to get underlying price if available
    let underlyingPrice: number | undefined;
    
    const optionData = parseOCCSymbol(position.symbol);
    if (optionData && underlyingPrices) {
      underlyingPrice = underlyingPrices.get(optionData.underlying);
    }
    
    return classifyPosition(position, underlyingPrice);
  });
}

// Helper: Get underlying symbols from positions
export function getUnderlyingSymbols(positions: AlpacaPosition[]): string[] {
  const underlyings = new Set<string>();
  
  for (const position of positions) {
    const optionData = parseOCCSymbol(position.symbol);
    if (optionData) {
      underlyings.add(optionData.underlying);
    }
  }
  
  return Array.from(underlyings);
}
