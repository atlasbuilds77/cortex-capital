/**
 * SnapTrade Integration for Cortex Capital
 * 
 * Universal broker connection API supporting:
 * - Wealthsimple (Canadian)
 * - Webull US
 * - Schwab
 * - Questrade
 * - And 20+ other brokers
 * 
 * Docs: https://docs.snaptrade.com
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';

const SNAPTRADE_CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID || 'ZERO-G-TRADING-XSJQB';
const SNAPTRADE_CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY || 'geLGVwBH7yG6PLhNzrDPJ9aKtfEZpcXNRKmhV954XCPQamx4H1';

// Initialize SnapTrade client
const snaptrade = new Snaptrade({
  clientId: SNAPTRADE_CLIENT_ID,
  consumerKey: SNAPTRADE_CONSUMER_KEY,
});

export { snaptrade };

/**
 * Register a new SnapTrade user (one per Cortex user)
 * @param userId - Unique user ID (use Cortex user ID, NOT email)
 * @returns userSecret - Store this securely, needed for all user operations
 */
export async function registerUser(userId: string): Promise<{ userId: string; userSecret: string }> {
  const response = await snaptrade.authentication.registerSnapTradeUser({
    userId,
  });
  return {
    userId: response.data.userId!,
    userSecret: response.data.userSecret!,
  };
}

/**
 * Delete a SnapTrade user and all their connections
 */
export async function deleteUser(userId: string): Promise<void> {
  await snaptrade.authentication.deleteSnapTradeUser({ userId });
}

/**
 * Generate connection portal URL for user to link their broker
 * @param userId - SnapTrade user ID
 * @param userSecret - SnapTrade user secret
 * @param connectionType - 'read' for data only, 'trade' for full execution
 * @param redirectUri - Where to redirect after connection (optional)
 */
export async function getConnectionPortalUrl(
  userId: string,
  userSecret: string,
  connectionType: 'read' | 'trade' = 'trade',
  redirectUri?: string
): Promise<string> {
  const response = await snaptrade.authentication.loginSnapTradeUser({
    userId,
    userSecret,
    connectionType,
    ...(redirectUri && { customRedirect: redirectUri }),
  });
  return response.data.redirectURI!;
}

/**
 * List all broker connections for a user
 */
export async function listConnections(userId: string, userSecret: string) {
  const response = await snaptrade.connections.listBrokerageAuthorizations({
    userId,
    userSecret,
  });
  return response.data;
}

/**
 * List all accounts across all connections for a user
 */
export async function listAccounts(userId: string, userSecret: string) {
  const response = await snaptrade.accountInformation.listUserAccounts({
    userId,
    userSecret,
  });
  return response.data;
}

/**
 * Get positions for a specific account
 */
export async function getPositions(userId: string, userSecret: string, accountId: string) {
  const response = await snaptrade.accountInformation.getUserAccountPositions({
    userId,
    userSecret,
    accountId,
  });
  return response.data;
}

/**
 * Get account balances (buying power, cash, etc.)
 */
export async function getBalances(userId: string, userSecret: string, accountId: string) {
  const response = await snaptrade.accountInformation.getUserAccountBalance({
    userId,
    userSecret,
    accountId,
  });
  return response.data;
}

/**
 * Get recent orders for an account
 */
export async function getOrders(userId: string, userSecret: string, accountId: string) {
  const response = await snaptrade.accountInformation.getUserAccountOrders({
    userId,
    userSecret,
    accountId,
  });
  return response.data;
}

/**
 * Get quote for a symbol
 */
export async function getQuote(userId: string, userSecret: string, accountId: string, symbols: string[]) {
  const response = await snaptrade.trading.getUserAccountQuotes({
    userId,
    userSecret,
    accountId,
    symbols: symbols.join(','),
  });
  return response.data;
}

/**
 * Place an order (stocks/ETFs)
 */
export async function placeOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  order: {
    symbol: string;
    action: 'BUY' | 'SELL';
    orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
    quantity: number;
    limitPrice?: number;
    stopPrice?: number;
    timeInForce: 'Day' | 'GTC';
  }
) {
  // First get the universal symbol ID
  const quotes = await snaptrade.trading.getUserAccountQuotes({
    userId,
    userSecret,
    accountId,
    symbols: order.symbol,
  });
  
  const symbolData = quotes.data[0];
  if (!symbolData?.symbol?.id) {
    throw new Error(`Symbol ${order.symbol} not found`);
  }

  // Place the order directly (without impact check for speed)
  const response = await snaptrade.trading.placeForceOrder({
    userId,
    userSecret,
    accountId,
    action: order.action,
    order_type: order.orderType,
    time_in_force: order.timeInForce,
    universal_symbol_id: symbolData.symbol.id,
    units: order.quantity,
    ...(order.limitPrice && { price: order.limitPrice }),
    ...(order.stopPrice && { stop: order.stopPrice }),
  });

  return response.data;
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  orderId: string
) {
  const response = await snaptrade.trading.cancelUserAccountOrder({
    userId,
    userSecret,
    accountId,
    brokerage_order_id: orderId,
  });
  return response.data;
}

