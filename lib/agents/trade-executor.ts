/**
 * TRADE EXECUTOR
 * 
 * Executes trades for users. Used by:
 * 1. Auto-trading daemon (immediate execution)
 * 2. Approval service (after user approves)
 */

import * as brokerService from '../services/broker-service';
import { query } from '../db';
import { notifyTradeExecution } from '../notifications/trade-notifier';
import { TradeData } from '../approvals/types';

interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

/**
 * Execute a trade for a user
 */
export async function executeTradeForUser(
  userId: string,
  trade: TradeData
): Promise<ExecutionResult> {
  try {
    console.log(`[TradeExecutor] Executing ${trade.action} ${trade.quantity} ${trade.symbol} for user ${userId}`);
    
    // Get user's broker connection
    const userResult = await query(
      `SELECT u.id, u.email, bc.snaptrade_user_id, bc.snaptrade_user_secret, bc.account_id
       FROM users u
       JOIN broker_connections bc ON bc.user_id = u.id
       WHERE u.id = $1 AND bc.status = 'active'
       LIMIT 1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return { success: false, error: 'No active broker connection' };
    }
    
    const user = userResult.rows[0];
    
    // Place the order via SnapTrade
    const orderResult = await brokerService.placeOrder(
      user.snaptrade_user_id,
      user.snaptrade_user_secret,
      user.account_id,
      {
        symbol: trade.isOption && trade.optionSymbol ? trade.optionSymbol : trade.symbol,
        action: trade.action,
        quantity: trade.quantity,
        orderType: 'market',
      }
    );
    
    if (!orderResult.success) {
      console.error(`[TradeExecutor] Order failed for ${trade.symbol}:`, orderResult.error);
      return { success: false, error: orderResult.error };
    }
    
    // Log to trade_logs
    await query(
      `INSERT INTO trade_logs (
        user_id, symbol, action, quantity, price, status, 
        order_id, is_option, option_symbol, reason, executed_at
      ) VALUES ($1, $2, $3, $4, $5, 'executed', $6, $7, $8, $9, NOW())`,
      [
        userId,
        trade.symbol,
        trade.action,
        trade.quantity,
        trade.estimatedPrice || 0,
        orderResult.orderId,
        trade.isOption || false,
        trade.optionSymbol || null,
        trade.reason || 'Approved trade execution',
      ]
    );
    
    // Send notification
    await notifyTradeExecution(
      userId,
      trade.symbol,
      trade.action,
      trade.quantity,
      trade.estimatedPrice || 0,
      trade.reason || 'Trade executed'
    );
    
    console.log(`[TradeExecutor] Successfully executed ${trade.symbol} for user ${userId}`);
    
    return { success: true, orderId: orderResult.orderId };
    
  } catch (error: any) {
    console.error(`[TradeExecutor] Error executing trade:`, error.message);
    return { success: false, error: error.message };
  }
}

export default { executeTradeForUser };
