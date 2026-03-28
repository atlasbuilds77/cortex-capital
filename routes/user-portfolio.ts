/**
 * USER PORTFOLIO ROUTES
 * Fetches REAL data from the user's connected broker
 */

import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../lib/auth';
import { query } from '../integrations/database';
import { getTierConfig, canTradeThisWeek } from '../lib/tier-features';

export async function userPortfolioRoutes(server: FastifyInstance) {

  /**
   * GET /api/user/portfolio
   * Get the user's real portfolio from their connected broker
   */
  server.get('/api/user/portfolio', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      // Get user tier
      const userResult = await query('SELECT tier FROM users WHERE id = $1', [userId]);
      const tier = userResult.rows[0]?.tier || 'free';
      const tierConfig = getTierConfig(tier);

      // Get connected broker credentials
      const brokerResult = await query(
        `SELECT broker_type, encrypted_api_key, encryption_iv, account_id 
         FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );

      if (brokerResult.rows.length === 0) {
        // No broker connected - return demo data
        return reply.send({
          source: 'demo',
          tier,
          tierConfig: {
            name: tierConfig.name,
            canAutoExecute: tierConfig.canAutoExecute,
            canViewSignals: tierConfig.canViewSignals,
            maxTradesPerWeek: tierConfig.maxTradesPerWeek,
          },
          portfolio: getDemoPortfolio(),
          message: 'Connect a broker to see your real portfolio',
        });
      }

      const broker = brokerResult.rows[0];
      let portfolio;

      try {
        if (broker.broker_type === 'tradier') {
          portfolio = await fetchTradierPortfolio(broker.encrypted_api_key, broker.account_id);
        } else if (broker.broker_type === 'alpaca') {
          portfolio = await fetchAlpacaPortfolio(broker.encrypted_api_key, broker.encryption_iv);
        } else {
          portfolio = getDemoPortfolio();
        }
      } catch (err: any) {
        server.log.error(`Failed to fetch portfolio for user ${userId}:`, err.message);
        portfolio = getDemoPortfolio();
        portfolio.error = 'Failed to connect to broker. Showing demo data.';
      }

      // Get trades this week for limit checking
      const tradesResult = await query(
        `SELECT COUNT(*) as count FROM trade_history 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );
      const tradesThisWeek = parseInt(tradesResult.rows[0]?.count || '0');

      return reply.send({
        source: 'live',
        tier,
        tierConfig: {
          name: tierConfig.name,
          canAutoExecute: tierConfig.canAutoExecute,
          canViewSignals: tierConfig.canViewSignals,
          canUsePhoneBooth: tierConfig.canUsePhoneBooth,
          canCustomizeAgents: tierConfig.canCustomizeAgents,
          maxTradesPerWeek: tierConfig.maxTradesPerWeek,
          alertFrequency: tierConfig.alertFrequency,
        },
        tradesThisWeek,
        canTradeMore: canTradeThisWeek(tier, tradesThisWeek),
        portfolio,
      });
    } catch (error: any) {
      server.log.error('Portfolio fetch error:', error);
      return reply.code(500).send({ error: 'Failed to fetch portfolio' });
    }
  });

  /**
   * GET /api/user/tier-features
   * Get what the user's tier allows
   */
  server.get('/api/user/tier-features', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.userId;
    const userResult = await query('SELECT tier FROM users WHERE id = $1', [userId]);
    const tier = userResult.rows[0]?.tier || 'free';
    const config = getTierConfig(tier);

    return reply.send({
      tier,
      ...config,
    });
  });

  server.log.info('User portfolio routes registered');
}

// ============================================
// BROKER API FETCHERS
// ============================================

