export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { verifyTOTP } from '@/lib/two-factor';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Get user's secret
    const userResult = await query(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { two_factor_secret, two_factor_enabled } = userResult.rows[0];

    if (two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    if (!two_factor_secret) {
      return NextResponse.json(
        { error: 'Please setup 2FA first' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = await verifyTOTP(code.trim(), two_factor_secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await query(
      'UPDATE users SET two_factor_enabled = true WHERE id = $1',
      [user.userId]
    );

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully',
    });
  } catch (error) {
    console.error('2FA VERIFY ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
