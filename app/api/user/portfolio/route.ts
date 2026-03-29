export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { getAccountInfo } from '@/lib/brokers/robinhood';
import { listAccounts, getPositions, getBalances } from '@/lib/integrations/snaptrade';

// Alpaca fallback for demo (same env vars as fishtank)
const ALPACA_KEY = process.env.DEMO_ALPACA_API_KEY || process.env.ALPACA_API_KEY || '';
const ALPACA_SECRET = process.env.DEMO_ALPACA_SECRET_KEY || process.env.ALPACA_SECRET || process.env.ALPACA_SECRET_KEY || '';
const ALPACA_BASE = process.env.DEMO_ALPACA_BASE_URL || 'https://paper-api.alpaca.markets/v2';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getAuthUser(request);
    
    if (user) {
      // First check for SnapTrade connection (universal broker API)
      const snaptradeResult = await query(
        'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
        [user.userId]
      );
      
      const snaptradeUserId = snaptradeResult.rows[0]?.snaptrade_user_id;
      const snaptradeUserSecret = snaptradeResult.rows[0]?.snaptrade_user_secret;

      if (snaptradeUserId && snaptradeUserSecret) {
        try {
          const accounts = await listAccounts(snaptradeUserId, snaptradeUserSecret);
          
          if (accounts.length > 0) {
            let totalValue = 0;
            let totalBuyingPower = 0;
            let totalPnL = 0;
            const allPositions: any[] = [];
            let brokerName = 'snaptrade';

            for (const account of accounts) {
              try {
                const [positions, balances] = await Promise.all([
                  getPositions(snaptradeUserId, snaptradeUserSecret, account.id),
                  getBalances(snaptradeUserId, snaptradeUserSecret, account.id),
                ]);

                if ((account as any).brokerage_authorization?.brokerage?.name) {
                  brokerName = (account as any).brokerage_authorization.brokerage.name.toLowerCase();
                }

                for (const b of balances as any[]) {
                  totalValue += b.cash || 0;
                  totalBuyingPower += b.buying_power || 0;
                }

                for (const p of positions as any[]) {
                  const marketValue = (p.units || 0) * (p.price || 0);
                  const unrealizedPnL = ((p.price || 0) - (p.average_purchase_price || 0)) * (p.units || 0);
                  totalValue += marketValue;
                  totalPnL += unrealizedPnL;
                  
                  allPositions.push({
                    symbol: p.symbol?.symbol || 'UNKNOWN',
                    quantity: p.units || 0,
                    averageCost: p.average_purchase_price || 0,
                    currentPrice: p.price || 0,
                    todayChange: 0, // SnapTrade doesn't provide intraday change
                    unrealizedPnL,
                  });
                }
              } catch (err) {
                console.error(`Failed to fetch account ${account.id}:`, err);
              }
            }

            return NextResponse.json({
              source: brokerName,
              accountValue: totalValue,
              buyingPower: totalBuyingPower,
              todayPnL: totalPnL,
              openPositions: allPositions.length,
              positions: allPositions,
            });
          }
        } catch (err) {
          console.error('SnapTrade portfolio fetch failed:', err);
          // Fall through to check legacy brokers
        }
      }

      // Check legacy broker connections (Robinhood, etc.)
      const brokerResult = await query(
        `SELECT broker_type, is_active FROM broker_credentials WHERE user_id = $1 AND is_active = true`,
        [user.userId]
      );
      
      if (brokerResult.rows.length > 0) {
        const broker = brokerResult.rows[0].broker_type;
        
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
    
    // No broker connected - return placeholder prompting connection
    return NextResponse.json({
      source: 'none',
      tier: user?.tier || 'free',
      accountValue: null,
      buyingPower: null,
      todayPnL: null,
      openPositions: 0,
      positions: [],
      message: 'Connect your broker to see portfolio data',
    });
  } catch (error) {
    console.error('User portfolio fetch failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolio', 
        source: 'error',
        accountValue: 0,
        positions: [],
      },
      { status: 500 }
    );
  }
}
