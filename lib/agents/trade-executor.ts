/**
 * TRADE EXECUTOR
 *
 * Executes approved trades for a user.
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

    const result = await brokerService.executeUserTrade(userId, {
      symbol: trade.symbol,
      side: trade.action,
      qty: trade.quantity,
      type: 'market',
      ...(trade.isOption
        ? {
            isOption: true,
            optionSymbol: trade.optionSymbol,
          }
        : {}),
    });

    if (!result.success) {
      const err = result.error || 'Trade execution failed';
      console.error(`[TradeExecutor] Order failed for ${trade.symbol}:`, err);
      return { success: false, error: err };
    }

    // Keep log schema aligned with auto-trading daemon inserts.
    await query(
      `INSERT INTO trade_logs (
        user_id,
        broker,
        symbol,
        side,
        quantity,
        order_type,
        status,
        order_id,
        filled_price,
        filled_quantity,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        userId,
        trade.isOption ? 'snaptrade_options' : 'approval_execution',
        trade.symbol,
        trade.action,
        trade.quantity,
        'market',
        'filled',
        result.orderId || null,
        trade.estimatedPrice || result.avgPrice || null,
        trade.quantity,
      ]
    );

    await notifyTradeExecution({
      userId,
      symbol: trade.symbol,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.estimatedPrice || result.avgPrice || 0,
      reason: trade.reason || 'Approved trade execution',
    });

    console.log(`[TradeExecutor] Successfully executed ${trade.symbol} for user ${userId}`);
    return { success: true, orderId: result.orderId };
  } catch (error: any) {
    console.error('[TradeExecutor] Error executing trade:', error?.message || error);
    return { success: false, error: error?.message || 'Unknown execution error' };
  }
}

export default { executeTradeForUser };
