// Cortex Capital - Trade Executor Service
// Executes trades on Alpaca based on strategy recommendations
// Supports: Momentum rotation, LEAPS, day trading setups

import dotenv from 'dotenv';
import alpaca from '../integrations/alpaca';
import { query } from '../integrations/database';

dotenv.config();

// Types
interface TradeSignal {
  symbol: string;
  side: 'buy' | 'sell';
  quantity?: number;
  notional?: number; // Dollar amount instead of shares
  type: 'market' | 'limit';
  limit_price?: number;
  strategy: 'momentum' | 'leaps' | 'day_trade' | 'manual';
  reason: string;
  user_id?: string;
}

interface ExecutionResult {
  success: boolean;
  order_id?: string;
  symbol: string;
  side: string;
  quantity?: number;
  status?: string;
  error?: string;
  executed_at: string;
}

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || '10000'); // $10K max per position
const MAX_PORTFOLIO_ALLOCATION = parseFloat(process.env.MAX_PORTFOLIO_ALLOCATION || '0.25'); // 25% max

export class TradeExecutor {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // Execute a single trade
  async executeTrade(signal: TradeSignal): Promise<ExecutionResult> {
    const timestamp = new Date().toISOString();
    
    console.log(`[EXECUTOR] Processing ${signal.side} ${signal.symbol} (${signal.strategy})`);
    console.log(`[EXECUTOR] Reason: ${signal.reason}`);
    console.log(`[EXECUTOR] Dry run: ${DRY_RUN}`);
    
    // Validate signal
    const validation = await this.validateSignal(signal);
    if (!validation.valid) {
      return {
        success: false,
        symbol: signal.symbol,
        side: signal.side,
        error: validation.error,
        executed_at: timestamp,
      };
    }
    
    // Calculate quantity if notional provided
    let quantity = signal.quantity;
    let quotePrice: number | undefined;
    
    if (!quantity && signal.notional) {
      const quote = await this.getQuote(signal.symbol);
      if (!quote) {
        return {
          success: false,
          symbol: signal.symbol,
          side: signal.side,
          error: 'Could not get quote for position sizing',
          executed_at: timestamp,
        };
      }
      quotePrice = quote.price;
      quantity = Math.floor(signal.notional / quotePrice);
      console.log(`[EXECUTOR] Calculated quantity: ${quantity} from notional: $${signal.notional}, price: $${quotePrice}`);
    }
    
    if (!quantity || quantity < 1) {
      return {
        success: false,
        symbol: signal.symbol,
        side: signal.side,
        error: 'Invalid quantity calculated',
        executed_at: timestamp,
      };
    }
    
    // DRY RUN - Log but don't execute
    if (DRY_RUN) {
      console.log(`[EXECUTOR] DRY RUN - Would ${signal.side} ${quantity} ${signal.symbol}`);
      
      await this.logTrade({
        user_id: this.userId,
        symbol: signal.symbol,
        side: signal.side,
        quantity,
        strategy: signal.strategy,
        reason: signal.reason,
        status: 'simulated',
        dry_run: true,
      });
      
      return {
        success: true,
        order_id: `dry-run-${Date.now()}`,
        symbol: signal.symbol,
        side: signal.side,
        quantity,
        status: 'simulated',
        executed_at: timestamp,
      };
    }
    
    // LIVE EXECUTION
    try {
      const order = await alpaca.placeOrder({
        symbol: signal.symbol,
        qty: quantity,
        side: signal.side,
        type: signal.type,
        time_in_force: 'day',
        limit_price: signal.limit_price,
      });
      
      console.log(`[EXECUTOR] Order placed: ${order.id} - ${order.status}`);
      
      await this.logTrade({
        user_id: this.userId,
        symbol: signal.symbol,
        side: signal.side,
        quantity,
        strategy: signal.strategy,
        reason: signal.reason,
        status: order.status,
        order_id: order.id,
        dry_run: false,
      });
      
      return {
        success: true,
        order_id: order.id,
        symbol: signal.symbol,
        side: signal.side,
        quantity,
        status: order.status,
        executed_at: timestamp,
      };
    } catch (error: any) {
      console.error(`[EXECUTOR] Order failed:`, error.response?.data || error.message);
      
      return {
        success: false,
        symbol: signal.symbol,
        side: signal.side,
        quantity,
        error: error.response?.data?.message || error.message,
        executed_at: timestamp,
      };
    }
  }
  
