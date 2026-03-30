export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { verifyTOTP, checkBackupCode } from '@/lib/two-factor';

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

    // Get user's 2FA data
    const userResult = await query(
      'SELECT two_factor_secret, two_factor_enabled, backup_codes FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { two_factor_secret, two_factor_enabled, backup_codes } = userResult.rows[0];

    if (!two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify code (TOTP or backup code)
    const cleanCode = code.trim();
    let isValid = await verifyTOTP(cleanCode, two_factor_secret);

    // If TOTP fails, try backup codes
    if (!isValid && backup_codes && backup_codes.length > 0) {
      const backupIndex = checkBackupCode(cleanCode, backup_codes);
      if (backupIndex >= 0) {
        isValid = true;
        // Remove used backup code
        const newBackupCodes = [...backup_codes];
        newBackupCodes.splice(backupIndex, 1);
        await query(
          'UPDATE users SET backup_codes = $1 WHERE id = $2',
          [newBackupCodes, user.userId]
        );
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Disable 2FA and clear secret/backup codes
    await query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, backup_codes = NULL WHERE id = $1',
      [user.userId]
    );

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    });
  } catch (error) {
    console.error('2FA DISABLE ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
