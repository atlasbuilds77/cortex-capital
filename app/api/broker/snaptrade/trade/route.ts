export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { placeOrder, listAccounts } from '@/lib/integrations/snaptrade';

/**
 * POST /api/broker/snaptrade/trade
 * 
 * Place a trade through SnapTrade.
 * 
 * Body:
 * {
 *   accountId?: string,  // Optional - uses first account if not specified
 *   symbol: string,
 *   action: 'BUY' | 'SELL',
 *   quantity: number,
 *   orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit',
 *   limitPrice?: number,
 *   stopPrice?: number,
 *   timeInForce: 'Day' | 'GTC'
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.symbol || !body.action || !body.quantity || !body.orderType) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, action, quantity, orderType' },
        { status: 400 }
      );
    }

    // Get SnapTrade credentials
    const result = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );

    const snaptradeUserId = result.rows[0]?.snaptrade_user_id;
    const snaptradeUserSecret = result.rows[0]?.snaptrade_user_secret;

    if (!snaptradeUserId || !snaptradeUserSecret) {
      return NextResponse.json(
        { error: 'No broker connected. Connect a broker first.' },
        { status: 400 }
      );
    }

    // Get account ID
    let accountId = body.accountId;
    if (!accountId) {
      const accounts = await listAccounts(snaptradeUserId, snaptradeUserSecret);
      if (!accounts.length) {
        return NextResponse.json(
          { error: 'No accounts found. Connect a broker first.' },
          { status: 400 }
        );
      }
      accountId = accounts[0].id;
    }

    // Place the order
    const orderResult = await placeOrder(
      snaptradeUserId,
      snaptradeUserSecret,
      accountId,
      {
        symbol: body.symbol.toUpperCase(),
        action: body.action,
        orderType: body.orderType,
        quantity: body.quantity,
        limitPrice: body.limitPrice,
        stopPrice: body.stopPrice,
        timeInForce: body.timeInForce || 'Day',
      }
    );

    // Log the trade
    await query(
      `INSERT INTO trade_log (user_id, symbol, action, quantity, order_type, status, broker_order_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        user.userId,
        body.symbol.toUpperCase(),
        body.action,
        body.quantity,
        body.orderType,
        'submitted',
        orderResult.brokerage_order_id || null,
      ]
    ).catch(() => {}); // Don't fail if logging fails

    return NextResponse.json({
      success: true,
      order: orderResult,
      message: `${body.action} ${body.quantity} ${body.symbol} order placed`,
    });

  } catch (error: any) {
    console.error('[SnapTrade Trade] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to place order' },
      { status: 500 }
    );
  }
});
