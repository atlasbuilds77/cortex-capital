/**
 * POSITION FETCHER
 * Fetches real positions from user's connected broker
 */

import { Pool } from 'pg';
import alpaca from '../integrations/alpaca';
import { decrypt } from '../credential-vault';
import type { Position } from '../portfolio-context';

export interface BrokerBalance {
  cash: number;
  portfolioValue: number;
  buyingPower: number;
}

/**
 * Fetch user's positions from their connected broker
 */
export async function fetchUserPositions(
  userId: string,
  db: Pool
): Promise<{ positions: Position[]; balance: BrokerBalance } | null> {
  try {
    // 1. Get user's broker credentials
    const credsResult = await db.query(
      `SELECT broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id
       FROM broker_credentials
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (credsResult.rows.length === 0) {
      return null;
    }

    const broker = credsResult.rows[0];

    // 2. Route to correct broker
    if (broker.broker_type === 'alpaca') {
      return await fetchFromAlpaca(broker);
    } else if (broker.broker_type === 'tradier') {
      return await fetchFromTradier(broker);
    } else if (broker.broker_type === 'robinhood') {
      return await fetchFromRobinhood(broker);
    } else {
      throw new Error(`Unsupported broker: ${broker.broker_type}`);
    }
  } catch (error: any) {
    console.error('Failed to fetch positions:', error);
    return null;
  }
}

/**
 * Fetch from Alpaca
 */
async function fetchFromAlpaca(
  broker: any
): Promise<{ positions: Position[]; balance: BrokerBalance }> {
  try {
    // Get account info
    const account = await alpaca.getAccount();

    // Get positions
    const alpacaPositions = await alpaca.getPositions();

    const positions: Position[] = alpacaPositions.map((p: any) => ({
      symbol: p.symbol,
      quantity: parseFloat(p.qty),
      avgPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPnL: parseFloat(p.unrealized_pl),
      unrealizedPnLPct: parseFloat(p.unrealized_plpc) * 100,
      assetType: p.asset_class === 'us_equity' ? 'stock' : 'option',
    }));

    const balance: BrokerBalance = {
      cash: parseFloat(account.cash),
      portfolioValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power),
    };

    return { positions, balance };
  } catch (error: any) {
    console.error('Alpaca fetch error:', error);
    throw error;
  }
}

/**
 * Fetch from Tradier
 */
async function fetchFromTradier(
  broker: any
): Promise<{ positions: Position[]; balance: BrokerBalance }> {
  try {
    const accountId = broker.account_id;
    const apiKey = decrypt(broker.encrypted_api_key, broker.encryption_iv);

    // Get balances
    const balanceResponse = await fetch(
      `https://api.tradier.com/v1/accounts/${accountId}/balances`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!balanceResponse.ok) {
      throw new Error(`Tradier API error: ${balanceResponse.status}`);
    }

    const balanceData = await balanceResponse.json() as any;
    const balances = balanceData.balances;

    // Get positions
    const positionsResponse = await fetch(
      `https://api.tradier.com/v1/accounts/${accountId}/positions`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!positionsResponse.ok) {
      throw new Error(`Tradier API error: ${positionsResponse.status}`);
    }

    const positionsData = await positionsResponse.json() as any;
    const tradierPositions = positionsData.positions?.position || [];

    const positions: Position[] = (Array.isArray(tradierPositions)
      ? tradierPositions
      : [tradierPositions]
    ).map((p: any) => {
      const cost = p.cost_basis || p.quantity * 100; // Rough estimate
      const unrealizedPnL = (p.quantity * 100 * p.last) - cost;

      return {
        symbol: p.symbol,
        quantity: p.quantity,
        avgPrice: cost / (p.quantity * 100),
        currentPrice: p.last || 0,
        marketValue: p.quantity * 100 * (p.last || 0),
        unrealizedPnL,
        unrealizedPnLPct: (unrealizedPnL / cost) * 100,
        assetType: p.symbol.includes(' ') ? 'option' : 'stock',
      };
    });

    const balance: BrokerBalance = {
      cash: balances.cash?.cash_available || 0,
      portfolioValue: balances.total_equity || 0,
      buyingPower: balances.option_buying_power || balances.stock_buying_power || 0,
    };

    return { positions, balance };
  } catch (error: any) {
    console.error('Tradier fetch error:', error);
    throw error;
  }
}

/**
 * Fetch from Robinhood (using robin_stocks)
 */
async function fetchFromRobinhood(
  broker: any
): Promise<{ positions: Position[]; balance: BrokerBalance }> {
  try {
    const robinhood = await import('../integrations/robinhood');

    // Decrypt Robinhood credentials
    const username = decrypt(broker.encrypted_api_key, broker.encryption_iv);
    const password = decrypt(broker.encrypted_api_secret, broker.encryption_iv);

    // Get positions and balance via robin_stocks
    const data = await robinhood.default.getPositions(username, password);

    const positions: Position[] = data.positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: p.avgPrice,
      currentPrice: p.currentPrice,
      marketValue: p.marketValue,
      unrealizedPnL: p.unrealizedPnL,
      unrealizedPnLPct: p.unrealizedPnLPct,
      assetType: 'stock',
    }));

    const balance: BrokerBalance = {
      cash: data.balance.cash,
      portfolioValue: data.balance.portfolioValue,
      buyingPower: data.balance.buyingPower,
    };

    return { positions, balance };
  } catch (error: any) {
    console.error('Robinhood fetch error:', error);
    throw error;
  }
}

/**
 * Calculate sector exposure from positions
 */
export function calculateSectorExposure(
  positions: Position[],
  totalValue: number
): Record<string, number> {
  // Simplified sector mapping (in production, use a real API)
  const sectorMap: Record<string, string> = {
    NVDA: 'Technology',
    AAPL: 'Technology',
    MSFT: 'Technology',
    GOOGL: 'Technology',
    TSLA: 'Consumer Discretionary',
    JPM: 'Financials',
    JNJ: 'Healthcare',
    QQQ: 'Technology',
    SPY: 'Diversified',
    VTI: 'Diversified',
  };

  const exposure: Record<string, number> = {};

  for (const position of positions) {
    const sector = sectorMap[position.symbol] || 'Other';
    const weight = (position.marketValue / totalValue) * 100;
    exposure[sector] = (exposure[sector] || 0) + weight;
  }

  return exposure;
}

/**
 * Calculate YTD P&L (simplified - in production track from Jan 1)
 */
export function calculateYTDPnL(positions: Position[]): { pnl: number; pnlPct: number } {
  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.avgPrice * p.quantity, 0);

  return {
    pnl: totalUnrealized,
    pnlPct: totalCost > 0 ? (totalUnrealized / totalCost) * 100 : 0,
  };
}
