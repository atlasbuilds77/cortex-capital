export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { verifyTOTP, checkBackupCode } from '@/lib/two-factor';
import { getRequiredEnv } from '@/lib/env';

function getJwtSecret(): string {
  return getRequiredEnv('JWT_SECRET');
}

export async function POST(request: NextRequest) {
  try {
    const { tempToken, code } = await request.json();

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and code are required' },
        { status: 400 }
      );
    }

    // Verify temp token
    let decoded: { userId: string; email: string; pending2FA: boolean };
    try {
      decoded = jwt.verify(tempToken, getJwtSecret(), {
        algorithms: ['HS256'],
      }) as typeof decoded;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded.pending2FA) {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      );
    }

    // Get user's 2FA data
    const userResult = await query(
      'SELECT id, email, tier, two_factor_secret, two_factor_enabled, backup_codes, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Verify code (TOTP or backup code)
    const cleanCode = code.trim();
    let isValid = await verifyTOTP(cleanCode, user.two_factor_secret);
    let usedBackupCode = false;

    // If TOTP fails, try backup codes
    if (!isValid && user.backup_codes && user.backup_codes.length > 0) {
      const backupIndex = checkBackupCode(cleanCode, user.backup_codes);
      if (backupIndex >= 0) {
        isValid = true;
        usedBackupCode = true;
        // Remove used backup code
        const newBackupCodes = [...user.backup_codes];
        newBackupCodes.splice(backupIndex, 1);
        await query(
          'UPDATE users SET backup_codes = $1 WHERE id = $2',
          [newBackupCodes, decoded.userId]
        );
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate full JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '30d', algorithm: 'HS256' }
    );

    const response: {
      token: string;
      user: { id: string; email: string; tier: string; createdAt: string };
      usedBackupCode?: boolean;
      remainingBackupCodes?: number;
    } = {
      token,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        createdAt: user.created_at,
      },
    };

    // Warn user if they used a backup code
    if (usedBackupCode) {
      response.usedBackupCode = true;
      const remaining = user.backup_codes.length - 1;
      response.remainingBackupCodes = remaining;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('2FA VALIDATE ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to validate 2FA code' },
      { status: 500 }
    );
  }
}
