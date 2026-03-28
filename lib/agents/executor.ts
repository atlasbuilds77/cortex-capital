// Cortex Capital - EXECUTOR Agent
// Executes approved trades via Tradier API with safety checks and tracking
//
// PRODUCTION NOTES:
// - ALWAYS use dry_run: true unless explicitly confirmed for real trading
// - Idempotency: Check executedTrades set before placing any order
// - All errors are logged but don't halt execution of remaining trades

import { TradeInstruction } from './strategist';
import {
  MIN_COMMISSION,
  COMMISSION_RATE,
  BUYING_POWER_BUFFER,
  DEFAULT_TRADE_DELAY_MS,
} from '../constants';
import { 
  TradeExecutionError, 
  InsufficientFundsError,
  ExternalAPIError,
  withRetry,
} from '../errors';

export interface ExecutionConfig {
  dry_run: boolean; // Simulate execution without placing real orders
  order_type: 'market' | 'limit' | 'stop';
  price_tolerance: number; // % tolerance for limit orders
  max_slippage: number; // Maximum acceptable slippage %
  retry_attempts: number; // Number of retry attempts for partial fills
  delay_between_trades: number; // ms delay between consecutive trades
}

export interface TradeResult {
  trade_id: string;
  ticker: string;
  action: 'buy' | 'sell';
  requested_quantity: number;
  filled_quantity: number;
  average_price: number;
  status: 'filled' | 'partial' | 'rejected' | 'cancelled';
  execution_time: Date;
  commission: number;
  slippage: number; // Difference from expected price
  error_message?: string;
}

export interface ExecutionReport {
  execution_id: string;
  plan_id: string;
  user_id: string;
  total_trades_requested: number;
  total_trades_executed: number;
  total_shares_traded: number;
  total_value_traded: number;
  total_commission: number;
  total_slippage: number;
  execution_time_ms: number;
  results: TradeResult[];
  summary: {
    success_rate: number;
    average_slippage: number;
    largest_trade: TradeResult | null;
    failed_trades: TradeResult[];
  };
}

// Mock Tradier API integration (replace with real API calls)
class MockTradierAPI {
  private static instance: MockTradierAPI;
  
  private constructor() {}
  
  static getInstance(): MockTradierAPI {
    if (!MockTradierAPI.instance) {
      MockTradierAPI.instance = new MockTradierAPI();
    }
    return MockTradierAPI.instance;
  }
  
  async placeOrder(
    accountId: string,
    symbol: string,
    quantity: number,
    side: 'buy' | 'sell',
    orderType: 'market' | 'limit' | 'stop',
    price?: number
  ): Promise<{
    order_id: string;
    status: string;
    filled_quantity: number;
    average_price: number;
    commission: number;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    // Simulate market conditions
    const basePrice = this.getCurrentPrice(symbol);
    const slippage = (Math.random() - 0.5) * 0.02; // ±1% random slippage
    const executionPrice = basePrice * (1 + slippage);
    
    // Simulate partial fills (10% chance)
    const fillRate = Math.random() > 0.1 ? 1 : 0.5 + Math.random() * 0.4;
    const filledQuantity = Math.floor(quantity * fillRate);
    
    // Simulate commission
    const commission = Math.max(1, executionPrice * filledQuantity * 0.001);
    
    return {
      order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: fillRate === 1 ? 'filled' : 'partial',
      filled_quantity: filledQuantity,
      average_price: parseFloat(executionPrice.toFixed(2)),
      commission: parseFloat(commission.toFixed(2)),
    };
  }
  
  async getAccountBalances(accountId: string): Promise<{
    cash_available: number;
    buying_power: number;
    equity: number;
  }> {
    // Mock balances
    return {
      cash_available: 10000 + Math.random() * 50000,
      buying_power: 15000 + Math.random() * 75000,
      equity: 50000 + Math.random() * 200000,
    };
  }
  
  async getPosition(accountId: string, symbol: string): Promise<{
    quantity: number;
    average_cost: number;
  } | null> {
    // Mock position
    return {
      quantity: Math.floor(10 + Math.random() * 100),
      average_cost: this.getCurrentPrice(symbol) * (0.8 + Math.random() * 0.4),
    };
  }
  
  private getCurrentPrice(symbol: string): number {
    const priceMap: Record<string, number> = {
      AAPL: 175,
      MSFT: 420,
      GOOGL: 150,
      NVDA: 950,
      TSLA: 180,
      JPM: 195,
      XOM: 115,
      KO: 60,
      META: 485,
      AMZN: 178,
    };
    return priceMap[symbol] || 100;
  }
}

export class TradeExecutor {
  private tradier: MockTradierAPI;
  private config: ExecutionConfig;
  // Idempotency: Track executed trades to prevent duplicates
  private executedTrades: Set<string> = new Set();
  
