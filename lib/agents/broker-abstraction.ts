/**
 * BROKER ABSTRACTION LAYER
 * 
 * Unified interface for all brokers:
 * - SnapTrade (Schwab, Fidelity, TD Ameritrade, etc.)
 * - Robinhood (unofficial API for full execution)
 * - Tradier (direct API)
 * 
 * Agents call this layer, not broker-specific APIs.
 */

import { sql } from '@/lib/db';

// Types
export interface BrokerPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface BrokerBalance {
  totalValue: number;
  cashBalance: number;
  buyingPower: number;
  dayTradeCount?: number;
}

export interface BrokerOrder {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
  filledQuantity?: number;
  avgFillPrice?: number;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
}

// Get user's broker type and credentials
async function getUserBroker(userId: string): Promise<{
  type: 'snaptrade' | 'robinhood' | 'webull' | 'tradier';
  accountId: string;
  credentials: any;
}> {
  // Check for connected accounts
  const result = await sql`
    SELECT 
      broker_type,
      account_id,
      snaptrade_user_id,
      snaptrade_user_secret,
      credentials_encrypted
    FROM user_broker_accounts
    WHERE user_id = ${userId}
    AND is_active = true
    LIMIT 1
  `;
  
  if (result.length === 0) {
    throw new Error('No broker connected for user');
  }
  
  const account = result[0];
  
  return {
    type: account.broker_type || 'snaptrade',
    accountId: account.account_id,
    credentials: {
      snaptradeUserId: account.snaptrade_user_id,
      snaptradeUserSecret: account.snaptrade_user_secret,
      encrypted: account.credentials_encrypted
    }
  };
}

// ============================================================================
// SNAPTRADE IMPLEMENTATION
// ============================================================================

async function snaptradeGetPositions(userId: string, userSecret: string, accountId: string): Promise<BrokerPosition[]> {
  const { SnapTrade } = await import('snaptrade-typescript-sdk');
  
  const snaptrade = new SnapTrade({
    clientId: process.env.SNAPTRADE_CLIENT_ID!,
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
  });
  
  const response = await snaptrade.accountInformation.getUserAccountPositions({
    userId,
    userSecret,
    accountId,
  });
  
  return (response.data || []).map((pos: any) => ({
    symbol: pos.symbol?.symbol || pos.symbol,
    quantity: pos.units || 0,
    averageCost: pos.averagePrice || 0,
    currentPrice: pos.price || 0,
    marketValue: (pos.units || 0) * (pos.price || 0),
    unrealizedPnL: pos.openPnl || 0,
    unrealizedPnLPercent: pos.averagePrice > 0 
      ? ((pos.price - pos.averagePrice) / pos.averagePrice) * 100 
      : 0,
  }));
}

async function snaptradeGetBalances(userId: string, userSecret: string, accountId: string): Promise<BrokerBalance> {
  const { SnapTrade } = await import('snaptrade-typescript-sdk');
  
  const snaptrade = new SnapTrade({
    clientId: process.env.SNAPTRADE_CLIENT_ID!,
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
  });
  
  const response = await snaptrade.accountInformation.getUserAccountBalance({
    userId,
    userSecret,
    accountId,
  });
  
  const balance = response.data;
  
  return {
    totalValue: balance?.totalValue || 0,
    cashBalance: balance?.cash || 0,
    buyingPower: balance?.buyingPower || balance?.cash || 0,
  };
}

async function snaptradeTradeOrder(
  userId: string, 
  userSecret: string, 
  accountId: string, 
  params: PlaceOrderParams
): Promise<BrokerOrder> {
  const { SnapTrade } = await import('snaptrade-typescript-sdk');
  
  const snaptrade = new SnapTrade({
    clientId: process.env.SNAPTRADE_CLIENT_ID!,
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
  });
  
  // Place order via SnapTrade
  const response = await snaptrade.trading.placeOrder({
    userId,
    userSecret,
    accountId,
    action: params.side === 'buy' ? 'BUY' : 'SELL',
    orderType: params.orderType === 'limit' ? 'Limit' : 'Market',
    timeInForce: 'Day',
    universalSymbolId: params.symbol, // May need symbol lookup
    units: params.quantity,
    price: params.limitPrice,
  });
  
  const order = response.data;
  
  return {
    orderId: order?.brokerageOrderId || 'pending',
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity,
    orderType: params.orderType,
    limitPrice: params.limitPrice,
    status: order?.status === 'Executed' ? 'filled' : 'pending',
  };
}

