export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { query } from '@/lib/db';
import { decryptToken } from '@/lib/broker-credentials';
import { listAccounts, getPositions, getBalances } from '@/lib/integrations/snaptrade';

const DEMO_ALPACA_KEY = process.env.DEMO_ALPACA_API_KEY || process.env.ALPACA_API_KEY || '';
const DEMO_ALPACA_SECRET =
  process.env.DEMO_ALPACA_SECRET_KEY || process.env.ALPACA_SECRET || process.env.ALPACA_SECRET_KEY || '';

interface Position {
  symbol: string;
  qty: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  current_price: number;
  avg_entry_price: number;
  side: string;
}

interface AccountData {
  equity: number;
  cash: number;
  buying_power: number;
  positions: Position[];
  broker: string;
  account_id?: string;
}

/**
 * Fetch portfolio from Alpaca
 */
async function fetchAlpacaPortfolio(apiKey: string, apiSecret: string): Promise<AccountData> {
  const baseUrl = 'https://api.alpaca.markets'; // Use live API URL

  const accountResponse = await fetch(`${baseUrl}/v2/account`, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
    },
  });

  if (!accountResponse.ok) {
    throw new Error(`Alpaca account fetch failed: ${accountResponse.statusText}`);
  }

  const account = await accountResponse.json();

  const positionsResponse = await fetch(`${baseUrl}/v2/positions`, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
    },
  });

  const positions: Position[] = positionsResponse.ok ? await positionsResponse.json() : [];

  return {
    equity: parseFloat(account.equity || '0'),
    cash: parseFloat(account.cash || '0'),
    buying_power: parseFloat(account.buying_power || '0'),
    positions: positions.map((p: any) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty || '0'),
      market_value: parseFloat(p.market_value || '0'),
      unrealized_pl: parseFloat(p.unrealized_pl || '0'),
      unrealized_plpc: parseFloat(p.unrealized_plpc || '0'),
      current_price: parseFloat(p.current_price || '0'),
      avg_entry_price: parseFloat(p.avg_entry_price || '0'),
      side: p.side || 'long',
    })),
    broker: 'alpaca',
    account_id: account.account_number,
  };
}

/**
 * Fetch portfolio from Tradier
 */
