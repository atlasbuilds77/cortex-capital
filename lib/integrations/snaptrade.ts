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

const SNAPTRADE_CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID || 'ZERO-G-TRADING-TEST-HTFTZ';
const SNAPTRADE_CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY || 'qIFGwzDBhQTYpP3HjKVJQaDSpmF0spqhuX31HC7jscFsQimJlx';

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
