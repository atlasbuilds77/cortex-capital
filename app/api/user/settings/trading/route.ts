export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

interface TradingSettings {
  auto_execute_enabled: boolean
  risk_profile: 'conservative' | 'moderate' | 'aggressive'
  max_position_size: number
  max_daily_loss: number
  allowed_symbols: string[]
  trading_hours: {
    start: string
    end: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current settings from database
    const result = await query(
      `SELECT 
        auto_execute_enabled,
        risk_profile,
        max_position_size,
        max_daily_loss,
        allowed_symbols,
        trading_hours_start,
        trading_hours_end
      FROM users 
      WHERE id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = result.rows[0];
    
    const settings: TradingSettings = {
      auto_execute_enabled: row.auto_execute_enabled || false,
      risk_profile: row.risk_profile || 'moderate',
      max_position_size: row.max_position_size || 10000,
      max_daily_loss: row.max_daily_loss || 500,
      allowed_symbols: row.allowed_symbols || ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN'],
      trading_hours: {
        start: row.trading_hours_start || '09:30',
        end: row.trading_hours_end || '16:00'
      }
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch trading settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settings: TradingSettings = body.settings;

    // Validate settings
    if (!settings || typeof settings.auto_execute_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }

    // Update database
    await query(
      `UPDATE users SET
        auto_execute_enabled = $1,
        risk_profile = $2,
        max_position_size = $3,
        max_daily_loss = $4,
        allowed_symbols = $5,
        trading_hours_start = $6,
        trading_hours_end = $7,
        updated_at = NOW()
      WHERE id = $8`,
      [
        settings.auto_execute_enabled,
        settings.risk_profile,
        settings.max_position_size,
        settings.max_daily_loss,
        settings.allowed_symbols,
        settings.trading_hours.start,
        settings.trading_hours.end,
        user.userId
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save trading settings:', error);
    return NextResponse.json(
      { error: 'Failed to save trading settings' },
      { status: 500 }
    );
  }
}