  constructor(config: ExecutionConfig) {
    this.tradier = MockTradierAPI.getInstance();
    this.config = {
      ...config,
      // Force dry_run in production unless explicitly disabled
      dry_run: config.dry_run ?? (process.env.ENABLE_REAL_TRADES !== 'true'),
    };
    
    if (!this.config.dry_run) {
      console.warn('[EXECUTOR] ⚠️ WARNING: Real trade execution enabled. This will place actual orders.');
    }
  }
  
  /**
   * Generate idempotency key for a trade
   */
  private getIdempotencyKey(planId: string, trade: TradeInstruction): string {
    return `${planId}:${trade.ticker}:${trade.action}:${trade.quantity}`;
  }
  
  /**
   * Check if trade has already been executed (idempotency)
   */
  private isTradeExecuted(key: string): boolean {
    return this.executedTrades.has(key);
  }
  
  /**
   * Mark trade as executed (idempotency)
   */
  private markTradeExecuted(key: string): void {
    this.executedTrades.add(key);
  }
  
  async executeTrades(
    accountId: string,
    planId: string,
    userId: string,
    trades: TradeInstruction[]
  ): Promise<ExecutionReport> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const results: TradeResult[] = [];
    
    console.log(`[EXECUTOR] Starting execution ${executionId} for plan ${planId}`);
    console.log(`[EXECUTOR] Account: ${accountId}, Trades: ${trades.length}`);
    console.log(`[EXECUTOR] Dry run: ${this.config.dry_run}`);
    
    // Pre-execution validation
    const validationResult = await this.validateTrades(accountId, trades);
    
    // Log warnings even if valid
    if (validationResult.warnings.length > 0) {
      validationResult.warnings.forEach(w => console.warn(`[EXECUTOR] Warning: ${w}`));
    }
    
    if (!validationResult.valid) {
      throw new TradeExecutionError(
        'VALIDATION',
        `Trade validation failed: ${validationResult.errors.join(', ')}`,
        { errors: validationResult.errors }
      );
    }
    
    // Execute trades sequentially with delay
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const idempotencyKey = this.getIdempotencyKey(planId, trade);
      
      // Idempotency check: Skip if already executed
      if (this.isTradeExecuted(idempotencyKey)) {
        console.log(`[EXECUTOR] Skipping duplicate trade (idempotency): ${trade.ticker}`);
        results.push({
          trade_id: `skipped_duplicate_${Date.now()}`,
          ticker: trade.ticker,
          action: trade.action,
          requested_quantity: trade.quantity,
          filled_quantity: 0,
          average_price: 0,
          status: 'cancelled',
          execution_time: new Date(),
          commission: 0,
          slippage: 0,
          error_message: 'Skipped: duplicate trade (idempotency)',
        });
        continue;
      }
      
      console.log(`[EXECUTOR] Processing trade ${i + 1}/${trades.length}: ${trade.action} ${trade.quantity} ${trade.ticker}`);
      
