/**
 * BROKER EXECUTOR
 * Executes approved trades on user's connected broker
 */

import { Pool } from 'pg';
import alpaca from '../integrations/alpaca';
import { decrypt } from '../credential-vault';
import type { QueuedTrade } from './trade-queue';

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  fillPrice?: number;
  fillQuantity?: number;
  executedAt?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Execute an approved trade on user's broker
 */
export async function executeApprovedTrade(
  trade: QueuedTrade,
  db: Pool
): Promise<ExecutionResult> {
  try {
    // 1. Get user's broker credentials
    const credsResult = await db.query(
      `SELECT broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id
       FROM broker_credentials
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [trade.userId]
    );

    if (credsResult.rows.length === 0) {
      return {
        success: false,
        error: 'No active broker connection found',
        errorCode: 'NO_BROKER',
      };
    }

    const broker = credsResult.rows[0];

    // 2. Route to correct broker
    let result: ExecutionResult;

    if (broker.broker_type === 'alpaca') {
      result = await executeOnAlpaca(trade, broker);
    } else if (broker.broker_type === 'tradier') {
      result = await executeOnTradier(trade, broker);
    } else if (broker.broker_type === 'robinhood') {
      result = await executeOnRobinhood(trade, broker);
    } else {
      return {
        success: false,
        error: `Unsupported broker: ${broker.broker_type}`,
        errorCode: 'UNSUPPORTED_BROKER',
      };
    }

    // 3. Update trade queue with result
    await db.query(
      `UPDATE trade_queue
       SET status = $1, execution_result = $2, executed_at = NOW()
       WHERE id = $3`,
      [result.success ? 'executed' : 'failed', JSON.stringify(result), trade.id]
    );

    // 4. Log to user's trade history
    if (result.success) {
      await db.query(
        `INSERT INTO trade_history 
         (user_id, symbol, action, quantity, fill_price, order_id, executed_at, decision_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          trade.userId,
          trade.decision.symbol,
          trade.decision.action,
          trade.decision.quantity,
          result.fillPrice,
          result.orderId,
          result.executedAt,
          trade.decision.id,
        ]
      );
    }

    return result;
  } catch (error: any) {
    console.error('Trade execution failed:', error);
    
    await db.query(
      `UPDATE trade_queue
       SET status = 'failed', execution_result = $1
       WHERE id = $2`,
      [JSON.stringify({ success: false, error: error.message }), trade.id]
    );

    return {
      success: false,
      error: error.message,
      errorCode: 'EXECUTION_ERROR',
    };
  }
}

/**
 * Execute on Alpaca
 */
async function executeOnAlpaca(
  trade: QueuedTrade,
  broker: any
): Promise<ExecutionResult> {
  try {
    const { decision } = trade;

    // Determine order type
    let orderType: 'market' | 'limit' = 'market';
    let limitPrice: number | undefined;

    // For stocks/ETFs, use market orders
    if (decision.instrumentType === 'stock' || decision.instrumentType === 'etf') {
      orderType = 'market';
    }

    // For options, use limit orders
    if (decision.instrumentType === 'option') {
      orderType = 'limit';
      // Use decision price or default to $5
      limitPrice = (decision as any).price || 5.00;
    }

    // Place order via Alpaca API
    const order = await alpaca.placeOrder({
      symbol: decision.symbol,
      qty: decision.quantity,
      side: decision.action === 'buy' ? 'buy' : 'sell',
      type: orderType,
      time_in_force: 'day',
      limit_price: limitPrice,
    });

    // Wait for fill (simplified - in production poll order status)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      success: true,
      orderId: order.id,
      fillPrice: order.filled_avg_price ? Number(order.filled_avg_price) : undefined,
      fillQuantity: order.filled_qty ? Number(order.filled_qty) : undefined,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Alpaca execution failed',
      errorCode: 'ALPACA_ERROR',
    };
  }
}

/**
 * Execute on Tradier
 */
async function executeOnTradier(
  trade: QueuedTrade,
  broker: any
): Promise<ExecutionResult> {
  try {
    const { decision } = trade;

    // Decrypt Tradier API key
    const apiKey = decrypt(broker.encrypted_api_key, broker.encryption_iv);

    // Tradier API call (simplified)
    const response = await fetch(`https://api.tradier.com/v1/accounts/${broker.account_id}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        class: decision.instrumentType === 'option' ? 'option' : 'equity',
        symbol: decision.symbol,
        side: decision.action,
        quantity: decision.quantity.toString(),
        type: 'market',
        duration: 'day',
      }),
    });

    if (!response.ok) {
      throw new Error(`Tradier API error: ${response.status}`);
    }

    const result = await response.json() as any;

    return {
      success: true,
      orderId: result.order?.id,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Tradier execution failed',
      errorCode: 'TRADIER_ERROR',
    };
  }
}

/**
 * Execute on Robinhood (using robin_stocks)
 */
async function executeOnRobinhood(
  trade: QueuedTrade,
  broker: any
): Promise<ExecutionResult> {
  try {
    const { decision } = trade;
    const robinhood = await import('../integrations/robinhood');

    // Decrypt Robinhood credentials
    const username = decrypt(broker.encrypted_api_key, broker.encryption_iv);
    const password = decrypt(broker.encrypted_api_secret, broker.encryption_iv);

    // Place order via robin_stocks
    const result = await robinhood.default.placeOrder(username, password, {
      symbol: decision.symbol,
      side: decision.action,
      quantity: decision.quantity,
      type: decision.instrumentType === 'option' ? 'limit' : 'market',
      price: decision.price || 0, // Use 0 as default for market orders
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Robinhood order failed',
        errorCode: 'ROBINHOOD_ERROR',
      };
    }

    return {
      success: true,
      orderId: result.orderId,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Robinhood execution failed',
      errorCode: 'ROBINHOOD_ERROR',
    };
  }
}

/**
 * Process all pending approved trades
 */
export async function processApprovedTrades(db: Pool): Promise<void> {
  const result = await db.query(
    `SELECT * FROM trade_queue
     WHERE status = 'approved'
     ORDER BY queued_at ASC
     LIMIT 10`
  );

  for (const row of result.rows) {
    const trade: QueuedTrade = {
      id: row.id,
      userId: row.user_id,
      tier: row.tier,
      decision: JSON.parse(row.decision_data),
      status: row.status,
      approvalRequired: row.approval_required,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      queuedAt: row.queued_at,
    };

    console.log(`Executing trade ${trade.id} for user ${trade.userId}`);
    const result = await executeApprovedTrade(trade, db);
    
    if (result.success) {
      console.log(`✅ Trade executed: ${trade.decision.symbol} ${trade.decision.action}`);
    } else {
      console.error(`❌ Trade failed: ${result.error}`);
    }
  }
}
