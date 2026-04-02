/**
 * UNIFIED BROKER SERVICE
 * 
 * Handles fetching portfolio data for any user from their connected broker.
 * Supports: Alpaca, Tradier, Robinhood
 * 
 * Security:
 * - Credentials encrypted with AES-256-GCM in database
 * - Decrypted in-memory only when needed
 * - Never logged
 */

import * as crypto from 'crypto';
import axios from 'axios';
import { query } from '../integrations/database';
import { decryptToken } from '../broker-credentials';

function deriveBrokerServiceKey(): Buffer {
  const encryptionSecret = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.BROKER_ENCRYPTION_KEY;
  if (!encryptionSecret) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY or BROKER_ENCRYPTION_KEY environment variable is required');
  }

  return crypto.scryptSync(encryptionSecret, 'cortex-salt', 32);
}

// Standard portfolio format across all brokers
export interface UnifiedPortfolio {
  userId: string;
  broker: 'alpaca' | 'tradier' | 'robinhood';
  account: {
    accountId: string;
    cash: number;
    portfolioValue: number;
    buyingPower: number;
  };
  positions: UnifiedPosition[];
  fetchedAt: string;
}

export interface UnifiedPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  side: 'long' | 'short';
}

interface BrokerConnection {
  userId: string;
  brokerType: 'alpaca' | 'tradier' | 'robinhood';
  accountId?: string;
  credentialsEncrypted?: string;
  decryptedCredentials?: DecryptedCredentials;
  status?: 'active' | 'expired' | 'error';
}

interface DecryptedCredentials {
  alpaca?: { apiKey: string; apiSecret: string; paper: boolean };
  tradier?: { accessToken: string };
  robinhood?: { deviceToken: string; accessToken: string };
}

/**
 * Decrypt credentials from database
 */
function decryptCredentials(encrypted: string): DecryptedCredentials {
  try {
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    
    const key = deriveBrokerServiceKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('[BrokerService] Failed to decrypt credentials');
    throw new Error('Invalid credentials');
  }
}

/**
 * Encrypt credentials for storage
 */
export function encryptCredentials(credentials: DecryptedCredentials): string {
  const iv = crypto.randomBytes(16);
  const key = deriveBrokerServiceKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const data = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Get user's broker connection from database
 */
async function getBrokerConnection(userId: string): Promise<BrokerConnection | null> {
  try {
    // Primary legacy source used by current broker callback flow.
    const legacyResult = await query(
      `SELECT user_id, broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id
       FROM broker_credentials
       WHERE user_id = $1 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );
    if (legacyResult.rows.length > 0) {
      const row = legacyResult.rows[0];
      const iv = row.encryption_iv as string;
      const [accessEncrypted, accessAuthTag] = String(row.encrypted_api_key || '').split(':');
      if (!accessEncrypted || !accessAuthTag || !iv) {
        throw new Error('Invalid broker_credentials encryption format');
      }
      const accessToken = decryptToken(accessEncrypted, iv, accessAuthTag);

      let decryptedCredentials: DecryptedCredentials;
      if (row.broker_type === 'tradier') {
        decryptedCredentials = { tradier: { accessToken } };
      } else if (row.broker_type === 'alpaca') {
        // Best-effort mapping for OAuth-style callback records.
        decryptedCredentials = {
          alpaca: {
            apiKey: process.env.ALPACA_CLIENT_ID || '',
            apiSecret: accessToken,
            paper: true,
          },
        };
      } else {
        const [deviceEncrypted, deviceAuthTag] = String(row.encrypted_api_secret || '').split(':');
        const deviceToken = deviceEncrypted && deviceAuthTag
          ? decryptToken(deviceEncrypted, iv, deviceAuthTag)
          : '';
        decryptedCredentials = {
          robinhood: {
            accessToken,
            deviceToken,
          },
        };
      }

      return {
        userId: row.user_id,
        brokerType: row.broker_type,
        accountId: row.account_id || '',
        decryptedCredentials,
        status: 'active',
      };
    }

    // New schema fallback.
    const result = await query(
      `SELECT user_id, broker, credentials_encrypted
       FROM brokerage_connections
       WHERE user_id = $1
       ORDER BY connected_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.user_id,
      brokerType: row.broker,
      accountId: '',
      credentialsEncrypted: row.credentials_encrypted,
      status: 'active',
    };
  } catch (error: any) {
    console.error('[BrokerService] Failed to get broker connection:', error.message);
    return null;
  }
}

/**
 * Fetch portfolio from Alpaca
 */
async function fetchAlpacaPortfolio(
  credentials: { apiKey: string; apiSecret: string; paper: boolean },
  accountId: string
): Promise<UnifiedPortfolio> {
  const baseUrl = credentials.paper 
    ? 'https://paper-api.alpaca.markets'
    : 'https://api.alpaca.markets';
  
  const headers = {
    'APCA-API-KEY-ID': credentials.apiKey,
    'APCA-API-SECRET-KEY': credentials.apiSecret
  };
  
  // Fetch account
  const accountRes = await axios.get(`${baseUrl}/v2/account`, { headers });
  const account = accountRes.data;
  
  // Fetch positions
  const positionsRes = await axios.get(`${baseUrl}/v2/positions`, { headers });
  const positions = positionsRes.data;
  
  return {
    userId: accountId,
    broker: 'alpaca',
    account: {
      accountId: account.account_number,
      cash: parseFloat(account.cash),
      portfolioValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power)
    },
    positions: positions.map((p: any) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPnl: parseFloat(p.unrealized_pl),
      unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
      side: parseFloat(p.qty) > 0 ? 'long' : 'short'
    })),
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Fetch portfolio from Tradier
 */
