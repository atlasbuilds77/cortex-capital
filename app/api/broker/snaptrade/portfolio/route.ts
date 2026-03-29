export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts, getPositions, getBalances } from '@/lib/integrations/snaptrade';

/**
 * GET /api/broker/snaptrade/portfolio
 * 
 * Get full portfolio data across all connected accounts.
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Get SnapTrade credentials
    const result = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );

    const snaptradeUserId = result.rows[0]?.snaptrade_user_id;
    const snaptradeUserSecret = result.rows[0]?.snaptrade_user_secret;

    if (!snaptradeUserId || !snaptradeUserSecret) {
      return NextResponse.json({
        error: 'No broker connected',
        positions: [],
        totalValue: 0,
      }, { status: 400 });
    }

    // Get all accounts
    const accounts = await listAccounts(snaptradeUserId, snaptradeUserSecret);

    if (!accounts.length) {
      return NextResponse.json({
        positions: [],
        totalValue: 0,
        buyingPower: 0,
        accounts: [],
      });
    }

    // Get positions and balances for all accounts
    const portfolioData = await Promise.all(
      accounts.map(async (account: any) => {
        const [positions, balances] = await Promise.all([
          getPositions(snaptradeUserId, snaptradeUserSecret, account.id),
          getBalances(snaptradeUserId, snaptradeUserSecret, account.id),
        ]);

        return {
          accountId: account.id,
          accountName: account.name,
          brokerage: account.brokerage_authorization?.brokerage?.name,
          positions: positions.map((p: any) => ({
            symbol: p.symbol?.symbol,
            name: p.symbol?.description || p.symbol?.symbol,
            quantity: p.units,
            averageCost: p.average_purchase_price,
            currentPrice: p.price,
            marketValue: (p.units || 0) * (p.price || 0),
            gainLoss: ((p.price || 0) - (p.average_purchase_price || 0)) * (p.units || 0),
            gainLossPercent: p.average_purchase_price 
              ? ((p.price - p.average_purchase_price) / p.average_purchase_price) * 100 
              : 0,
          })),
          balances: balances.map((b: any) => ({
            currency: b.currency?.code,
            cash: b.cash,
            buyingPower: b.buying_power,
          })),
        };
      })
    );

    // Aggregate totals
    let totalValue = 0;
    let totalBuyingPower = 0;
    const allPositions: any[] = [];

    portfolioData.forEach((account) => {
      account.positions.forEach((p: any) => {
        totalValue += p.marketValue || 0;
        allPositions.push({
          ...p,
          accountId: account.accountId,
          accountName: account.accountName,
          brokerage: account.brokerage,
        });
      });
      account.balances.forEach((b: any) => {
        totalValue += b.cash || 0;
        totalBuyingPower += b.buyingPower || 0;
      });
    });

    return NextResponse.json({
      totalValue,
      buyingPower: totalBuyingPower,
      positions: allPositions,
      accounts: portfolioData,
    });

  } catch (error: any) {
    console.error('[SnapTrade Portfolio] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
});