/**
 * List available brokerages
 */
export async function listBrokerages() {
  const response = await snaptrade.referenceData.listAllBrokerages();
  return response.data;
}

/**
 * Check API status
 */
export async function checkStatus() {
  const response = await snaptrade.apiStatus.check();
  return response.data;
}

// ============================================
// OPTIONS TRADING
// ============================================

/**
 * Get option quote for a specific option symbol
 * @param symbol - Option symbol (e.g., "AAPL 240119C00185000" or broker-specific format)
 */
export async function getOptionQuote(
  userId: string,
  userSecret: string,
  accountId: string,
  symbol: string
) {
  const response = await snaptrade.options.getOptionQuote({
    userId,
    userSecret,
    accountId,
    symbol,
  });
  return response.data;
}

/**
 * List current option holdings for an account
 */
export async function listOptionHoldings(
  userId: string,
  userSecret: string,
  accountId: string
) {
  const response = await snaptrade.options.listOptionHoldings({
    userId,
    userSecret,
    accountId,
  });
  return response.data;
}

/**
 * Option leg for multi-leg orders
 */
export interface OptionLeg {
  symbol: string;           // Option symbol
  action: 'BUY_TO_OPEN' | 'BUY_TO_CLOSE' | 'SELL_TO_OPEN' | 'SELL_TO_CLOSE';
  quantity: number;
}

/**
 * Preview option order impact (check buying power, margin, etc.)
 */
export async function getOptionOrderImpact(
  userId: string,
  userSecret: string,
  accountId: string,
  order: {
    orderType: 'Limit' | 'Market';
    timeInForce: 'Day' | 'GTC';
    limitPrice?: number;
    legs: OptionLeg[];
  }
) {
  const response = await snaptrade.trading.getOptionImpact({
    userId,
    userSecret,
    accountId,
    order_type: order.orderType,
    time_in_force: order.timeInForce,
    ...(order.limitPrice && { limit_price: order.limitPrice }),
    price_effect: 'debit', // Will be calculated by broker
    legs: order.legs.map(leg => ({
      symbol: leg.symbol,
      action: leg.action,
      quantity: leg.quantity,
    })),
  });
  return response.data;
}

/**
 * Place option order (single or multi-leg)
 * Supports: single calls/puts, spreads, straddles, etc.
 * 
 * @example
 * // Buy a LEAP call
 * await placeOptionOrder(userId, userSecret, accountId, {
 *   orderType: 'Limit',
 *   timeInForce: 'GTC',
 *   limitPrice: 15.50,
 *   legs: [{
 *     symbol: 'AAPL  260116C00200000',
 *     action: 'BUY_TO_OPEN',
 *     quantity: 1
 *   }]
 * });
 * 
 * @example
 * // Sell a covered call
 * await placeOptionOrder(userId, userSecret, accountId, {
 *   orderType: 'Limit',
 *   timeInForce: 'Day',
 *   limitPrice: 2.50,
 *   legs: [{
 *     symbol: 'AAPL  240419C00190000',
 *     action: 'SELL_TO_OPEN',
 *     quantity: 1
 *   }]
 * });
 */
export async function placeOptionOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  order: {
    orderType: 'Limit' | 'Market';
    timeInForce: 'Day' | 'GTC';
    limitPrice?: number;
    stopPrice?: number;
    legs: OptionLeg[];
  }
) {
  const response = await snaptrade.trading.placeMlegOrder({
    userId,
    userSecret,
    accountId,
    order_type: order.orderType,
    time_in_force: order.timeInForce,
    ...(order.limitPrice && { limit_price: order.limitPrice }),
    ...(order.stopPrice && { stop_price: order.stopPrice }),
    price_effect: 'debit', // Broker will calculate actual effect
    legs: order.legs.map(leg => ({
      symbol: leg.symbol,
      action: leg.action,
      quantity: leg.quantity,
    })),
  });
  return response.data;
}

/**
 * Search for available options on a symbol
 * Note: This searches within the user's broker for tradeable options
 */
export async function searchOptions(
  userId: string,
  userSecret: string,
  accountId: string,
  underlying: string
) {
  // Use symbol search scoped to the account
  const response = await snaptrade.referenceData.symbolSearchUserAccount({
    userId,
    userSecret,
    accountId,
    substring: underlying,
  });
  return response.data;
}
