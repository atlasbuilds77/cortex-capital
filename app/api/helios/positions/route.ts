export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

/**
 * GET /api/helios/positions
 *
 * Returns the authenticated user's Helios-triggered trades/executions,
 * joined with the originating signal data.
 * Requires user to hold the Helios Discord role (has_helios_role = true).
 *
 * Query params:
 *   status?  — filter by execution status (pending|submitted|filled|failed|skipped)
 *   limit?   — number of results (default 50, max 200)
 *   offset?  — pagination offset (default 0)
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  // ── Role gate ───────────────────────────────────────────────────────────────
  const roleCheck = await query(
    'SELECT has_helios_role FROM users WHERE id = $1',
    [user.userId]
  );
  if (!roleCheck.rows.length || !roleCheck.rows[0].has_helios_role) {
    return NextResponse.json(
      { error: 'Access denied. Helios role required.', code: 'HELIOS_ROLE_REQUIRED' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') ?? null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const validStatuses = ['pending', 'submitted', 'filled', 'failed', 'skipped'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Build query with optional status filter
    const params: any[] = [user.userId, limit, offset];
    const statusClause = status
      ? `AND he.status = $${params.push(status)}`
      : '';

    const result = await query(
      `SELECT
         he.id                   AS execution_id,
         he.status               AS execution_status,
         he.broker_order_id,
         he.quantity,
         he.position_size_pct,
         he.error_message,
         he.created_at           AS executed_at,
         he.updated_at,

         hs.id                   AS signal_id,
         hs.signal_id            AS helios_signal_id,
         hs.ticker,
         hs.direction,
         hs.contract_symbol,
         hs.strike,
         hs.expiry,
         hs.entry_price,
         hs.received_at          AS signal_received_at
       FROM helios_executions he
       JOIN helios_signals hs ON hs.id = he.signal_id
       WHERE he.user_id = $1
         ${statusClause}
       ORDER BY he.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    // Count query for pagination
    const countParams: any[] = [user.userId];
    const countStatusClause = status
      ? `AND he.status = $${countParams.push(status)}`
      : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM helios_executions he
       WHERE he.user_id = $1
         ${countStatusClause}`,
      countParams
    );

    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    return NextResponse.json({
      positions: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (err: any) {
    console.error('[Helios/positions] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Helios positions' },
      { status: 500 }
    );
  }
});
