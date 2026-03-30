// Cortex Capital - ENHANCED EXECUTOR AGENT
// Executes trades with real confirmation logic and confidence checks

import { enhancedExecutorAgent } from './analysis-integration';
import { EnhancedRebalancingPlan, EnhancedTradeRecommendation } from './strategist-enhanced';
import { TradeRiskReview, PlanRiskReview } from './risk-enhanced-complete';
import { getQuote, placeOrder } from '../integrations/tradier';

export interface ExecutionOrder {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  order_type: 'market' | 'limit' | 'stop';
  price?: number;
  stop_price?: number;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  extended_hours: boolean;
  client_order_id: string;
}

export interface ExecutionResult {
  order: ExecutionOrder;
  status: 'filled' | 'partially_filled' | 'rejected' | 'pending';
  filled_quantity: number;
  average_price: number;
  commission: number;
  timestamp: string;
  message?: string;
}

export interface EnhancedExecutionPlan {
  plan_id: string;
  timestamp: string;
  trades_to_execute: Array<{
    trade: EnhancedTradeRecommendation;
    risk_review: TradeRiskReview;
    execution_confirmation: any; // From enhancedExecutorAgent
    order_details?: ExecutionOrder;
  }>;
  execution_results: ExecutionResult[];
  summary: {
    total_trades: number;
    executed_trades: number;
    rejected_trades: number;
    total_commission: number;
    estimated_slippage: number;
    overall_confidence: number;
  };
  warnings: string[];
  recommendations: string[];
}

/**
 * Enhanced executor with real confirmation logic
 */
export async function enhancedExecutor(
  strategistPlan: EnhancedRebalancingPlan,
  riskReview: PlanRiskReview
): Promise<EnhancedExecutionPlan> {
  try {
    const tradesToExecute: EnhancedExecutionPlan['trades_to_execute'] = [];
    const executionResults: ExecutionResult[] = [];
    
    // Filter trades based on risk approval
    const approvedTrades = strategistPlan.trades.filter((trade, index) => {
      const riskReviewItem = riskReview.trade_reviews[index];
      return riskReviewItem && riskReviewItem.risk_approval === 'APPROVED';
    });
    
    // Process each approved trade
    for (const trade of approvedTrades) {
      try {
        // Get execution confirmation
        const size = trade.shares * trade.execution_parameters.suggested_entry;
        const portfolioSize = 10000; // Assuming $10,000 portfolio for calculation
        const sizePercentage = (size / portfolioSize) * 100;
        
        const confirmation = await enhancedExecutorAgent(
          trade.symbol,
          trade.action,
          sizePercentage
        );
        
        // Check if execution is confirmed
        if (confirmation.confirmation.shouldExecute && confirmation.confirmation.confidence >= 60) {
          const riskReviewItem = riskReview.trade_reviews.find(
            r => r.trade.symbol === trade.symbol && r.trade.action === trade.action
          );
          
          // Create order details
          const orderDetails = await createExecutionOrder(trade, confirmation);
          
          tradesToExecute.push({
            trade,
            risk_review: riskReviewItem!,
            execution_confirmation: confirmation,
            order_details: orderDetails,
          });
        } else {
          console.log(`Trade ${trade.symbol} ${trade.action} not confirmed:`, 
            confirmation.confirmation.reasons);
        }
      } catch (error) {
        console.error(`Failed to process trade ${trade.symbol}:`, error);
      }
    }
    
    // Execute trades (simulated for now - would connect to broker API)
    for (const item of tradesToExecute) {
      if (item.order_details) {
        const result = await simulateExecution(item.order_details);
        executionResults.push(result);
      }
    }
    
    // Calculate summary
    const summary = calculateExecutionSummary(tradesToExecute, executionResults);
    
    // Generate warnings and recommendations
    const { warnings, recommendations } = generateExecutionInsights(
      tradesToExecute,
      executionResults,
      summary
    );
    
    return {
      plan_id: strategistPlan.plan_id,
      timestamp: new Date().toISOString(),
      trades_to_execute: tradesToExecute,
      execution_results: executionResults,
      summary,
      warnings,
      recommendations,
    };
    
  } catch (error) {
    console.error('Enhanced executor failed:', error);
    throw error;
  }
}

/**
 * Create execution order from trade and confirmation
 */
async function createExecutionOrder(
  trade: EnhancedTradeRecommendation,
  confirmation: any
): Promise<ExecutionOrder> {
  // Get current quote for price
  const quote = await getQuote(trade.symbol);
  const currentPrice = quote?.last || quote?.close || trade.execution_parameters.suggested_entry;
  
  // Determine order type based on confidence
  let order_type: 'market' | 'limit' | 'stop' = 'limit';
  let price: number | undefined;
  
  if (confirmation.confirmation.confidence >= 80) {
    // High confidence - use market order for immediate execution
    order_type = 'market';
  } else {
    // Medium confidence - use limit order for better price
    order_type = 'limit';
    price = trade.action === 'BUY' 
      ? currentPrice * 0.995 // Try to buy slightly cheaper
      : currentPrice * 1.005; // Try to sell slightly higher
  }
  
  // Generate client order ID
  const client_order_id = `cortex_${trade.symbol}_${trade.action}_${Date.now()}`;
  
  return {
    symbol: trade.symbol,
    action: trade.action,
    quantity: trade.shares,
    order_type,
    price,
    time_in_force: 'day',
    extended_hours: false,
    client_order_id,
  };
}

