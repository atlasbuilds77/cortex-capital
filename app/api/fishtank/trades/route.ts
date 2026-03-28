export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const ALPACA_KEY = process.env.DEMO_ALPACA_API_KEY || process.env.ALPACA_API_KEY || '';
const ALPACA_SECRET =
  process.env.DEMO_ALPACA_SECRET_KEY || process.env.ALPACA_SECRET || process.env.ALPACA_SECRET_KEY || '';
const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

const DEMO_TRADES = [
  { id: 'demo-1', symbol: 'NVDA', side: 'buy', qty: 8, price: 901.22, timestamp: new Date().toISOString(), status: 'filled' },
  { id: 'demo-2', symbol: 'TSLA', side: 'sell', qty: 5, price: 219.4, timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'filled' },
  { id: 'demo-3', symbol: 'AAPL', side: 'buy', qty: 12, price: 184.31, timestamp: new Date(Date.now() - 37 * 60 * 1000).toISOString(), status: 'filled' },
];

export async function GET(request: NextRequest) {
  try {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      return NextResponse.json(DEMO_TRADES);
    }

    const res = await fetch(`${ALPACA_BASE}/orders?status=filled&limit=20&direction=desc`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const orders = await res.json();
    
    const trades = (Array.isArray(orders) ? orders : []).map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      qty: parseFloat(o.filled_qty || o.qty),
      price: parseFloat(o.filled_avg_price || '0'),
      timestamp: o.filled_at || o.created_at,
      status: o.status,
    }));
    
    return NextResponse.json(trades);
  } catch (error) {
    console.error('Fishtank trades fetch failed:', error);
    return NextResponse.json(DEMO_TRADES);
  }
}