async function fetchTradierPortfolio(token: string, accountId?: string) {
  // Get account info
  const profileRes = await fetch('https://api.tradier.com/v1/user/profile', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const profile = await profileRes.json();
  
  const accId = accountId || profile?.profile?.account?.account_number;
  if (!accId) throw new Error('No Tradier account found');

  // Get balances
  const balanceRes = await fetch(`https://api.tradier.com/v1/accounts/${accId}/balances`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const balances = await balanceRes.json();

  // Get positions
  const posRes = await fetch(`https://api.tradier.com/v1/accounts/${accId}/positions`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const positions = await posRes.json();

  // Get orders (recent)
  const ordersRes = await fetch(`https://api.tradier.com/v1/accounts/${accId}/orders`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const orders = await ordersRes.json();

  const bal = balances?.balances;
  const posArray = positions?.positions?.position;
  const orderArray = orders?.orders?.order;

  return {
    accountValue: bal?.total_equity || 0,
    cash: bal?.cash?.cash_available || bal?.total_cash || 0,
    buyingPower: bal?.margin?.buying_power || bal?.total_cash || 0,
    todayPnL: bal?.close_pl || 0,
    positions: Array.isArray(posArray) ? posArray.map((p: any) => ({
      symbol: p.symbol,
      qty: p.quantity,
      avgPrice: p.cost_basis / p.quantity,
      currentPrice: p.market_value / p.quantity,
      marketValue: p.market_value,
      unrealizedPnL: p.market_value - p.cost_basis,
      pnlPercent: ((p.market_value - p.cost_basis) / p.cost_basis * 100),
    })) : [],
    recentOrders: Array.isArray(orderArray) ? orderArray.slice(0, 10).map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      qty: o.quantity,
      price: o.avg_fill_price || o.price,
      status: o.status,
      date: o.create_date,
    })) : [],
  };
}

async function fetchAlpacaPortfolio(apiKey: string, apiSecret?: string) {
  const headers: Record<string, string> = {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret || '',
  };

  // Get account
  const accRes = await fetch('https://api.alpaca.markets/v2/account', { headers });
  const account = await accRes.json();

  // Get positions
  const posRes = await fetch('https://api.alpaca.markets/v2/positions', { headers });
  const positions = await posRes.json();

  // Get recent orders
  const ordersRes = await fetch('https://api.alpaca.markets/v2/orders?status=filled&limit=10&direction=desc', { headers });
  const orders = await ordersRes.json();

  const equity = parseFloat(account.equity || '0');
  const lastEquity = parseFloat(account.last_equity || '0');

  return {
    accountValue: equity,
    cash: parseFloat(account.cash || '0'),
    buyingPower: parseFloat(account.buying_power || '0'),
    todayPnL: equity - lastEquity,
    positions: Array.isArray(positions) ? positions.map((p: any) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPnL: parseFloat(p.unrealized_pl),
      pnlPercent: parseFloat(p.unrealized_plpc) * 100,
    })) : [],
    recentOrders: Array.isArray(orders) ? orders.map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      qty: parseFloat(o.filled_qty || o.qty),
      price: parseFloat(o.filled_avg_price || '0'),
      status: o.status,
      date: o.filled_at || o.created_at,
    })) : [],
  };
}

function getDemoPortfolio() {
  return {
    accountValue: 99166.89,
    cash: 877.64,
    buyingPower: 877.64,
    todayPnL: -1245.32,
    positions: [
      { symbol: 'NVDA', qty: 67, avgPrice: 175.15, currentPrice: 172.50, marketValue: 11557.50, unrealizedPnL: -177.53, pnlPercent: -1.5 },
      { symbol: 'MSFT', qty: 31, avgPrice: 373.25, currentPrice: 367.13, marketValue: 11380.03, unrealizedPnL: -189.72, pnlPercent: -1.6 },
      { symbol: 'GOOGL', qty: 45, avgPrice: 168.20, currentPrice: 171.40, marketValue: 7713.00, unrealizedPnL: 144.00, pnlPercent: 1.9 },
      { symbol: 'META', qty: 17, avgPrice: 594.09, currentPrice: 552.12, marketValue: 9386.04, unrealizedPnL: -713.41, pnlPercent: -7.1 },
      { symbol: 'AMD', qty: 100, avgPrice: 203.73, currentPrice: 205.38, marketValue: 20538.00, unrealizedPnL: 165.00, pnlPercent: 0.8 },
      { symbol: 'TSLA', qty: 29, avgPrice: 381.39, currentPrice: 374.45, marketValue: 10859.05, unrealizedPnL: -201.28, pnlPercent: -1.8 },
      { symbol: 'JPM', qty: 40, avgPrice: 242.50, currentPrice: 248.90, marketValue: 9956.00, unrealizedPnL: 256.00, pnlPercent: 2.6 },
      { symbol: 'XOM', qty: 55, avgPrice: 108.30, currentPrice: 112.15, marketValue: 6168.25, unrealizedPnL: 211.75, pnlPercent: 3.6 },
    ],
    recentOrders: [],
  };
}
