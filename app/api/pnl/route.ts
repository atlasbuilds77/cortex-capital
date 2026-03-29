export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts, getPositions, getBalances } from '@/lib/integrations/snaptrade';

// PnL endpoint - wraps fishtank/live data for the demo overlay
const ALPACA_API_KEY = process.env.DEMO_ALPACA_API_KEY || process.env.ALPACA_API_KEY || '';
const ALPACA_SECRET =
  process.env.DEMO_ALPACA_SECRET_KEY || process.env.ALPACA_SECRET || process.env.ALPACA_SECRET_KEY || '';
const ALPACA_URL = process.env.DEMO_ALPACA_URL || 'https://paper-api.alpaca.markets';

function getSyntheticPnlData() {
  return {
    accountValue: 93467.54,
    todayPnL: -2913.06,
    openPositions: 7,
    cash: 45000,
    buyingPower: 90000,
  };
}

export async function GET(request: NextRequest) {
  // Check if user is authenticated and has SnapTrade
  const user = await getAuthUser(request);
  
  if (user) {
    const snapResult = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );
    
    const snapUserId = snapResult.rows[0]?.snaptrade_user_id;
    const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret;
    
    if (snapUserId && snapUserSecret) {
      try {
        const accounts = await listAccounts(snapUserId, snapUserSecret);
        
        let totalEquity = 0;
        let totalCash = 0;
        let totalBuyingPower = 0;
        let totalPnL = 0;
        let positionCount = 0;
        
        for (const account of accounts as any[]) {
          const [positions, balances] = await Promise.all([
            getPositions(snapUserId, snapUserSecret, account.id),
            getBalances(snapUserId, snapUserSecret, account.id),
          ]);
          
          for (const b of balances as any[]) {
            totalCash += b.cash || 0;
            totalBuyingPower += b.buying_power || 0;
          }
          
          for (const p of positions as any[]) {
            const marketValue = (p.units || 0) * (p.price || 0);
            totalEquity += marketValue;
            totalPnL += ((p.price || 0) - (p.average_purchase_price || 0)) * (p.units || 0);
            positionCount++;
          }
        }
        
        totalEquity += totalCash;
        
        return NextResponse.json({
          accountValue: totalEquity,
          todayPnL: totalPnL,
          openPositions: positionCount,
          cash: totalCash,
          buyingPower: totalBuyingPower,
          source: 'snaptrade',
        });
      } catch (err) {
        console.error('SnapTrade PnL fetch failed:', err);
        // Fall through to demo
      }
    }
  }
  try {
    if (!ALPACA_API_KEY || !ALPACA_SECRET) {
      return NextResponse.json(getSyntheticPnlData());
    }

    // Fetch account data from Alpaca
    const accountRes = await fetch(`${ALPACA_URL}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });

    if (!accountRes.ok) {
      throw new Error('Failed to fetch Alpaca account');
    }

    const account = await accountRes.json();

    // Fetch positions
    const positionsRes = await fetch(`${ALPACA_URL}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });

    const positions = positionsRes.ok ? await positionsRes.json() : [];

    // Calculate today's P&L from positions
    const todayPnL = positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.unrealized_intraday_pl || 0);
    }, 0);

    return NextResponse.json({
      accountValue: parseFloat(account.equity),
      todayPnL: todayPnL,
      openPositions: positions.length,
      cash: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
    });
  } catch (error) {
    console.error('PnL fetch error:', error);

    // Return synthetic demo data on error
    return NextResponse.json(getSyntheticPnlData());
  }
}
