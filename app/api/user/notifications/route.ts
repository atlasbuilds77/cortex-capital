export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

// GET - Fetch notification settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT notification_settings FROM users WHERE id = $1',
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default settings if none saved
    const defaults = {
      email_trade_executed: true,
      email_stop_loss: true,
      email_trade_signals: true,
      email_daily_digest: true,
      email_weekly_report: true,
      email_account_alerts: true,
      push_enabled: false,
    };

    const settings = result.rows[0].notification_settings || defaults;
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update notification settings
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const settings = await request.json();

    await query(
      'UPDATE users SET notification_settings = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(settings), user.userId]
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