// ============================================================================
// ROBINHOOD IMPLEMENTATION (Unofficial API)
// ============================================================================

async function robinhoodGetPositions(credentials: any): Promise<BrokerPosition[]> {
  // Import robinhood unofficial client
  // This uses the credentials stored (username/password or token)
  
  const baseUrl = 'https://api.robinhood.com';
  const token = credentials.accessToken;
  
  const response = await fetch(`${baseUrl}/positions/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Robinhood API error: ${response.status}`);
  }
  
  const data = await response.json();
  const positions: BrokerPosition[] = [];
  
  for (const pos of data.results || []) {
    if (parseFloat(pos.quantity) > 0) {
      // Get instrument details
      const instrumentResp = await fetch(pos.instrument, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const instrument = await instrumentResp.json();
      
      // Get current price
      const quoteResp = await fetch(`${baseUrl}/quotes/${instrument.symbol}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const quote = await quoteResp.json();
      
      const quantity = parseFloat(pos.quantity);
      const avgCost = parseFloat(pos.average_buy_price);
      const currentPrice = parseFloat(quote.last_trade_price);
      
      positions.push({
        symbol: instrument.symbol,
        quantity,
        averageCost: avgCost,
        currentPrice,
        marketValue: quantity * currentPrice,
        unrealizedPnL: (currentPrice - avgCost) * quantity,
        unrealizedPnLPercent: ((currentPrice - avgCost) / avgCost) * 100,
      });
    }
  }
  
  return positions;
}

async function robinhoodGetBalances(credentials: any): Promise<BrokerBalance> {
  const baseUrl = 'https://api.robinhood.com';
  const token = credentials.accessToken;
  
  const response = await fetch(`${baseUrl}/accounts/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Robinhood API error: ${response.status}`);
  }
  
  const data = await response.json();
  const account = data.results?.[0];
  
  return {
    totalValue: parseFloat(account?.portfolio_cash || '0') + parseFloat(account?.market_value || '0'),
    cashBalance: parseFloat(account?.cash || '0'),
    buyingPower: parseFloat(account?.buying_power || '0'),
    dayTradeCount: account?.num_day_trades || 0,
  };
}

async function robinhoodPlaceOrder(credentials: any, params: PlaceOrderParams): Promise<BrokerOrder> {
  const baseUrl = 'https://api.robinhood.com';
  const token = credentials.accessToken;
  
  // Get instrument URL for symbol
  const searchResp = await fetch(`${baseUrl}/instruments/?symbol=${params.symbol}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const searchData = await searchResp.json();
  const instrument = searchData.results?.[0]?.url;
  
  if (!instrument) {
    throw new Error(`Symbol not found: ${params.symbol}`);
  }
  
  // Get account URL
  const accountResp = await fetch(`${baseUrl}/accounts/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const accountData = await accountResp.json();
  const account = accountData.results?.[0]?.url;
  
  // Place order
  const orderBody: any = {
    account,
    instrument,
    symbol: params.symbol,
    type: params.orderType,
    time_in_force: 'gfd',
    trigger: 'immediate',
    quantity: params.quantity.toString(),
    side: params.side,
  };
  
  if (params.orderType === 'limit' && params.limitPrice) {
    orderBody.price = params.limitPrice.toFixed(2);
  }
  
  const response = await fetch(`${baseUrl}/orders/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderBody),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Robinhood order failed: ${JSON.stringify(error)}`);
  }
  
  const order = await response.json();
  
  return {
    orderId: order.id,
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity,
    orderType: params.orderType,
    limitPrice: params.limitPrice,
    status: order.state === 'filled' ? 'filled' : 'pending',
    filledQuantity: parseFloat(order.cumulative_quantity || '0'),
    avgFillPrice: parseFloat(order.average_price || '0'),
  };
}

// ============================================================================
// TRADIER IMPLEMENTATION
// ============================================================================

async function tradierGetPositions(accountId: string): Promise<BrokerPosition[]> {
  const { getPositions, getQuotes } = await import('../integrations/tradier');
  
  const positions = await getPositions(accountId);
  const symbols = positions.map(p => p.symbol);
  const quotes = await getQuotes(symbols);
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
  
  return positions.map(pos => {
    const quote = quoteMap.get(pos.symbol);
    const currentPrice = quote?.last || quote?.close || 0;
    const marketValue = pos.quantity * currentPrice;
    const unrealizedPnL = marketValue - pos.cost_basis;
    
    return {
      symbol: pos.symbol,
      quantity: pos.quantity,
      averageCost: pos.cost_basis / pos.quantity,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent: pos.cost_basis > 0 ? (unrealizedPnL / pos.cost_basis) * 100 : 0,
    };
  });
}

async function tradierGetBalances(accountId: string): Promise<BrokerBalance> {
  const { getBalances } = await import('../integrations/tradier');
  
  const balance = await getBalances(accountId);
  
  return {
    totalValue: balance.total_equity,
    cashBalance: balance.cash.cash_available,
    buyingPower: balance.margin?.stock_buying_power || balance.cash.cash_available,
  };
}

// ============================================================================
// UNIFIED PUBLIC API
// ============================================================================

/**
 * Get positions for a user (automatically routes to correct broker)
 */
export async function getPositions(userId: string): Promise<BrokerPosition[]> {
  const broker = await getUserBroker(userId);
  
  switch (broker.type) {
    case 'snaptrade':
      return snaptradeGetPositions(
        broker.credentials.snaptradeUserId,
        broker.credentials.snaptradeUserSecret,
        broker.accountId
      );
    
    case 'robinhood':
      return robinhoodGetPositions(broker.credentials);
    
    case 'tradier':
      return tradierGetPositions(broker.accountId);
    
    case 'webull':
      // Webull via SnapTrade
      return snaptradeGetPositions(
        broker.credentials.snaptradeUserId,
        broker.credentials.snaptradeUserSecret,
        broker.accountId
      );
    
    default:
      throw new Error(`Unknown broker type: ${broker.type}`);
  }
}

/**
 * Get balances for a user (automatically routes to correct broker)
 */
export async function getBalances(userId: string): Promise<BrokerBalance> {
  const broker = await getUserBroker(userId);
  
  switch (broker.type) {
    case 'snaptrade':
      return snaptradeGetBalances(
        broker.credentials.snaptradeUserId,
        broker.credentials.snaptradeUserSecret,
        broker.accountId
      );
    
    case 'robinhood':
      return robinhoodGetBalances(broker.credentials);
    
    case 'tradier':
      return tradierGetBalances(broker.accountId);
    
    case 'webull':
      // Webull via SnapTrade
      return snaptradeGetBalances(
        broker.credentials.snaptradeUserId,
        broker.credentials.snaptradeUserSecret,
        broker.accountId
      );
    
    default:
      throw new Error(`Unknown broker type: ${broker.type}`);
  }
}

/**
 * Place an order for a user (automatically routes to correct broker)
 */
export async function placeOrder(userId: string, params: PlaceOrderParams): Promise<BrokerOrder> {
  const broker = await getUserBroker(userId);
  
  // Log for audit
  console.log(`[BROKER] Placing order for user ${userId}:`, params);
  
  switch (broker.type) {
    case 'robinhood':
      return robinhoodPlaceOrder(broker.credentials, params);
    
    case 'webull':
      // Webull via SnapTrade - FULL EXECUTION SUPPORTED (Dec 2025 partnership)
      return snaptradeTradeOrder(
        broker.credentials.snaptradeUserId,
        broker.credentials.snaptradeUserSecret,
        broker.accountId,
        params
      );
    
    case 'tradier':
      // TODO: Implement Tradier order placement
      throw new Error('Tradier order placement not implemented yet');
    
    case 'snaptrade':
      // SnapTrade supports trading for some brokers
      // TODO: Check if this specific broker supports trading via SnapTrade
      throw new Error('SnapTrade order placement - check broker support');
    
    default:
      throw new Error(`Unknown broker type: ${broker.type}`);
  }
}

/**
 * Check if broker supports full execution
 */
export function supportsExecution(brokerType: string): boolean {
  switch (brokerType) {
    case 'robinhood':
      return true; // Unofficial API
    case 'webull':
      return true; // Via SnapTrade - FULL EXECUTION (Dec 2025 partnership)
    case 'tradier':
      return true; // Direct API
    case 'snaptrade':
      return false; // Mostly read-only, depends on connected broker
    default:
      return false;
  }
}

export default {
  getPositions,
  getBalances,
  placeOrder,
  supportsExecution,
};

// ============================================================================
// WEBULL IMPLEMENTATION (Unofficial API)
// ============================================================================

async function webullGetPositions(credentials: any): Promise<BrokerPosition[]> {
  const baseUrl = 'https://ustrade.webullfinance.com/api';
  
  const response = await fetch(`${baseUrl}/trading/v1/webull/account/positions`, {
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'did': credentials.did,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Webull API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return (data.positions || []).map((pos: any) => ({
    symbol: pos.ticker?.symbol || pos.symbol,
    quantity: parseFloat(pos.position || '0'),
    averageCost: parseFloat(pos.costPrice || '0'),
    currentPrice: parseFloat(pos.lastPrice || '0'),
    marketValue: parseFloat(pos.marketValue || '0'),
    unrealizedPnL: parseFloat(pos.unrealizedProfitLoss || '0'),
    unrealizedPnLPercent: parseFloat(pos.unrealizedProfitLossRate || '0') * 100,
  }));
}

async function webullGetBalances(credentials: any): Promise<BrokerBalance> {
  const baseUrl = 'https://ustrade.webullfinance.com/api';
  
  const response = await fetch(`${baseUrl}/trading/v1/webull/account/accountInfo`, {
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'did': credentials.did,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Webull API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    totalValue: parseFloat(data.netLiquidation || '0'),
    cashBalance: parseFloat(data.totalCash || '0'),
    buyingPower: parseFloat(data.dayBuyingPower || data.buyingPower || '0'),
    dayTradeCount: data.dayTradesRemaining ? 3 - data.dayTradesRemaining : undefined,
  };
}

async function webullPlaceOrder(credentials: any, params: PlaceOrderParams): Promise<BrokerOrder> {
  const baseUrl = 'https://ustrade.webullfinance.com/api';
  
  // Get ticker ID for symbol
  const searchResp = await fetch(`${baseUrl}/search/ticker?keyword=${params.symbol}`, {
    headers: {
      'did': credentials.did,
    },
  });
  const searchData = await searchResp.json();
  const tickerId = searchData?.data?.[0]?.tickerId;
  
  if (!tickerId) {
    throw new Error(`Symbol not found: ${params.symbol}`);
  }
  
  const orderBody = {
    action: params.side.toUpperCase(),
    orderType: params.orderType === 'limit' ? 'LMT' : 'MKT',
    tickerId,
    quantity: params.quantity,
    timeInForce: 'DAY',
    outsideRegularTradingHour: false,
    ...(params.orderType === 'limit' && params.limitPrice && { lmtPrice: params.limitPrice }),
  };
  
  const response = await fetch(`${baseUrl}/trading/v1/webull/order/placeOrder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'did': credentials.did,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderBody),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Webull order failed: ${JSON.stringify(error)}`);
  }
  
  const order = await response.json();
  
  return {
    orderId: order.orderId || order.data?.orderId,
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity,
    orderType: params.orderType,
    limitPrice: params.limitPrice,
    status: 'pending',
  };
}
