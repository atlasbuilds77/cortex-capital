export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const storedHash = result.rows[0].password_hash;

    // OAuth users don't have a password
    if (storedHash === 'OAUTH_USER_NO_PASSWORD') {
      return NextResponse.json(
        { error: 'OAuth users cannot change password. Use your OAuth provider.' },
        { status: 400 }
      );
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, storedHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, user.userId]
    );

    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
});
