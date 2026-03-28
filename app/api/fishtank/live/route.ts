import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { decryptToken } from '@/lib/broker-credentials';

const DEMO_ALPACA_KEY = 'PKXPAHHSVOFCAXOXINQXP6UXST';
const DEMO_ALPACA_SECRET = '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV';
const DEMO_ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

async function fetchPortfolioData(apiKey: string, apiSecret: string, baseUrl: string) {
  const [accountRes, positionsRes] = await Promise.all([
    fetch(`${baseUrl}/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    }),
    fetch(`${baseUrl}/positions`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    }),
  ]);

  const account = await accountRes.json();
  const positions = await positionsRes.json();

  const unrealizedPnL = positions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealized_pl || 0), 0);
  const totalValue = parseFloat(account.portfolio_value || 0);
  const winning = positions.filter((p: any) => parseFloat(p.unrealized_pl) > 0).length;
  const winRate = positions.length > 0 ? (winning / positions.length) * 100 : 0;

  return {
    pnl: unrealizedPnL,
    pnl_pct: totalValue > 0 ? (unrealizedPnL / totalValue) * 100 : 0,
    total_value: totalValue,
    agents_active: 7,
    trades_today: positions.length,
    win_rate: winRate,
    sharpe_ratio: 1.8,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Try to authenticate user
    const user = await authenticate(request);

    // If authenticated, check if they have a connected broker
    if (user) {
      const credentialsResult = await query(
        'SELECT broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv FROM broker_credentials WHERE user_id = $1 AND is_active = true AND broker_type = $2 LIMIT 1',
        [user.userId, 'alpaca']
      );

      // If user has Alpaca connected → fetch THEIR data
      if (credentialsResult.rows.length > 0) {
        const cred = credentialsResult.rows[0];
        try {
          const [encryptedKey, authTagKey] = cred.encrypted_api_key.split(':');
          const apiKey = decryptToken(encryptedKey, cred.encryption_iv, authTagKey);

          let apiSecret: string | null = null;
          if (cred.encrypted_api_secret) {
            const [encryptedSecret, authTagSecret] = cred.encrypted_api_secret.split(':');
            apiSecret = decryptToken(encryptedSecret, cred.encryption_iv, authTagSecret);
          }

          if (apiSecret) {
            const data = await fetchPortfolioData(apiKey, apiSecret, 'https://api.alpaca.markets/v2');
            return NextResponse.json({ ...data, isDemo: false });
          }
        } catch (error) {
          console.error('Failed to fetch user portfolio, falling back to demo:', error);
        }
      }
    }

    // Default: return demo data
    const data = await fetchPortfolioData(DEMO_ALPACA_KEY, DEMO_ALPACA_SECRET, DEMO_ALPACA_BASE);
    return NextResponse.json({ ...data, isDemo: true });
  } catch (error: any) {
    console.error('Fishtank live failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