  // Execute momentum rotation plan
  async executeMomentumRotation(plan: {
    buys: Array<{ symbol: string; allocation: number; reason: string }>;
    sells: Array<{ symbol: string; allocation: number; reason: string }>;
  }): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    console.log(`[EXECUTOR] Executing momentum rotation`);
    console.log(`[EXECUTOR] Buys: ${plan.buys.length}, Sells: ${plan.sells.length}`);
    
    // Execute sells first (free up capital)
    for (const sell of plan.sells) {
      // Check if we have a position to sell
      const position = await alpaca.getPosition(sell.symbol).catch(() => null);
      
      if (position) {
        const result = await this.executeTrade({
          symbol: sell.symbol,
          side: 'sell',
          quantity: parseInt(position.qty),
          type: 'market',
          strategy: 'momentum',
          reason: sell.reason,
        });
        results.push(result);
      } else {
        console.log(`[EXECUTOR] No position in ${sell.symbol} to sell, skipping`);
      }
    }
    
    // Then execute buys
    for (const buy of plan.buys) {
      const result = await this.executeTrade({
        symbol: buy.symbol,
        side: 'buy',
        notional: buy.allocation,
        type: 'market',
        strategy: 'momentum',
        reason: buy.reason,
      });
      results.push(result);
    }
    
    return results;
  }
  
  // Validate trade signal
  private async validateSignal(signal: TradeSignal): Promise<{ valid: boolean; error?: string }> {
    // Check symbol is valid
    if (!signal.symbol || signal.symbol.length === 0) {
      return { valid: false, error: 'Invalid symbol' };
    }
    
    // Check position size limits
    if (signal.notional && signal.notional > MAX_POSITION_SIZE) {
      return { valid: false, error: `Position size $${signal.notional} exceeds max $${MAX_POSITION_SIZE}` };
    }
    
    // Check portfolio allocation (for buys)
    if (signal.side === 'buy' && signal.notional) {
      const account = await alpaca.getAccount();
      const portfolioValue = parseFloat(account.portfolio_value);
      const allocation = signal.notional / portfolioValue;
      
      if (allocation > MAX_PORTFOLIO_ALLOCATION) {
        return { 
          valid: false, 
          error: `Allocation ${(allocation * 100).toFixed(1)}% exceeds max ${MAX_PORTFOLIO_ALLOCATION * 100}%` 
        };
      }
    }
    
    return { valid: true };
  }
  
  // Get current quote (with fallback for weekends)
  private async getQuote(symbol: string): Promise<{ price: number } | null> {
    try {
      const trade = await alpaca.getLatestTrade(symbol);
      return { price: trade.price };
    } catch (error) {
      // Fallback prices for weekend testing
      const fallbackPrices: Record<string, number> = {
        'XLK': 230, 'XLC': 85, 'XLI': 130, 'XLV': 145, 'XLY': 195,
        'XLF': 45, 'XLB': 95, 'XLP': 80, 'XLRE': 42, 'XLU': 72,
        'XLE': 90, 'SPY': 565, 'QQQ': 485,
      };
      
      if (fallbackPrices[symbol]) {
        console.log(`[EXECUTOR] Using fallback price for ${symbol}: $${fallbackPrices[symbol]}`);
        return { price: fallbackPrices[symbol] };
      }
      
      console.error(`[EXECUTOR] Failed to get quote for ${symbol}`);
      return null;
    }
  }
  
  // Log trade to database
  private async logTrade(trade: {
    user_id: string;
    symbol: string;
    side: string;
    quantity: number;
    strategy: string;
    reason: string;
    status: string;
    order_id?: string;
    dry_run: boolean;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO trades (user_id, ticker, action, quantity, executed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [trade.user_id, trade.symbol, trade.side, trade.quantity]
      );
    } catch (error) {
      console.error(`[EXECUTOR] Failed to log trade:`, error);
    }
  }
}

// Standalone execution function
export async function executeRotationPlan(userId: string, plan: any): Promise<ExecutionResult[]> {
  const executor = new TradeExecutor(userId);
  return executor.executeMomentumRotation(plan);
}

export default TradeExecutor;

// Fallback ETF prices for weekend testing
const ETF_FALLBACK_PRICES: Record<string, number> = {
  'XLK': 230, 'XLC': 85, 'XLI': 130, 'XLV': 145, 'XLY': 195,
  'XLF': 45, 'XLB': 95, 'XLP': 80, 'XLRE': 42, 'XLU': 72,
  'XLE': 90, 'SPY': 565, 'QQQ': 485,
};

export function getFallbackPrice(symbol: string): number | null {
  return ETF_FALLBACK_PRICES[symbol] || null;
}
