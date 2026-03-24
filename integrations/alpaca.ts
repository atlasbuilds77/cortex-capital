// Cortex Capital - Alpaca API Integration
// Paper trading + live trading support
// Docs: https://docs.alpaca.markets

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ALPACA_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET = process.env.ALPACA_SECRET;
const IS_PAPER = process.env.ALPACA_PAPER !== 'false'; // Default to paper

const BASE_URL = IS_PAPER 
  ? 'https://paper-api.alpaca.markets'
  : 'https://api.alpaca.markets';

const DATA_URL = 'https://data.alpaca.markets';

// Interfaces
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  current_price: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: 'long' | 'short';
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  qty: string;
  filled_qty: string;
  status: string;
  created_at: string;
  filled_at: string | null;
  filled_avg_price: string | null;
}

export interface PlaceOrderParams {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
}

// Create client
let alpacaClient: AxiosInstance | null = null;
let alpacaDataClient: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!alpacaClient) {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      throw new Error('Alpaca API credentials not configured');
    }
    
    alpacaClient = axios.create({
      baseURL: BASE_URL,
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
  }
  return alpacaClient;
}

function getDataClient(): AxiosInstance {
  if (!alpacaDataClient) {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      throw new Error('Alpaca API credentials not configured');
    }
    
    alpacaDataClient = axios.create({
      baseURL: DATA_URL,
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
  }
  return alpacaDataClient;
}

// Account Functions
export async function getAccount(): Promise<AlpacaAccount> {
  const response = await getClient().get('/v2/account');
  return response.data;
}

export async function getPositions(): Promise<AlpacaPosition[]> {
  const response = await getClient().get('/v2/positions');
  return response.data;
}

export async function getPosition(symbol: string): Promise<AlpacaPosition | null> {
  try {
    const response = await getClient().get(`/v2/positions/${symbol}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Order Functions
export async function placeOrder(params: PlaceOrderParams): Promise<AlpacaOrder> {
  const orderData: any = {
    symbol: params.symbol,
    qty: params.qty.toString(),
    side: params.side,
    type: params.type,
    time_in_force: params.time_in_force,
  };
  
  if (params.limit_price) {
    orderData.limit_price = params.limit_price.toString();
  }
  if (params.stop_price) {
    orderData.stop_price = params.stop_price.toString();
  }
  
  console.log(`[Alpaca] Placing ${params.side} order: ${params.qty} ${params.symbol} @ ${params.type}`);
  
  const response = await getClient().post('/v2/orders', orderData);
  return response.data;
}

export async function getOrders(status: 'open' | 'closed' | 'all' = 'all'): Promise<AlpacaOrder[]> {
  const response = await getClient().get('/v2/orders', {
    params: { status },
  });
  return response.data;
}

export async function cancelOrder(orderId: string): Promise<void> {
  await getClient().delete(`/v2/orders/${orderId}`);
}

export async function cancelAllOrders(): Promise<void> {
  await getClient().delete('/v2/orders');
}

// Close position
export async function closePosition(symbol: string): Promise<AlpacaOrder> {
  const response = await getClient().delete(`/v2/positions/${symbol}`);
  return response.data;
}

export async function closeAllPositions(): Promise<void> {
  await getClient().delete('/v2/positions');
}

// Market Data
export async function getLatestQuote(symbol: string): Promise<{
  ask_price: number;
  bid_price: number;
  ask_size: number;
  bid_size: number;
}> {
  const response = await getDataClient().get(`/v2/stocks/${symbol}/quotes/latest`);
  return response.data.quote;
}

export async function getLatestTrade(symbol: string): Promise<{
  price: number;
  size: number;
  timestamp: string;
}> {
  const response = await getDataClient().get(`/v2/stocks/${symbol}/trades/latest`);
  const trade = response.data.trade;
  return {
    price: trade.p,
    size: trade.s,
    timestamp: trade.t,
  };
}

// Check if configured
export function isConfigured(): boolean {
  return !!(ALPACA_KEY && ALPACA_SECRET);
}

export function isPaperTrading(): boolean {
  return IS_PAPER;
}

// Export for use in executor
export default {
  getAccount,
  getPositions,
  getPosition,
  placeOrder,
  getOrders,
  cancelOrder,
  cancelAllOrders,
  closePosition,
  closeAllPositions,
  getLatestQuote,
  getLatestTrade,
  isConfigured,
  isPaperTrading,
};
