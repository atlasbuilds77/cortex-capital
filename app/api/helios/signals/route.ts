export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

/**
 * GET /api/helios/signals
 * List recent Helios signals (for dashboard display)
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check if user has Helios role
    const userResult = await query(
      'SELECT has_helios_role FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userResult.rows[0]?.has_helios_role) {
      return NextResponse.json(
        { error: 'Access denied. Helios role required.', code: 'HELIOS_ROLE_REQUIRED' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await query(
      `SELECT 
        signal_id as id,
        ticker,
        direction,
        contract_symbol,
        strike,
        expiry,
        entry_price,
        created_at as timestamp,
        'executed' as status
      FROM helios_signals
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      signals: result.rows.map(row => ({
        ...row,
        confidence: 85, // Helios doesn't send confidence, default to 85
      })),
      pagination: {
        limit,
        offset,
        hasMore: result.rows.length === limit,
      },
    });

  } catch (error: any) {
    console.error('[Helios Signals] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signals' },
      { status: 500 }
    );
  }
});
