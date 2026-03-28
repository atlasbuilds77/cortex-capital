import { NextRequest, NextResponse } from 'next/server';

const ALPACA_KEY = process.env.ALPACA_API_KEY || 'PKXPAHHSVOFCAXOXINQXP6UXST';
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY || '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV';
const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

export async function GET(request: NextRequest) {
  try {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
