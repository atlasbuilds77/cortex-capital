export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { query } from '@/lib/db';
import { decryptToken } from '@/lib/broker-credentials';

// Demo Alpaca paper account (fallback)
const DEMO_ALPACA_KEY = 'PKXPAHHSVOFCAXOXINQXP6UXST';
const DEMO_ALPACA_SECRET = '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV';
const DEMO_ALPACA_URL = 'https://paper-api.alpaca.markets';

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
 * Fetch demo portfolio (Alpaca paper account)
 */
async function fetchDemoPortfolio(): Promise<AccountData> {
  return fetchAlpacaPortfolio(DEMO_ALPACA_KEY, DEMO_ALPACA_SECRET);
}

export const GET = requireAuth(
  requireTier('recovery')(async (request: NextRequest, user, tier) => {
    try {
      // Check if user has broker connected
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
        } catch (error: any) {
          console.error('Failed to fetch user portfolio, falling back to demo:', error);
          // Fallback to demo if user's credentials fail
          const demoData = await fetchDemoPortfolio();
          return NextResponse.json({
            ...demoData,
            isDemo: true,
            userTier: tier,
            error: 'Failed to fetch your portfolio. Showing demo data.',
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
    } catch (error: any) {
      console.error('Portfolio fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch portfolio', details: error.message },
        { status: 500 }
      );
    }
  })
);