async function fetchTradierPortfolio(accessToken: string): Promise<AccountData> {
  const profileResponse = await fetch('https://api.tradier.com/v1/user/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!profileResponse.ok) {
    throw new Error(`Tradier profile fetch failed: ${profileResponse.statusText}`);
  }

  const profile = await profileResponse.json();
  const accountId = profile.profile?.account?.account_number;

  const balanceResponse = await fetch(
    `https://api.tradier.com/v1/accounts/${accountId}/balances`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  const balance = balanceResponse.ok ? await balanceResponse.json() : {};

  const positionsResponse = await fetch(
    `https://api.tradier.com/v1/accounts/${accountId}/positions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  const positionsData = positionsResponse.ok ? await positionsResponse.json() : {};
  const positions = positionsData.positions?.position || [];

  return {
    equity: parseFloat(balance.balances?.total_equity || '0'),
    cash: parseFloat(balance.balances?.total_cash || '0'),
    buying_power: parseFloat(balance.balances?.option_buying_power || '0'),
    positions: Array.isArray(positions)
      ? positions.map((p: any) => ({
          symbol: p.symbol,
          qty: parseFloat(p.quantity || '0'),
          market_value: parseFloat(p.cost_basis || '0'),
          unrealized_pl: 0, // Not directly available
          unrealized_plpc: 0,
          current_price: 0,
          avg_entry_price: 0,
          side: 'long',
        }))
      : [],
    broker: 'tradier',
    account_id: accountId,
  };
}

/**
 * Fetch portfolio from SnapTrade (universal broker API)
 */
async function fetchSnapTradePortfolio(userId: string, userSecret: string): Promise<AccountData> {
  // Get all accounts
  const accounts = await listAccounts(userId, userSecret);
  
  if (!accounts.length) {
    throw new Error('No SnapTrade accounts found');
  }

  // Aggregate data from all accounts
  let totalEquity = 0;
  let totalCash = 0;
  let totalBuyingPower = 0;
  const allPositions: Position[] = [];
  let brokerName = 'snaptrade';

  for (const account of accounts) {
    try {
      const [positions, balances] = await Promise.all([
        getPositions(userId, userSecret, account.id),
        getBalances(userId, userSecret, account.id),
      ]);

      // Get broker name from first account
      if (account.brokerage_authorization?.brokerage?.name) {
        brokerName = account.brokerage_authorization.brokerage.name.toLowerCase();
      }

      // Sum up balances
      for (const b of balances as any[]) {
        totalCash += b.cash || 0;
        totalBuyingPower += b.buying_power || 0;
      }

      // Map positions
      for (const p of positions as any[]) {
        const marketValue = (p.units || 0) * (p.price || 0);
        totalEquity += marketValue;
        
        allPositions.push({
          symbol: p.symbol?.symbol || 'UNKNOWN',
          qty: p.units || 0,
          market_value: marketValue,
          unrealized_pl: ((p.price || 0) - (p.average_purchase_price || 0)) * (p.units || 0),
          unrealized_plpc: p.average_purchase_price 
            ? ((p.price - p.average_purchase_price) / p.average_purchase_price) 
            : 0,
          current_price: p.price || 0,
          avg_entry_price: p.average_purchase_price || 0,
          side: 'long',
        });
      }
    } catch (err) {
      console.error(`Failed to fetch data for account ${account.id}:`, err);
    }
  }

  // Add cash to equity
  totalEquity += totalCash;

  return {
    equity: totalEquity,
    cash: totalCash,
    buying_power: totalBuyingPower,
    positions: allPositions,
    broker: brokerName,
    account_id: accounts[0]?.id,
  };
}

function getSyntheticDemoPortfolio(): AccountData {
  return {
    equity: 94620.17,
    cash: 21458.4,
    buying_power: 42916.8,
    positions: [],
    broker: 'demo',
    account_id: 'DEMO-ACCOUNT',
  };
}

async function fetchDemoPortfolio(): Promise<AccountData> {
  if (DEMO_ALPACA_KEY && DEMO_ALPACA_SECRET) {
    try {
      return await fetchAlpacaPortfolio(DEMO_ALPACA_KEY, DEMO_ALPACA_SECRET);
    } catch (error) {
      console.error('Demo portfolio fetch failed, using synthetic data:', error);
    }
  }

  return getSyntheticDemoPortfolio();
}

export const GET = requireAuth(
  requireTier('recovery')(async (request: NextRequest, user, tier) => {
    try {
      // First check for SnapTrade connection (universal broker API)
      const snaptradeResult = await query(
        'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
        [user.userId]
      );
      
      const snaptradeUserId = snaptradeResult.rows[0]?.snaptrade_user_id;
      const snaptradeUserSecret = snaptradeResult.rows[0]?.snaptrade_user_secret;

      // If user has SnapTrade connected, use that
      if (snaptradeUserId && snaptradeUserSecret) {
        try {
          const portfolioData = await fetchSnapTradePortfolio(snaptradeUserId, snaptradeUserSecret);
          
          // Check if they actually have accounts
          if (portfolioData.positions.length > 0 || portfolioData.equity > 0) {
            return NextResponse.json({
              ...portfolioData,
              isDemo: false,
              userTier: tier,
            });
          }
        } catch (error) {
          console.error('SnapTrade portfolio fetch failed:', error);
          // Fall through to check legacy brokers or demo
        }
      }

      // Check for legacy broker connections (Alpaca, Tradier)
      const credentialsResult = await query(
        'SELECT broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1',
        [user.userId]
      );

      // If operator tier AND has broker connected → fetch THEIR data
      if (tier === 'operator' && credentialsResult.rows.length > 0) {
        const cred = credentialsResult.rows[0];
        const brokerType = cred.broker_type;

        try {
          // Decrypt credentials (format: "encrypted:authTag")
          const [encryptedKey, authTagKey] = cred.encrypted_api_key.split(':');
          const apiKey = decryptToken(encryptedKey, cred.encryption_iv, authTagKey);

          let apiSecret: string | null = null;
          if (cred.encrypted_api_secret) {
            const [encryptedSecret, authTagSecret] = cred.encrypted_api_secret.split(':');
            apiSecret = decryptToken(encryptedSecret, cred.encryption_iv, authTagSecret);
          }

          // Fetch portfolio based on broker
          let portfolioData: AccountData;
          if (brokerType === 'alpaca' && apiSecret) {
            portfolioData = await fetchAlpacaPortfolio(apiKey, apiSecret);
          } else if (brokerType === 'tradier') {
            portfolioData = await fetchTradierPortfolio(apiKey);
          } else {
            throw new Error('Unsupported broker or missing credentials');
          }

          return NextResponse.json({
            ...portfolioData,
            isDemo: false,
            userTier: tier,
          });
        } catch (error) {
          console.error('Failed to fetch user portfolio, falling back to demo:', error);
          // Fallback to demo if user's credentials fail
          const demoData = await fetchDemoPortfolio();
          return NextResponse.json({
            ...demoData,
            isDemo: true,
            userTier: tier,
          });
        }
      }

      // Otherwise → return demo data
      const demoData = await fetchDemoPortfolio();
      return NextResponse.json({
        ...demoData,
        isDemo: true,
        userTier: tier,
      });
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch portfolio' },
        { status: 500 }
      );
    }
  })
);
