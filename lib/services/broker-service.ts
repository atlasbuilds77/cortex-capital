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
  accountId: string;
  credentialsEncrypted: string;
  status: 'active' | 'expired' | 'error';
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
    const result = await query(
      `SELECT user_id, broker_type, account_id, credentials_encrypted, status
       FROM brokerage_connections
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      brokerType: row.broker_type,
      accountId: row.account_id,
      credentialsEncrypted: row.credentials_encrypted,
      status: row.status
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
  const credentials = decryptCredentials(connection.credentialsEncrypted);
  
  // Route to appropriate broker
  switch (connection.brokerType) {
    case 'alpaca':
      if (!credentials.alpaca) throw new Error('Missing Alpaca credentials');
      return await fetchAlpacaPortfolio(credentials.alpaca, connection.accountId);
    
    case 'tradier':
      if (!credentials.tradier) throw new Error('Missing Tradier credentials');
      return await fetchTradierPortfolio(credentials.tradier, connection.accountId);
    
    case 'robinhood':
      if (!credentials.robinhood) throw new Error('Missing Robinhood credentials');
      return await fetchRobinhoodPortfolio(credentials.robinhood, connection.accountId);
    
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
      `INSERT INTO brokerage_connections (user_id, broker_type, account_id, credentials_encrypted, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (user_id, broker_type) 
       DO UPDATE SET account_id = $3, credentials_encrypted = $4, status = 'active', updated_at = NOW()`,
      [userId, brokerType, accountId, encrypted]
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
  order: { symbol: string; side: 'buy' | 'sell'; qty: number; type: 'market' | 'limit'; limitPrice?: number }
): Promise<{ success: boolean; orderId?: string; avgPrice?: number; error?: string }> {
  try {
    const connection = await getBrokerConnection(userId);
    if (!connection) {
      return { success: false, error: 'No broker connection' };
    }

    const credentials = decryptCredentials(connection.credentialsEncrypted);

    switch (connection.brokerType) {
      case 'alpaca': {
        if (!credentials.alpaca) throw new Error('Missing Alpaca credentials');
        const alpaca = (await import('../integrations/alpaca')).default;
        // Use Alpaca's submit order
        const result = await alpaca.submitOrder({
          symbol: order.symbol,
          qty: order.qty,
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
        const tradier = (await import('../integrations/tradier')).default;
        const result = await tradier.placeOrder(
          connection.accountId,
          order.symbol,
          order.qty,
          order.side,
          order.type,
          order.limitPrice
        );
        return {
          success: true,
          orderId: result.order?.id,
          avgPrice: result.order?.avg_fill_price || 0,
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