/**
 * Simulate trade execution (would connect to real broker API)
 */
async function simulateExecution(order: ExecutionOrder): Promise<ExecutionResult> {
  // Simulate execution with random outcomes
  const filled_quantity = Math.random() > 0.1 ? order.quantity : Math.floor(order.quantity * 0.8);
  const status = filled_quantity === order.quantity ? 'filled' : 
                filled_quantity > 0 ? 'partially_filled' : 'rejected';
  
  // Simulate price
  const currentPrice = await getCurrentPrice(order.symbol);
  const average_price = order.price || currentPrice;
  
  // Simulate commission
  const commission = calculateCommission(order.quantity, average_price);
  
  return {
    order,
    status,
    filled_quantity,
    average_price,
    commission,
    timestamp: new Date().toISOString(),
    message: status === 'filled' ? 'Order executed successfully' : 
             status === 'partially_filled' ? 'Order partially filled' : 'Order rejected',
  };
}

/**
 * Get current price for a symbol
 */
async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const quote = await getQuote(symbol);
    return quote?.last || quote?.close || 0;
  } catch (error) {
    console.warn(`Failed to get price for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Calculate commission for an order
 */
function calculateCommission(quantity: number, price: number): number {
  const tradeValue = quantity * price;
  // Simulated commission: $0.01 per share with $1 minimum
  const commission = Math.max(1, quantity * 0.01);
  return Math.min(commission, tradeValue * 0.01); // Cap at 1% of trade value
}

/**
 * Calculate execution summary
 */
function calculateExecutionSummary(
  tradesToExecute: EnhancedExecutionPlan['trades_to_execute'],
  executionResults: ExecutionResult[]
): EnhancedExecutionPlan['summary'] {
  const total_trades = tradesToExecute.length;
  const executed_trades = executionResults.filter(r => 
    r.status === 'filled' || r.status === 'partially_filled'
  ).length;
  const rejected_trades = executionResults.filter(r => r.status === 'rejected').length;
  
  const total_commission = executionResults.reduce((sum, r) => sum + r.commission, 0);
  
  // Estimate slippage (difference between expected and actual price)
  const estimated_slippage = executionResults.reduce((sum, r) => {
    const trade = tradesToExecute.find(t => t.trade.symbol === r.order.symbol);
    if (trade && r.average_price > 0) {
      const expected = trade.trade.execution_parameters.suggested_entry;
      const actual = r.average_price;
      const slippage = Math.abs((actual - expected) / expected) * 100;
      return sum + slippage;
    }
    return sum;
  }, 0) / Math.max(1, executed_trades);
  
  // Calculate overall confidence
  const overall_confidence = tradesToExecute.length > 0
    ? tradesToExecute.reduce((sum, t) => sum + t.trade.confidence, 0) / tradesToExecute.length
    : 0;
  
  return {
    total_trades,
    executed_trades,
    rejected_trades,
    total_commission,
    estimated_slippage,
    overall_confidence: Math.round(overall_confidence),
  };
}

/**
 * Generate execution insights
 */
function generateExecutionInsights(
  tradesToExecute: EnhancedExecutionPlan['trades_to_execute'],
  executionResults: ExecutionResult[],
  summary: EnhancedExecutionPlan['summary']
): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check for rejected trades
  if (summary.rejected_trades > 0) {
    warnings.push(`${summary.rejected_trades} trades were rejected`);
    recommendations.push('Review rejected trades and adjust parameters');
  }
  
  // Check for high slippage
  if (summary.estimated_slippage > 0.5) {
    warnings.push(`High estimated slippage: ${summary.estimated_slippage.toFixed(2)}%`);
    recommendations.push('Consider using limit orders to control execution price');
  }
  
  // Check for low confidence
  if (summary.overall_confidence < 70) {
    warnings.push(`Low overall confidence: ${summary.overall_confidence}%`);
    recommendations.push('Consider waiting for higher confidence signals');
  }
  
  // Check for large commission
  if (summary.total_commission > 10) {
    warnings.push(`High total commission: $${summary.total_commission.toFixed(2)}`);
    recommendations.push('Consider consolidating trades to reduce commission costs');
  }
  
  // Check for partial fills
  const partialFills = executionResults.filter(r => r.status === 'partially_filled');
  if (partialFills.length > 0) {
    warnings.push(`${partialFills.length} trades were partially filled`);
    recommendations.push('Monitor partially filled positions and consider completing orders');
  }
  
  // Success metrics
  if (summary.executed_trades > 0) {
    recommendations.push(`${summary.executed_trades} trades executed successfully`);
  }
  
  if (summary.overall_confidence >= 80) {
    recommendations.push('High confidence execution - monitor positions as planned');
  }
  
  return { warnings, recommendations };
}

/**
 * Main export - enhanced executor function
 */
export default enhancedExecutor;