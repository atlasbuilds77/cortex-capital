export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { getAccountInfo } from '@/lib/brokers/robinhood';

// Alpaca fallback for demo
const ALPACA_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY || '';
const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getAuthUser(request);
    
    if (user) {
      // Check if user has broker connected
      const brokerResult = await query(
        `SELECT broker, status FROM broker_credentials WHERE user_id = $1 AND status = 'verified'`,
        [user.userId]
      );
      
      if (brokerResult.rows.length > 0) {
        const broker = brokerResult.rows[0].broker;
        
        if (broker === 'robinhood') {
          // Get real Robinhood account data
          const accountResult = await getAccountInfo(user.userId);
          
          if (accountResult.success && accountResult.data) {
            return NextResponse.json({
              source: 'robinhood',
              accountValue: accountResult.data.portfolioValue,
              buyingPower: accountResult.data.buyingPower,
              positions: accountResult.data.positions,
              todayPnL: accountResult.data.positions.reduce(
                (sum, p) => sum + (p.currentPrice - p.averageCost) * p.quantity,
                0
              ),
            });
          }
        }
        
        // Other brokers can be added here (Tradier, Alpaca, etc.)
      }
    }
    
    // Fallback to Alpaca demo data
    if (ALPACA_KEY && ALPACA_SECRET) {
      const [accountRes, positionsRes] = await Promise.all([
        fetch(`${ALPACA_BASE}/account`, {
          headers: {
            'APCA-API-KEY-ID': ALPACA_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET,
          },
        }),
        fetch(`${ALPACA_BASE}/positions`, {
          headers: {
            'APCA-API-KEY-ID': ALPACA_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET,
          },
        }),
      ]);
      
      const account = await accountRes.json();
      const positions = await positionsRes.json();
      
      const todayPnL = (Array.isArray(positions) ? positions : []).reduce(
        (sum: number, p: any) => sum + parseFloat(p.unrealized_intraday_pl || '0'),
        0
      );
      
      return NextResponse.json({
        source: 'demo',
        accountValue: parseFloat(account.portfolio_value || '0'),
        buyingPower: parseFloat(account.buying_power || '0'),
        todayPnL,
        openPositions: Array.isArray(positions) ? positions.length : 0,
        positions: (Array.isArray(positions) ? positions : []).map((p: any) => ({
          symbol: p.symbol,
          quantity: parseFloat(p.qty),
          averageCost: parseFloat(p.avg_entry_price),
          currentPrice: parseFloat(p.current_price),
          todayChange: parseFloat(p.change_today) * 100,
          unrealizedPnL: parseFloat(p.unrealized_pl),
        })),
      });
    }
    
    // No data available
    return NextResponse.json({
      source: 'none',
      accountValue: 0,
      buyingPower: 0,
      todayPnL: 0,
      openPositions: 0,
      positions: [],
    });
  } catch (error: any) {
    console.error('User portfolio fetch failed:', error);
    return NextResponse.json(
      { 
        error: error.message, 
        source: 'error',
        accountValue: 0,
        positions: [],
      },
      { status: 500 }
    );
  }
}
