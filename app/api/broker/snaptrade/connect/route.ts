export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { registerUser, getConnectionPortalUrl } from '@/lib/integrations/snaptrade';

/**
 * POST /api/broker/snaptrade/connect
 * 
 * Generate a SnapTrade connection portal URL for the user to link their broker.
 * If user doesn't have a SnapTrade account yet, create one.
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const redirectUri = body.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || 'https://cortexcapitalgroup.com'}/settings/broker?connected=true`;

    // Check if user already has SnapTrade credentials
    const existing = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );

    let snaptradeUserId = existing.rows[0]?.snaptrade_user_id;
    let snaptradeUserSecret = existing.rows[0]?.snaptrade_user_secret;

    // If no SnapTrade account, register one
    if (!snaptradeUserId || !snaptradeUserSecret) {
      const snapUser = await registerUser(`cortex_${user.userId}`);
      snaptradeUserId = snapUser.userId;
      snaptradeUserSecret = snapUser.userSecret;

      // Store SnapTrade credentials
      await query(
        'UPDATE users SET snaptrade_user_id = $1, snaptrade_user_secret = $2 WHERE id = $3',
        [snaptradeUserId, snaptradeUserSecret, user.userId]
      );
    }

    // Generate connection portal URL with trading enabled
    const portalUrl = await getConnectionPortalUrl(
      snaptradeUserId,
      snaptradeUserSecret,
      'trade', // Enable trading, not just read
      redirectUri
    );

    return NextResponse.json({
      success: true,
      portalUrl,
      message: 'Open this URL to connect your broker',
    });

  } catch (error: any) {
    console.error('[SnapTrade Connect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate connection portal' },
      { status: 500 }
    );
  }
});
