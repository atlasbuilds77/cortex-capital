export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { generateSecret, generateQRCode, generateBackupCodes, hashBackupCode } from '@/lib/two-factor';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if 2FA is already enabled
    const userResult = await query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userResult.rows[0].two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to reconfigure.' },
        { status: 400 }
      );
    }

    // Generate new secret
    const secret = generateSecret();
    
    // Generate QR code
    const qrCode = await generateQRCode(user.email, secret);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Store secret and backup codes (not enabled yet - user must verify first)
    await query(
      'UPDATE users SET two_factor_secret = $1, backup_codes = $2 WHERE id = $3',
      [secret, hashedBackupCodes, user.userId]
    );

    return NextResponse.json({
      secret, // For manual entry if QR doesn't work
      qrCode, // Data URL for QR code image
      backupCodes, // Show these ONCE to the user
    });
  } catch (error) {
    console.error('2FA SETUP ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
