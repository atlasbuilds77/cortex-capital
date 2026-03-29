export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

/**
 * POST /api/broker/snaptrade/accounts/select
 * 
 * Set the user's selected account for portfolio display
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Update user's selected account
    await query(
      'UPDATE users SET selected_snaptrade_account = $1 WHERE id = $2',
      [accountId, user.userId]
    );

    return NextResponse.json({ success: true, selectedAccount: accountId });
  } catch (error: any) {
    console.error('[SnapTrade Select Account] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to select account' },
      { status: 500 }
    );
  }
});
