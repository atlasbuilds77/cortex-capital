/**
 * Robinhood Integration via robin-stocks Python library
 * 
 * This module provides a bridge to execute trades on Robinhood
 * by calling a Python microservice that uses robin-stocks.
 */

import crypto from 'crypto';
import { query } from '@/lib/db';

// Encryption config
const ENCRYPTION_KEY = process.env.BROKER_ENCRYPTION_KEY || '';
const ROBINHOOD_SERVICE_URL = process.env.ROBINHOOD_SERVICE_URL || 'http://localhost:8080';

/**
 * Decrypt stored credentials
 */
function decrypt(encrypted: string, iv: string, tag: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('BROKER_ENCRYPTION_KEY not set');
  }
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get decrypted Robinhood credentials for a user
 */
export async function getRobinhoodCredentials(userId: string): Promise<{
  username: string;
  password: string;
} | null> {
  try {
    const result = await query(
      `SELECT 
        encrypted_username, username_iv, username_tag,
        encrypted_password, password_iv, password_tag
       FROM broker_credentials 
       WHERE user_id = $1 AND broker = 'robinhood'`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      username: decrypt(row.encrypted_username, row.username_iv, row.username_tag),
      password: decrypt(row.encrypted_password, row.password_iv, row.password_tag),
    };
  } catch (error) {
    console.error('Failed to get Robinhood credentials:', error);
    return null;
  }
}

/**
 * Trade order types
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type TimeInForce = 'gfd' | 'gtc' | 'ioc' | 'opg';

export interface TradeOrder {
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  status?: string;
  filledQuantity?: number;
  filledPrice?: number;
  error?: string;
}

/**
 * Execute a trade via the Robinhood Python service
 */
export async function executeTrade(
  userId: string,
  order: TradeOrder
): Promise<TradeResult> {
  try {
    // Get credentials
    const credentials = await getRobinhoodCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'No Robinhood credentials found' };
    }
    
    // Call Python microservice
    const response = await fetch(`${ROBINHOOD_SERVICE_URL}/api/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.ROBINHOOD_SERVICE_KEY || '',
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        order: {
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          order_type: order.orderType,
          limit_price: order.limitPrice,
          stop_price: order.stopPrice,
          time_in_force: order.timeInForce || 'gfd',
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Trade service error: ${error}` };
    }
    
    const result = await response.json();
    
    // Log the trade
    await logTrade(userId, order, result);
    
    return {
      success: true,
      orderId: result.order_id,
      status: result.status,
      filledQuantity: result.filled_quantity,
      filledPrice: result.filled_price,
    };
  } catch (error: any) {
    console.error('Trade execution failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get account info from Robinhood
 */
export async function getAccountInfo(userId: string): Promise<{
  success: boolean;
  data?: {
    buyingPower: number;
    portfolioValue: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      averageCost: number;
      currentPrice: number;
      todayChange: number;
    }>;
  };
  error?: string;
}> {
  try {
    const credentials = await getRobinhoodCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'No Robinhood credentials found' };
    }
    
    const response = await fetch(`${ROBINHOOD_SERVICE_URL}/api/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.ROBINHOOD_SERVICE_KEY || '',
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Account service error: ${error}` };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: {
        buyingPower: result.buying_power,
        portfolioValue: result.portfolio_value,
        positions: result.positions.map((p: any) => ({
          symbol: p.symbol,
          quantity: p.quantity,
          averageCost: p.average_cost,
          currentPrice: p.current_price,
          todayChange: p.today_change,
        })),
      },
    };
  } catch (error: any) {
    console.error('Account info failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log trade to database
 */
async function logTrade(userId: string, order: TradeOrder, result: any): Promise<void> {
  try {
    await query(
      `INSERT INTO trade_logs 
       (user_id, broker, symbol, side, quantity, order_type, status, order_id, filled_price, created_at)
       VALUES ($1, 'robinhood', $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        order.symbol,
        order.side,
        order.quantity,
        order.orderType,
        result.status || 'pending',
        result.order_id || null,
        result.filled_price || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log trade:', error);
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(userId: string, orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const credentials = await getRobinhoodCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'No Robinhood credentials found' };
    }
    
    const response = await fetch(`${ROBINHOOD_SERVICE_URL}/api/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.ROBINHOOD_SERVICE_KEY || '',
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        order_id: orderId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Cancel failed: ${error}` };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Order cancel failed:', error);
    return { success: false, error: error.message };
  }
}
