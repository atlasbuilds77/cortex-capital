export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticate(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const result = await query(
      'SELECT id, email, tier, created_at FROM users WHERE id = $1',
      [authUser.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for SnapTrade connection
    const snapResult = await query(
      'SELECT snaptrade_user_id FROM users WHERE id = $1 AND snaptrade_user_id IS NOT NULL',
      [authUser.userId]
    );
    const hasSnapTrade = snapResult.rows.length > 0;

    // Get broker type from broker_credentials if exists
    const brokerResult = await query(
      'SELECT broker_type FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1',
      [authUser.userId]
    );

    const user = result.rows[0];
    return NextResponse.json({
      id: user.id,
      email: user.email,
      tier: user.tier,
      brokerType: brokerResult.rows[0]?.broker_type || null,
      hasBrokerConnected: hasSnapTrade || brokerResult.rows.length > 0,
      brokerSource: hasSnapTrade ? 'snaptrade' : (brokerResult.rows[0]?.broker_type || null),
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
