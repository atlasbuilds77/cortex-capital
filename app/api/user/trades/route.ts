export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts, getOrders } from '@/lib/integrations/snaptrade';

// Alpaca fallback for demo
const ALPACA_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY || '';
const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getAuthUser(request);
    
    if (user) {
      // First check for SnapTrade connection
      const snapResult = await query(
        'SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account FROM users WHERE id = $1',
        [user.userId]
      );
      
      const snapUserId = snapResult.rows[0]?.snaptrade_user_id;
      const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret;
      const selectedAccount = snapResult.rows[0]?.selected_snaptrade_account;

      if (snapUserId && snapUserSecret) {
        try {
          const allAccounts = await listAccounts(snapUserId, snapUserSecret);
          const accounts = selectedAccount 
            ? allAccounts.filter((a: any) => a.id === selectedAccount)
            : allAccounts.slice(0, 1);
          
          const allTrades: any[] = [];
          
          for (const account of accounts) {
            try {
              const orders = await getOrders(snapUserId, snapUserSecret, account.id);
              
              for (const o of orders as any[]) {
                allTrades.push({
                  id: o.brokerage_order_id || o.id,
                  symbol: o.symbol?.symbol || o.universal_symbol?.symbol || 'UNKNOWN',
                  side: o.action?.toLowerCase() || 'buy',
                  qty: o.filled_quantity || o.total_quantity || 0,
                  price: o.execution_price || o.limit_price || 0,
                  timestamp: o.time_placed || o.time_executed,
                  status: o.status?.toLowerCase() || 'filled',
                });
              }
            } catch (err) {
              console.error(`Failed to fetch orders for account ${account.id}:`, err);
            }
          }
          
          if (allTrades.length > 0) {
            return NextResponse.json({
              source: 'snaptrade',
              trades: allTrades.slice(0, 20),
            });
          }
        } catch (err) {
          console.error('SnapTrade orders fetch failed:', err);
        }
      }

      // Check legacy broker_credentials
      const brokerResult = await query(
        `SELECT broker, status FROM broker_credentials WHERE user_id = $1 AND status = 'verified'`,
        [user.userId]
      );
      
      if (brokerResult.rows.length > 0) {
        // User has verified broker - get their trade logs
        const tradesResult = await query(
          `SELECT 
            id, symbol, side, quantity as qty, filled_price as price, 
            created_at as timestamp, status
          FROM trade_logs 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 20`,
          [user.userId]
        );
        
        return NextResponse.json({
          source: 'user',
          trades: tradesResult.rows.map(t => ({
            id: t.id.toString(),
            symbol: t.symbol,
            side: t.side,
            qty: parseFloat(t.qty),
            price: parseFloat(t.price || '0'),
            timestamp: t.timestamp,
            status: t.status,
          })),
        });
      }
    }
    
    // Fallback to Alpaca demo data
    if (ALPACA_KEY && ALPACA_SECRET) {
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
      
      return NextResponse.json({
        source: 'demo',
        trades,
      });
    }
    
    // No data available
    return NextResponse.json({
      source: 'none',
      trades: [],
    });
  } catch (error) {
    console.error('User trades fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', source: 'error', trades: [] },
      { status: 500 }
    );
  }
}
