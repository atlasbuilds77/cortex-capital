export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

// GET - Fetch trading settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT auto_execute_enabled FROM users WHERE id = $1',
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      auto_execute_enabled: result.rows[0].auto_execute_enabled || false,
    });
  } catch (error: any) {
    console.error('Get trading settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update trading settings
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { auto_execute_enabled } = await request.json();

    // Verify user has a tier that allows execution
    const userResult = await query('SELECT tier FROM users WHERE id = $1', [user.userId]);
    const tier = userResult.rows[0]?.tier || 'free';
    
    const TIER_CAN_EXECUTE: Record<string, boolean> = {
      free: false,
      recovery: false,
      scout: true,
      operator: true,
      partner: true,
    };

    if (!TIER_CAN_EXECUTE[tier]) {
      return NextResponse.json(
        { error: 'Your tier does not support auto-execution. Upgrade to Scout or higher.' },
        { status: 403 }
      );
    }

    await query(
      'UPDATE users SET auto_execute_enabled = $1, updated_at = NOW() WHERE id = $2',
      [auto_execute_enabled, user.userId]
    );

    return NextResponse.json({ 
      success: true, 
      auto_execute_enabled,
      message: auto_execute_enabled 
        ? 'Auto-trading enabled. Agents will now execute trades based on their analysis.'
        : 'Auto-trading disabled. Agents will only provide recommendations.'
    });
  } catch (error: any) {
    console.error('Update trading settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
