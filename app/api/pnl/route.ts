export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

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

export async function GET() {
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