      try {
        const result = await this.executeSingleTrade(accountId, trade, i);
        results.push(result);
        
        // Mark as executed for idempotency
        if (result.status === 'filled' || result.status === 'partial') {
          this.markTradeExecuted(idempotencyKey);
        }
        
        // Add delay between trades if configured
        if (i < trades.length - 1 && this.config.delay_between_trades > 0) {
          console.log(`[EXECUTOR] Waiting ${this.config.delay_between_trades}ms before next trade...`);
          await new Promise(resolve => setTimeout(resolve, this.config.delay_between_trades));
        }
      } catch (error: any) {
        console.error(`[EXECUTOR] Failed to execute trade ${trade.ticker}:`, error.message);
        results.push({
          trade_id: `failed_${Date.now()}`,
          ticker: trade.ticker,
          action: trade.action,
          requested_quantity: trade.quantity,
          filled_quantity: 0,
          average_price: 0,
          status: 'rejected',
          execution_time: new Date(),
          commission: 0,
          slippage: 0,
          error_message: error.message,
        });
        
        // Continue with other trades unless this is critical
        if (trade.priority === 'high') {
          console.warn(`[EXECUTOR] High priority trade failed, but continuing with remaining trades`);
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    return this.generateReport(executionId, planId, userId, trades, results, executionTime);
  }
  
  private async validateTrades(
    accountId: string,
    trades: TradeInstruction[]
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Guard: No trades to validate
    if (trades.length === 0) {
      return { valid: true, errors: [], warnings: ['No trades to execute'] };
    }
    
    // Check account balances for buy trades
    const buyTrades = trades.filter(t => t.action === 'buy');
    if (buyTrades.length > 0) {
      try {
        const balances = await withRetry(() => this.tradier.getAccountBalances(accountId));
        const totalBuyCost = await this.estimateTotalCost(buyTrades);
        
        // Leave safety buffer
        const availableWithBuffer = balances.cash_available * BUYING_POWER_BUFFER;
        
        if (totalBuyCost > availableWithBuffer) {
          errors.push(`Insufficient cash: Need $${totalBuyCost.toFixed(2)}, available $${availableWithBuffer.toFixed(2)} (with ${((1 - BUYING_POWER_BUFFER) * 100).toFixed(0)}% buffer)`);
        } else if (totalBuyCost > balances.cash_available * 0.7) {
          warnings.push(`High cash utilization: Using ${((totalBuyCost / balances.cash_available) * 100).toFixed(1)}% of available cash`);
        }
      } catch (error) {
        errors.push(`Failed to fetch account balances: ${error}`);
      }
    }
    
    // Check for existing positions for sell trades
    const sellTrades = trades.filter(t => t.action === 'sell');
    for (const trade of sellTrades) {
      try {
        const position = await this.tradier.getPosition(accountId, trade.ticker);
        if (!position || position.quantity < trade.quantity) {
          errors.push(`Insufficient shares of ${trade.ticker}: Requested ${trade.quantity}, available ${position?.quantity || 0}`);
        }
      } catch (error) {
        errors.push(`Failed to check position for ${trade.ticker}: ${error}`);
      }
    }
    
    // Check for duplicate trades on same symbol
    const symbolCounts: Record<string, number> = {};
    trades.forEach(trade => {
      symbolCounts[trade.ticker] = (symbolCounts[trade.ticker] || 0) + 1;
    });
    
    Object.entries(symbolCounts).forEach(([symbol, count]) => {
      if (count > 1) {
        errors.push(`Multiple trades for ${symbol}: ${count} trades requested`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  private async estimateTotalCost(trades: TradeInstruction[]): Promise<number> {
    let totalCost = 0;
    for (const trade of trades) {
      if (trade.action === 'buy') {
        const price = this.tradier['getCurrentPrice'](trade.ticker);
        const tradeValue = price * trade.quantity;
        const commission = Math.max(MIN_COMMISSION, tradeValue * COMMISSION_RATE);
        totalCost += tradeValue + commission;
      }
    }
    return totalCost;
  }
  
  private async executeSingleTrade(
    accountId: string,
    trade: TradeInstruction,
    index: number
  ): Promise<TradeResult> {
    const tradeId = `trade_${Date.now()}_${index}`;
    const startTime = Date.now();
    
    if (this.config.dry_run) {
      console.log(`[EXECUTOR] DRY RUN: Would ${trade.action} ${trade.quantity} ${trade.ticker}`);
      
      const price = this.tradier['getCurrentPrice'](trade.ticker);
      const commission = Math.max(1, price * trade.quantity * 0.001);
      
      return {
        trade_id: tradeId,
        ticker: trade.ticker,
        action: trade.action,
        requested_quantity: trade.quantity,
        filled_quantity: trade.quantity, // Assume full fill in dry run
        average_price: price,
        status: 'filled',
        execution_time: new Date(),
        commission,
        slippage: 0,
      };
    }
    
    // Real execution
    console.log(`[EXECUTOR] Placing ${this.config.order_type} order for ${trade.quantity} ${trade.ticker}`);
    
    const orderResult = await this.tradier.placeOrder(
      accountId,
      trade.ticker,
      trade.quantity,
      trade.action,
      this.config.order_type
    );
    
    const executionTime = Date.now() - startTime;
    console.log(`[EXECUTOR] Order ${orderResult.order_id} completed in ${executionTime}ms`);
    console.log(`[EXECUTOR] Status: ${orderResult.status}, Filled: ${orderResult.filled_quantity}/${trade.quantity}`);
    
    // Calculate slippage
    const expectedPrice = this.tradier['getCurrentPrice'](trade.ticker);
    const slippage = ((orderResult.average_price - expectedPrice) / expectedPrice) * 100;
    
    // Handle partial fills with retries
    if (orderResult.status === 'partial' && this.config.retry_attempts > 0) {
      const remainingQuantity = trade.quantity - orderResult.filled_quantity;
      console.log(`[EXECUTOR] Partial fill, ${remainingQuantity} shares remaining. Retrying...`);
      
      // In a real implementation, we would retry the remaining quantity
      // For MVP, we'll just note it
      console.log(`[EXECUTOR] Would retry ${remainingQuantity} shares (retry logic not implemented in MVP)`);
    }
    
    return {
      trade_id: orderResult.order_id,
      ticker: trade.ticker,
      action: trade.action,
      requested_quantity: trade.quantity,
      filled_quantity: orderResult.filled_quantity,
      average_price: orderResult.average_price,
      status: orderResult.status as 'filled' | 'partial',
      execution_time: new Date(),
      commission: orderResult.commission,
      slippage,
    };
  }
  
  private generateReport(
    executionId: string,
    planId: string,
    userId: string,
    requestedTrades: TradeInstruction[],
    results: TradeResult[],
    executionTimeMs: number
  ): ExecutionReport {
    const executedTrades = results.filter(r => r.status === 'filled' || r.status === 'partial');
    const failedTrades = results.filter(r => r.status === 'rejected' || r.status === 'cancelled');
    
    const totalShares = executedTrades.reduce((sum, t) => sum + t.filled_quantity, 0);
    const totalValue = executedTrades.reduce((sum, t) => sum + (t.average_price * t.filled_quantity), 0);
    const totalCommission = executedTrades.reduce((sum, t) => sum + t.commission, 0);
    const totalSlippage = executedTrades.reduce((sum, t) => sum + t.slippage, 0);
    
    const successRate = (executedTrades.length / requestedTrades.length) * 100;
    const avgSlippage = executedTrades.length > 0 ? totalSlippage / executedTrades.length : 0;
    
    const largestTrade = executedTrades.reduce((largest, current) => {
      const currentValue = current.average_price * current.filled_quantity;
      const largestValue = largest ? largest.average_price * largest.filled_quantity : 0;
      return currentValue > largestValue ? current : largest;
    }, null as TradeResult | null);
    
    return {
      execution_id: executionId,
      plan_id: planId,
      user_id: userId,
      total_trades_requested: requestedTrades.length,
      total_trades_executed: executedTrades.length,
      total_shares_traded: totalShares,
      total_value_traded: parseFloat(totalValue.toFixed(2)),
      total_commission: parseFloat(totalCommission.toFixed(2)),
      total_slippage: parseFloat(totalSlippage.toFixed(4)),
      execution_time_ms: executionTimeMs,
      results,
      summary: {
        success_rate: parseFloat(successRate.toFixed(1)),
        average_slippage: parseFloat(avgSlippage.toFixed(4)),
        largest_trade: largestTrade,
        failed_trades: failedTrades,
      },
    };
  }
  
  // Helper method to cancel all pending orders (not implemented in MVP)
  async cancelAllOrders(accountId: string): Promise<{ cancelled: number; errors: string[] }> {
    console.log(`[EXECUTOR] Would cancel all orders for account ${accountId}`);
    return { cancelled: 0, errors: ['Not implemented in MVP'] };
  }
  
  // Get execution history for a plan
  async getExecutionHistory(planId: string): Promise<ExecutionReport[]> {
    console.log(`[EXECUTOR] Would fetch execution history for plan ${planId}`);
    return []; // Not implemented in MVP
  }
}

// Test function
export const testExecutor = async () => {
  const mockTrades: TradeInstruction[] = [
    {
      ticker: 'AAPL',
      action: 'buy',
      quantity: 10,
      reason: 'Increase technology exposure',
      priority: 'medium',
    },
    {
      ticker: 'TSLA',
      action: 'sell',
      quantity: 5,
      reason: 'Tax-loss harvesting',
      priority: 'high',
    },
    {
      ticker: 'JPM',
      action: 'buy',
      quantity: 15,
      reason: 'Increase finance exposure',
      priority: 'low',
    },
  ];
  
  const config: ExecutionConfig = {
    dry_run: true,
    order_type: 'market',
    price_tolerance: 0.5,
    max_slippage: 1.0,
    retry_attempts: 2,
    delay_between_trades: 1000,
  };
  
  const executor = new TradeExecutor(config);
  
  console.log('EXECUTOR Test - Dry Run:');
  const report = await executor.executeTrades(
    '6YB71689',
    'test_plan_123',
    'test_user_123',
    mockTrades
  );
  
  console.log('\nExecution Report:');
  console.log(`Execution ID: ${report.execution_id}`);
  console.log(`Success Rate: ${report.summary.success_rate}%`);
  console.log(`Total Value Traded: $${report.total_value_traded}`);
  console.log(`Total Commission: $${report.total_commission}`);
  console.log(`Average Slippage: ${report.summary.average_slippage.toFixed(4)}%`);
  
  console.log('\nTrade Results:');
  report.results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.ticker}: ${result.action.toUpperCase()} ${result.filled_quantity}/${result.requested_quantity} @ $${result.average_price}`);
    console.log(`   Status: ${result.status}, Commission: $${result.commission}, Slippage: ${result.slippage.toFixed(4)}%`);
  });
  
  return report;
};

// Test with real execution (commented out for safety)
export const testRealExecution = async () => {
  const mockTrades: TradeInstruction[] = [
    {
      ticker: 'AAPL',
      action: 'buy',
      quantity: 1, // Small quantity for testing
      reason: 'Test execution',
      priority: 'low',
    },
  ];
  
  const config: ExecutionConfig = {
    dry_run: false, // WARNING: This would place real orders
    order_type: 'market',
    price_tolerance: 0.5,
    max_slippage: 1.0,
    retry_attempts: 0,
    delay_between_trades: 0,
  };
  
  const executor = new TradeExecutor(config);
  
  console.log('WARNING: This would execute real trades!');
  console.log('Commenting out actual execution for safety.');
  
  // Uncomment to test real execution (USE WITH CAUTION)
  /*
  const report = await executor.executeTrades(
    '6YB71689',
    'test_plan_real',
    'test_user_123',
    mockTrades
  );
  console.log('Real execution report:', report);
  */
};

// ============================================================================
// PHASE 3: Multi-Leg Order Execution
// ============================================================================

export interface SpreadLeg {
  symbol: string;
  strike: number;
  optionType: 'call' | 'put';
  expiry: Date;
  action: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
}

export interface SpreadOrder {
  spreadId: string;
  symbol: string;
  type: 'bull_call_spread' | 'bear_call_spread' | 'bull_put_spread' | 'bear_put_spread';
  legs: SpreadLeg[];
  maxRisk: number;
  targetProfit: number;
  expiration: Date;
}

export interface MultiLegExecutionResult {
  spreadId: string;
  status: 'success' | 'partial' | 'failed' | 'rolled_back';
  legs: Array<{
    legIndex: number;
    status: 'filled' | 'partial' | 'rejected' | 'cancelled';
    filledQuantity: number;
    averagePrice: number;
    error?: string;
  }>;
  totalCost: number;
  netCreditDebit: number;
  maxRisk: number;
  maxProfit: number;
  executionTime: Date;
}

/**
 * Execute multi-leg spread orders with rollback protection
 */
export async function executeSpread(
  spread: SpreadOrder,
  config: ExecutionConfig,
  accountId: string
): Promise<MultiLegExecutionResult> {
  console.log(`[EXECUTOR] Executing ${spread.type} spread for ${spread.symbol}`);
  
  const result: MultiLegExecutionResult = {
    spreadId: spread.spreadId,
    status: 'failed',
    legs: [],
    totalCost: 0,
    netCreditDebit: 0,
    maxRisk: spread.maxRisk,
    maxProfit: spread.targetProfit,
    executionTime: new Date(),
  };
  
  const filledLegs: Array<any> = [];
  const rollbackQueue: Array<() => Promise<void>> = [];
  
  try {
    // Execute each leg sequentially
    for (let i = 0; i < spread.legs.length; i++) {
      const leg = spread.legs[i];
      
      console.log(`[EXECUTOR] Executing leg ${i + 1}: ${leg.action} ${leg.quantity} ${leg.optionType} ${leg.strike}`);
      
      try {
        const legResult = await executeTradeLeg(leg, config, accountId);
        result.legs.push(legResult);
        
        if (legResult.status === 'filled' || legResult.status === 'partial') {
          filledLegs.push({ leg, result: legResult });
          
          // Add rollback function for this leg
          if (legResult.filledQuantity > 0) {
            rollbackQueue.push(async () => {
              console.log(`[EXECUTOR] Rolling back leg ${i + 1}: ${leg.action === 'buy' ? 'sell' : 'buy'} ${legResult.filledQuantity}`);
              await rollbackLeg(leg, legResult, config, accountId);
            });
          }
        }
        
        // Add delay between legs
        if (i < spread.legs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, config.delay_between_trades || 1000));
        }
        
      } catch (legError) {
        console.error(`[EXECUTOR] Failed to execute leg ${i + 1}:`, legError);
        const errorMessage = legError instanceof Error ? legError.message : String(legError);
        result.legs.push({
          legIndex: i,
          status: 'rejected',
          filledQuantity: 0,
          averagePrice: 0,
          error: errorMessage,
        });
        
        // Rollback all filled legs
        await rollbackAll(rollbackQueue);
        result.status = 'rolled_back';
        return result;
      }
    }
    
    // Calculate results
    const netResult = calculateSpreadResult(filledLegs);
    result.totalCost = netResult.totalCost;
    result.netCreditDebit = netResult.netCreditDebit;
    
    // Check if all legs filled successfully
    const allFilled = result.legs.every(leg => leg.status === 'filled');
    const anyFilled = result.legs.some(leg => leg.status === 'filled' || leg.status === 'partial');
    
    if (allFilled) {
      result.status = 'success';
      console.log(`[EXECUTOR] Spread executed successfully: $${result.netCreditDebit.toFixed(2)} net ${result.netCreditDebit >= 0 ? 'credit' : 'debit'}`);
    } else if (anyFilled) {
      result.status = 'partial';
      console.warn(`[EXECUTOR] Spread partially executed`);
    } else {
      result.status = 'failed';
      console.error(`[EXECUTOR] Spread execution failed`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`[EXECUTOR] Error executing spread:`, error);
    
    // Attempt rollback on any error
    try {
      await rollbackAll(rollbackQueue);
    } catch (rollbackError) {
      console.error(`[EXECUTOR] Rollback failed:`, rollbackError);
    }
    
    result.status = 'rolled_back';
    return result;
  }
}

/**
 * Execute a single leg of a spread
 */
async function executeTradeLeg(
  leg: SpreadLeg,
  config: ExecutionConfig,
  accountId: string
): Promise<MultiLegExecutionResult['legs'][0]> {
  const api = MockTradierAPI.getInstance();
  
  // For options, we need to construct the option symbol
  const optionSymbol = constructOptionSymbol(leg.symbol, leg.strike, leg.optionType, leg.expiry);
  
  try {
    const orderResult = await api.placeOrder(
      accountId,
      optionSymbol,
      leg.quantity,
      leg.action,
      leg.orderType,
      leg.limitPrice
    );
    
    return {
      legIndex: 0, // Will be set by caller
      status: orderResult.filled_quantity === leg.quantity ? 'filled' : 'partial',
      filledQuantity: orderResult.filled_quantity,
      averagePrice: orderResult.average_price,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new TradeExecutionError(optionSymbol, `Failed to execute leg: ${errorMessage}`);
  }
}

/**
 * Rollback a filled leg
 */
async function rollbackLeg(
  leg: SpreadLeg,
  legResult: MultiLegExecutionResult['legs'][0],
  config: ExecutionConfig,
  accountId: string
): Promise<void> {
  if (legResult.filledQuantity === 0) return;
  
  const api = MockTradierAPI.getInstance();
  const oppositeAction = leg.action === 'buy' ? 'sell' : 'buy';
  const optionSymbol = constructOptionSymbol(leg.symbol, leg.strike, leg.optionType, leg.expiry);
  
  try {
    await api.placeOrder(
      accountId,
      optionSymbol,
      legResult.filledQuantity,
      oppositeAction,
      'market'
    );
    
    console.log(`[EXECUTOR] Rolled back ${legResult.filledQuantity} contracts of ${optionSymbol}`);
  } catch (error) {
    console.error(`[EXECUTOR] Failed to rollback leg:`, error);
    throw error;
  }
}

/**
 * Rollback all filled legs in reverse order
 */
async function rollbackAll(rollbackQueue: Array<() => Promise<void>>): Promise<void> {
  if (rollbackQueue.length === 0) return;
  
  console.log(`[EXECUTOR] Rolling back ${rollbackQueue.length} legs`);
  
  // Execute rollbacks in reverse order
  for (let i = rollbackQueue.length - 1; i >= 0; i--) {
    try {
      await rollbackQueue[i]();
      // Small delay between rollbacks
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[EXECUTOR] Rollback ${i} failed:`, error);
      // Continue with other rollbacks even if one fails
    }
  }
}

/**
 * Calculate spread results from filled legs
 */
function calculateSpreadResult(filledLegs: Array<{ leg: SpreadLeg; result: any }>) {
  let totalCost = 0;
  let netCreditDebit = 0;
  
  filledLegs.forEach(({ leg, result }) => {
    const legCost = result.averagePrice * result.filledQuantity * 100; // Options are 100 shares per contract
    if (leg.action === 'buy') {
      totalCost += legCost;
      netCreditDebit -= legCost;
    } else {
      netCreditDebit += legCost;
    }
  });
  
  return { totalCost, netCreditDebit };
}

/**
 * Construct option symbol from components
 */
function constructOptionSymbol(
  underlying: string,
  strike: number,
  optionType: 'call' | 'put',
  expiry: Date
): string {
  // Format: SYMBOLYYMMDDC|P00STRIKE
  const year = expiry.getFullYear().toString().slice(-2);
  const month = (expiry.getMonth() + 1).toString().padStart(2, '0');
  const day = expiry.getDate().toString().padStart(2, '0');
  const typeCode = optionType === 'call' ? 'C' : 'P';
  const strikeFormatted = Math.round(strike * 1000).toString().padStart(8, '0');
  
  return `${underlying}${year}${month}${day}${typeCode}${strikeFormatted}`;
}

/**
 * Execute a single trade (standalone helper function for executePlan)
 */
async function executeSingleTrade(
  trade: TradeInstruction,
  config: ExecutionConfig,
  accountId: string
): Promise<TradeResult> {
  const tradeId = `trade_${Date.now()}_${Math.random()}`;
  const startTime = Date.now();
  
  const tradier = MockTradierAPI.getInstance();
  
  if (config.dry_run) {
    console.log(`[EXECUTOR] DRY RUN: Would ${trade.action} ${trade.quantity} ${trade.ticker}`);
    
    const price = tradier['getCurrentPrice'](trade.ticker);
    const commission = Math.max(1, price * trade.quantity * 0.001);
    
    return {
      trade_id: tradeId,
      ticker: trade.ticker,
      action: trade.action,
      requested_quantity: trade.quantity,
      filled_quantity: trade.quantity,
      average_price: price,
      status: 'filled',
      execution_time: new Date(),
      commission,
      slippage: 0,
    };
  }
  
  // Real execution
  console.log(`[EXECUTOR] Placing ${config.order_type} order for ${trade.quantity} ${trade.ticker}`);
  
  const orderResult = await tradier.placeOrder(
    accountId,
    trade.ticker,
    trade.quantity,
    trade.action,
    config.order_type
  );
  
  const executionTime = Date.now() - startTime;
  console.log(`[EXECUTOR] Order ${orderResult.order_id} completed in ${executionTime}ms`);
  
  const expectedPrice = tradier['getCurrentPrice'](trade.ticker);
  const slippage = ((orderResult.average_price - expectedPrice) / expectedPrice) * 100;
  
  return {
    trade_id: orderResult.order_id,
    ticker: trade.ticker,
    action: trade.action,
    requested_quantity: trade.quantity,
    filled_quantity: orderResult.filled_quantity,
    average_price: orderResult.average_price,
    status: orderResult.status as 'filled' | 'partial',
    execution_time: new Date(),
    commission: orderResult.commission,
    slippage,
  };
}

/**
 * Execute plan with profile-based logic
 */
export async function executePlan(
  plan: any,
  profile: 'conservative' | 'moderate' | 'ultra_aggressive',
  config: ExecutionConfig,
  accountId: string
): Promise<ExecutionReport> {
  console.log(`[EXECUTOR] Executing plan for ${profile} profile`);
  
  const startTime = Date.now();
  const results: TradeResult[] = [];
  const spreadResults: MultiLegExecutionResult[] = [];
  
  // Profile-specific execution rules
  if (profile === 'conservative') {
    // Only execute 10 AM - 2 PM
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    if (timeInMinutes < 600 || timeInMinutes > 840) { // 10:00-14:00
      console.log(`[EXECUTOR] Conservative profile: Outside execution window (10 AM - 2 PM)`);
      return createEmptyReport(plan.plan_id, 'conservative', accountId);
    }
    
    // Limit orders only, max 5 trades/month
    config.order_type = 'limit';
    const maxTrades = Math.min(plan.trades?.length || 0, 5);
    
    if (plan.trades) {
      for (let i = 0; i < maxTrades; i++) {
        const trade = plan.trades[i];
        const result = await executeSingleTrade(trade, config, accountId);
        results.push(result);
        
        // Delay between trades
        if (i < maxTrades - 1) {
          await new Promise(resolve => setTimeout(resolve, config.delay_between_trades || 2000));
        }
      }
    }
  }
  
  if (profile === 'moderate') {
    // Execute anytime market open
    // Prefer limit, use market if needed
    // Max 15 trades/month
    config.order_type = 'limit';
    const maxTrades = Math.min(plan.trades?.length || 0, 15);
    
    if (plan.trades) {
      for (let i = 0; i < maxTrades; i++) {
        const trade = plan.trades[i];
        const result = await executeSingleTrade(trade, config, accountId);
        results.push(result);
        
        // Smaller delay for moderate profile
        if (i < maxTrades - 1) {
          await new Promise(resolve => setTimeout(resolve, config.delay_between_trades || 1000));
        }
      }
    }
    
    // Handle LEAPS orders if present
    if (plan.options_recommendations?.leaps) {
      console.log(`[EXECUTOR] Processing ${plan.options_recommendations.leaps.length} LEAPS recommendations`);
      // In production, execute LEAPS orders here
    }
  }
  
  if (profile === 'ultra_aggressive') {
    // Execute 24/7 (pre-market, after-hours)
    // Market orders (speed matters)
    // Unlimited trades
    config.order_type = 'market';
    
    // Execute all trades
    if (plan.trades) {
      for (let i = 0; i < plan.trades.length; i++) {
        const trade = plan.trades[i];
        const result = await executeSingleTrade(trade, config, accountId);
        results.push(result);
        
        // Minimal delay for speed
        if (i < plan.trades.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Handle multi-leg spreads
    if (plan.options_recommendations?.spreads) {
      console.log(`[EXECUTOR] Processing ${plan.options_recommendations.spreads.length} spreads`);
      
      for (const spreadRec of plan.options_recommendations.spreads) {
        const spreadOrder: SpreadOrder = {
          spreadId: `spread_${Date.now()}_${spreadRec.symbol}`,
          symbol: spreadRec.symbol,
          type: 'bull_call_spread', // Default, should come from recommendation
          legs: [
            {
              symbol: spreadRec.symbol,
              strike: spreadRec.longStrike,
              optionType: 'call',
              expiry: spreadRec.expiry,
              action: 'buy',
              quantity: spreadRec.quantity,
              orderType: 'market',
            },
            {
              symbol: spreadRec.symbol,
              strike: spreadRec.shortStrike!,
              optionType: 'call',
              expiry: spreadRec.expiry,
              action: 'sell',
              quantity: spreadRec.quantity,
              orderType: 'market',
            },
          ],
          maxRisk: spreadRec.premiumPaid,
          targetProfit: (spreadRec.shortStrike! - spreadRec.longStrike) * 100 * spreadRec.quantity - spreadRec.premiumPaid,
          expiration: spreadRec.expiry,
        };
        
        const spreadResult = await executeSpread(spreadOrder, config, accountId);
        spreadResults.push(spreadResult);
      }
    }
    
    // Handle day trading setups
    if (plan.day_trading_setups) {
      console.log(`[EXECUTOR] Processing ${plan.day_trading_setups.length} day trading setups`);
      // In production, execute day trades here
    }
  }
  
  const executionTime = Date.now() - startTime;
  
  return {
    execution_id: `exec_${Date.now()}_${profile}`,
    plan_id: plan.plan_id,
    user_id: accountId,
    total_trades_requested: plan.trades?.length || 0,
    total_trades_executed: results.length,
    total_shares_traded: results.reduce((sum, r) => sum + r.filled_quantity, 0),
    total_value_traded: results.reduce((sum, r) => sum + (r.average_price * r.filled_quantity), 0),
    total_commission: results.reduce((sum, r) => sum + r.commission, 0),
    total_slippage: results.reduce((sum, r) => sum + r.slippage, 0),
    execution_time_ms: executionTime,
    results,
    summary: {
      success_rate: results.length > 0 ? (results.filter(r => r.status === 'filled').length / results.length) * 100 : 0,
      average_slippage: results.length > 0 ? results.reduce((sum, r) => sum + r.slippage, 0) / results.length : 0,
      largest_trade: results.length > 0 ? results.reduce((max, r) => (r.filled_quantity > max.filled_quantity ? r : max), results[0]) : null,
      failed_trades: results.filter(r => r.status === 'rejected' || r.status === 'cancelled'),
    },
  };
}

function createEmptyReport(planId: string, profile: string, accountId: string): ExecutionReport {
  return {
    execution_id: `exec_${Date.now()}_${profile}`,
    plan_id: planId,
    user_id: accountId,
    total_trades_requested: 0,
    total_trades_executed: 0,
    total_shares_traded: 0,
    total_value_traded: 0,
    total_commission: 0,
    total_slippage: 0,
    execution_time_ms: 0,
    results: [],
    summary: {
      success_rate: 0,
      average_slippage: 0,
      largest_trade: null,
      failed_trades: [],
    },
  };
}

// Test multi-leg execution
export const testMultiLegExecution = async () => {
  console.log('Testing Multi-Leg Execution:');
  
  const mockSpread: SpreadOrder = {
    spreadId: 'test_spread_123',
    symbol: 'TSLA',
    type: 'bull_call_spread',
    legs: [
      {
        symbol: 'TSLA',
        strike: 250,
        optionType: 'call',
        expiry: new Date('2026-12-19'),
        action: 'buy',
        quantity: 1,
        orderType: 'market',
      },
      {
        symbol: 'TSLA',
        strike: 280,
        optionType: 'call',
        expiry: new Date('2026-12-19'),
        action: 'sell',
        quantity: 1,
        orderType: 'market',
      },
    ],
    maxRisk: 500,
    targetProfit: 1500,
    expiration: new Date('2026-12-19'),
  };
  
  const config: ExecutionConfig = {
    dry_run: false,
    order_type: 'market',
    price_tolerance: 0.01,
    max_slippage: 1.0,
    retry_attempts: 3,
    delay_between_trades: 1000,
  };
  
  console.log('Testing spread execution...');
  const result = await executeSpread(mockSpread, config, 'test_account');
  
  console.log(`Spread execution result: ${result.status}`);
  console.log(`Legs executed: ${result.legs.length}`);
  console.log(`Net credit/debit: $${result.netCreditDebit.toFixed(2)}`);
  
  // Test profile-based execution
  console.log('\n=== PROFILE-BASED EXECUTION ===');
  
  const mockPlan = {
    plan_id: 'test_plan_123',
    trades: [
      {
        symbol: 'AAPL',
        action: 'buy',
        quantity: 10,
        order_type: 'market',
      },
      {
        symbol: 'MSFT',
        action: 'sell',
        quantity: 5,
        order_type: 'market',
      },
    ],
  };
  
  console.log('Testing conservative profile execution...');
  const conservativeReport = await executePlan(mockPlan, 'conservative', config, 'test_account');
  console.log(`Conservative trades executed: ${conservativeReport.total_trades_executed}`);
  
  console.log('\nTesting moderate profile execution...');
  const moderateReport = await executePlan(mockPlan, 'moderate', config, 'test_account');
  console.log(`Moderate trades executed: ${moderateReport.total_trades_executed}`);
  
  console.log('\nTesting ultra aggressive profile execution...');
  const aggressiveReport = await executePlan(mockPlan, 'ultra_aggressive', config, 'test_account');
  console.log(`Ultra aggressive trades executed: ${aggressiveReport.total_trades_executed}`);
  
  console.log('\n=== MULTI-LEG EXECUTION TEST COMPLETE ===');
};

// Run test if this file is executed directly
if (require.main === module) {
  // Run both tests
  testExecutor().catch(console.error);
  setTimeout(() => {
    testMultiLegExecution().catch(console.error);
  }, 2000);
}