async function fetchTradierPortfolio(
  credentials: { accessToken: string },
  accountId: string
): Promise<UnifiedPortfolio> {
  const headers = {
    'Authorization': `Bearer ${credentials.accessToken}`,
    'Accept': 'application/json'
  };
  
  // Fetch balances
  const balancesRes = await axios.get(
    `https://api.tradier.com/v1/accounts/${accountId}/balances`,
    { headers }
  );
  const balances = balancesRes.data.balances;
  
  // Fetch positions
  const positionsRes = await axios.get(
    `https://api.tradier.com/v1/accounts/${accountId}/positions`,
    { headers }
  );
  
  let positions: any[] = [];
  if (positionsRes.data.positions?.position) {
    const rawPositions = positionsRes.data.positions.position;
    positions = Array.isArray(rawPositions) ? rawPositions : [rawPositions];
  }
  
  // Get current prices for positions
  const symbols = positions.map(p => p.symbol);
  let priceMap: Record<string, number> = {};
  
  if (symbols.length > 0) {
    const quotesRes = await axios.get(
      `https://api.tradier.com/v1/markets/quotes`,
      { headers, params: { symbols: symbols.join(',') } }
    );
    
    if (quotesRes.data.quotes?.quote) {
      const quotes = Array.isArray(quotesRes.data.quotes.quote) 
        ? quotesRes.data.quotes.quote 
        : [quotesRes.data.quotes.quote];
      
      for (const q of quotes) {
        priceMap[q.symbol] = q.last || q.close || 0;
      }
    }
  }
  
  return {
    userId: accountId,
    broker: 'tradier',
    account: {
      accountId,
      cash: balances.total_cash || 0,
      portfolioValue: balances.total_equity || 0,
      buyingPower: balances.margin?.stock_buying_power || balances.total_cash || 0
    },
    positions: positions.map(p => {
      const currentPrice = priceMap[p.symbol] || p.cost_basis / p.quantity;
      const marketValue = currentPrice * p.quantity;
      const unrealizedPnl = marketValue - p.cost_basis;
      const unrealizedPnlPct = (unrealizedPnl / p.cost_basis) * 100;
      
      return {
        symbol: p.symbol,
        qty: p.quantity,
        avgEntryPrice: p.cost_basis / p.quantity,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
        side: p.quantity > 0 ? 'long' : 'short'
      };
    }),
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Fetch portfolio from Robinhood (via Python bridge)
 */
async function fetchRobinhoodPortfolio(
  credentials: { deviceToken: string; accessToken: string },
  accountId: string
): Promise<UnifiedPortfolio> {
  // Robinhood requires Python robin_stocks library
  // Call our Python bridge endpoint
  try {
    const response = await axios.post('http://localhost:3001/api/broker/robinhood/account', {
      device_token: credentials.deviceToken,
      access_token: credentials.accessToken
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch Robinhood portfolio');
    }
    
    const data = response.data.data;
    
    return {
      userId: accountId,
      broker: 'robinhood',
      account: {
        accountId: data.account_number || accountId,
        cash: data.cash || 0,
        portfolioValue: data.portfolio_value || 0,
        buyingPower: data.buying_power || 0
      },
      positions: (data.positions || []).map((p: any) => ({
        symbol: p.symbol,
        qty: p.quantity,
        avgEntryPrice: p.average_buy_price,
        currentPrice: p.current_price,
        marketValue: p.equity,
        unrealizedPnl: p.equity - (p.quantity * p.average_buy_price),
        unrealizedPnlPct: ((p.equity / (p.quantity * p.average_buy_price)) - 1) * 100,
        side: p.quantity > 0 ? 'long' : 'short'
      })),
      fetchedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[BrokerService] Robinhood fetch failed:', error.message);
    throw new Error('Failed to fetch Robinhood portfolio');
  }
}

/**
 * MAIN FUNCTION: Fetch portfolio for any user
 */
export async function fetchUserPortfolio(userId: string): Promise<UnifiedPortfolio | null> {
  // First check for SnapTrade connection
  try {
    const snapResult = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account FROM users WHERE id = $1',
      [userId]
    );
    
    const snapUserId = snapResult.rows[0]?.snaptrade_user_id;
    const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret;
    const selectedAccount = snapResult.rows[0]?.selected_snaptrade_account;

    if (snapUserId && snapUserSecret) {
      const { listAccounts, getPositions, getBalances } = await import('../integrations/snaptrade');
      
      const allAccounts = await listAccounts(snapUserId, snapUserSecret);
      
      if (allAccounts.length > 0) {
        // Use selected account or first one
        const accounts = selectedAccount 
          ? allAccounts.filter((a: any) => a.id === selectedAccount)
          : [allAccounts[0]];
        
        const account = accounts[0] || allAccounts[0];
        
        const [positions, balances] = await Promise.all([
          getPositions(snapUserId, snapUserSecret, account.id),
          getBalances(snapUserId, snapUserSecret, account.id),
        ]);

        // Sum up balances
        let cash = 0;
        let buyingPower = 0;
        for (const b of balances as any[]) {
          cash += b.cash || 0;
          buyingPower += b.buying_power || 0;
        }

        // Map positions
        const unifiedPositions: UnifiedPosition[] = (positions as any[]).map((p) => {
          const qty = p.units || 0;
          const currentPrice = p.price || 0;
          const avgEntry = p.average_purchase_price || 0;
          const marketValue = qty * currentPrice;
          const unrealizedPnl = (currentPrice - avgEntry) * qty;
          const unrealizedPnlPct = avgEntry > 0 ? ((currentPrice - avgEntry) / avgEntry) * 100 : 0;
          
          return {
            symbol: p.symbol?.symbol || 'UNKNOWN',
            qty,
            avgEntryPrice: avgEntry,
            currentPrice,
            marketValue,
            unrealizedPnl,
            unrealizedPnlPct,
            side: qty > 0 ? 'long' as const : 'short' as const,
          };
        });

        const portfolioValue = cash + unifiedPositions.reduce((sum, p) => sum + p.marketValue, 0);
        const brokerName = (account as any).brokerage_authorization?.brokerage?.name || 'snaptrade';

        return {
          userId,
          broker: brokerName.toLowerCase() as any,
          account: {
            accountId: account.id,
            cash,
            portfolioValue,
            buyingPower,
          },
          positions: unifiedPositions,
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch (error: any) {
    console.error('[BrokerService] SnapTrade fetch failed:', error.message);
    // Fall through to legacy brokers
  }

  // Fallback to legacy broker connections (Alpaca, Tradier, Robinhood)
  const connection = await getBrokerConnection(userId);
  
  if (!connection) {
    console.log(`[BrokerService] No broker connection for user ${userId}`);
    return null;
  }
  
  // Decrypt credentials
  const credentials = connection.decryptedCredentials
    ? connection.decryptedCredentials
    : decryptCredentials(connection.credentialsEncrypted || '');
  
  // Route to appropriate broker
  switch (connection.brokerType) {
    case 'alpaca':
      if (!credentials.alpaca) throw new Error('Missing Alpaca credentials');
      return await fetchAlpacaPortfolio(credentials.alpaca, connection.accountId || '');
    
    case 'tradier':
      if (!credentials.tradier) throw new Error('Missing Tradier credentials');
      return await fetchTradierPortfolio(credentials.tradier, connection.accountId || '');
    
    case 'robinhood':
      if (!credentials.robinhood) throw new Error('Missing Robinhood credentials');
      return await fetchRobinhoodPortfolio(credentials.robinhood, connection.accountId || '');
    
    default:
      console.error(`[BrokerService] Unknown broker type: ${connection.brokerType}`);
      return null;
  }
}

/**
 * Fetch demo portfolio (Alpaca paper account)
 */
export async function fetchDemoPortfolio(): Promise<UnifiedPortfolio | null> {
  try {
    const alpaca = (await import('../integrations/alpaca')).default;
    const account = await alpaca.getAccount();
    const positions = await alpaca.getPositions();
    
    return {
      userId: 'demo',
      broker: 'alpaca',
      account: {
        accountId: account.account_number,
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        buyingPower: parseFloat(account.buying_power)
      },
      positions: positions.map(p => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        avgEntryPrice: parseFloat(p.avg_entry_price),
        currentPrice: parseFloat(p.current_price),
        marketValue: parseFloat(p.market_value),
        unrealizedPnl: parseFloat(p.unrealized_pl),
        unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
        side: parseFloat(p.qty) > 0 ? 'long' : 'short'
      })),
      fetchedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[BrokerService] Demo portfolio fetch failed:', error.message);
    return null;
  }
}

/**
 * Save broker connection for a user
 */
export async function saveBrokerConnection(
  userId: string,
  brokerType: 'alpaca' | 'tradier' | 'robinhood',
  accountId: string,
  credentials: DecryptedCredentials
): Promise<boolean> {
  try {
    const encrypted = encryptCredentials(credentials);
    
    await query(
      `INSERT INTO brokerage_connections (user_id, broker, credentials_encrypted, connected_at, last_sync)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, broker)
       DO UPDATE SET credentials_encrypted = $3, last_sync = NOW()`,
      [userId, brokerType, encrypted]
    );
    
    return true;
  } catch (error: any) {
    console.error('[BrokerService] Failed to save broker connection:', error.message);
    return false;
  }
}

/**
 * Execute a trade for a user
 */
export async function executeUserTrade(
  userId: string,
  order: {
    symbol: string;
    side: 'buy' | 'sell';
    qty: number;
    type: 'market' | 'limit';
    limitPrice?: number;
    // Options support (SnapTrade)
    isOption?: boolean;
    optionSymbol?: string; // broker/SnapTrade option identifier
  }
): Promise<{ success: boolean; orderId?: string; avgPrice?: number; error?: string }> {
  try {
    const parsedQty = Number(order.qty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return { success: false, error: `Invalid quantity: ${order.qty}` };
    }
    const requestedQty = order.isOption ? Math.floor(parsedQty) : parsedQty;
    if (requestedQty <= 0) {
      return { success: false, error: 'Quantity rounded to zero after normalization' };
    }

    // First check for SnapTrade connection (primary method)
    const snapResult = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account FROM users WHERE id = $1',
      [userId]
    );
    
    const snapUserId = snapResult.rows[0]?.snaptrade_user_id;
    const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret;
    const selectedAccount = snapResult.rows[0]?.selected_snaptrade_account;
    
    if (snapUserId && snapUserSecret) {
      // Use SnapTrade for execution
      const snap = await import('../integrations/snaptrade');
      let accountId: string | undefined = selectedAccount;
      if (!accountId) {
        const accounts = await snap.listAccounts(snapUserId, snapUserSecret);
        accountId = accounts[0]?.id;
      }
      if (!accountId) {
        return { success: false, error: 'No SnapTrade account available for execution' };
      }

      // OPTIONS (SnapTrade)
      if (order.isOption) {
        if (!order.optionSymbol) {
          return { success: false, error: 'Missing optionSymbol for option order' };
        }

        const result = await snap.placeOptionOrder(
          snapUserId,
          snapUserSecret,
          accountId,
          {
            orderType: order.type === 'limit' ? 'Limit' : 'Market',
            timeInForce: 'Day',
            ...(order.limitPrice && { limitPrice: order.limitPrice }),
            legs: [
              {
                symbol: order.optionSymbol,
                action: order.side === 'buy' ? 'BUY_TO_OPEN' : 'SELL_TO_CLOSE',
                quantity: requestedQty,
              },
            ],
          },
        );

        return {
          success: true,
          orderId: (result as any)?.brokerageOrder_id || (result as any)?.brokerageOrderId || 'pending',
          avgPrice: 0,
        };
      }

      // STOCKS (SnapTrade)
      // NOTE: SnapTrade requires universal_symbol_id. Resolve it via account-scoped symbol search.
      const symbols = await snap.snaptrade.referenceData.symbolSearchUserAccount({
        userId: snapUserId,
        userSecret: snapUserSecret,
        accountId,
        substring: order.symbol,
      });

      const matches = (symbols.data as any[]) || [];
      const exact = matches.find((m) => (m?.symbol || '').toUpperCase() === order.symbol.toUpperCase());
      const first = exact || matches[0];
      const universalSymbolId = first?.universal_symbol_id || first?.universalSymbolId || first?.id;

      if (!universalSymbolId) {
        return { success: false, error: `Could not resolve universal_symbol_id for ${order.symbol}` };
      }

      const result = await snap.snaptrade.trading.placeForceOrder({
        userId: snapUserId,
        userSecret: snapUserSecret,
        account_id: accountId,
        action: order.side === 'buy' ? 'BUY' : 'SELL',
        order_type: order.type === 'limit' ? 'Limit' : 'Market',
        time_in_force: 'Day',
        universal_symbol_id: universalSymbolId,
        units: Math.round(requestedQty * 1000) / 1000,
        ...(order.limitPrice && { price: order.limitPrice }),
      });

      return {
        success: true,
        orderId: result.data?.brokerageOrderId || 'pending',
        avgPrice: 0,
      };
    }
    
    // Fall back to legacy broker connections
    const connection = await getBrokerConnection(userId);
    if (!connection) {
      return { success: false, error: 'No broker connection' };
    }

    const credentials = connection.decryptedCredentials
      ? connection.decryptedCredentials
      : decryptCredentials(connection.credentialsEncrypted || '');

    switch (connection.brokerType) {
      case 'alpaca': {
        if (!credentials.alpaca) throw new Error('Missing Alpaca credentials');
        const alpaca = (await import('../integrations/alpaca')).default;
        const result = await alpaca.placeOrder({
          symbol: order.symbol,
          qty: requestedQty,
          side: order.side,
          type: order.type,
          time_in_force: 'day',
        });
        return { 
          success: true, 
          orderId: result.id, 
          avgPrice: parseFloat(result.filled_avg_price || '0') 
        };
      }

      case 'tradier': {
        if (!credentials.tradier) throw new Error('Missing Tradier credentials');
        if (!connection.accountId) {
          return { success: false, error: 'Tradier account ID missing' };
        }
        const tradierQty = Math.floor(requestedQty);
        if (tradierQty < 1) {
          return { success: false, error: 'Tradier requires whole-share quantity >= 1' };
        }
        const tradier = await import('../integrations/tradier');
        const result = await tradier.placeOrder({
          account_id: connection.accountId,
          class: 'equity',
          symbol: order.symbol,
          side: order.side,
          quantity: tradierQty,
          type: order.type,
          duration: 'day',
          ...(order.limitPrice ? { price: order.limitPrice } : {}),
        });
        return {
          success: true,
          orderId: result.id?.toString(),
          avgPrice: result.avg_fill_price || 0,
        };
      }

      default:
        return { success: false, error: `Unsupported broker: ${connection.brokerType}` };
    }
  } catch (error: any) {
    console.error('[BrokerService] Trade execution failed:', error);
    return { success: false, error: error.message };
  }
}

export { getBrokerConnection };

export default {
  fetchUserPortfolio,
  fetchDemoPortfolio,
  saveBrokerConnection,
  encryptCredentials,
  executeUserTrade,
  getBrokerConnection,
};
