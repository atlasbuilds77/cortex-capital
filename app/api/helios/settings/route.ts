export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

/**
 * POST /api/helios/settings
 *
 * Toggle Helios auto-execution on/off and optionally set position size.
 * Authenticated via session JWT.
 * Requires user to hold the Helios Discord role (has_helios_role = true).
 *
 * Body:
 * {
 *   enabled:            boolean,  // true = auto-execute Helios signals
 *   position_size_pct?: number,   // % of portfolio per trade (0.01–100)
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
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

  let body: { enabled: boolean; position_size_pct?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'enabled (boolean) is required' },
      { status: 400 }
    );
  }

  // Validate position_size_pct if provided
  if (body.position_size_pct !== undefined) {
    const pct = body.position_size_pct;
    if (typeof pct !== 'number' || pct <= 0 || pct > 100) {
      return NextResponse.json(
        { error: 'position_size_pct must be a number between 0.01 and 100' },
        { status: 400 }
      );
    }
  }

  try {
    const updateResult = await query(
      `UPDATE users
       SET
         helios_enabled       = $2,
         helios_position_size = COALESCE($3, helios_position_size)
       WHERE id = $1
       RETURNING helios_enabled, helios_position_size`,
      [user.userId, body.enabled, body.position_size_pct ?? null]
    );

    if (!updateResult.rows.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = updateResult.rows[0];

    return NextResponse.json({
      success: true,
      helios_enabled: updated.helios_enabled,
      helios_position_size: parseFloat(updated.helios_position_size),
      message: body.enabled
        ? 'Helios auto-execution enabled.'
        : 'Helios auto-execution disabled.',
    });
  } catch (err: any) {
    console.error('[Helios/settings] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update Helios settings' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/helios/settings
 *
 * Returns the current user's Helios settings.
 * Requires Helios Discord role.
 */
export const GET = requireAuth(async (_request: NextRequest, user) => {
  try {
    const result = await query(
      `SELECT helios_enabled, helios_position_size, has_helios_role FROM users WHERE id = $1`,
      [user.userId]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = result.rows[0];

    // ── Role gate ─────────────────────────────────────────────────────────────
    if (!row.has_helios_role) {
      return NextResponse.json(
        { error: 'Access denied. Helios role required.', code: 'HELIOS_ROLE_REQUIRED' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      helios_enabled: row.helios_enabled,
      helios_position_size: parseFloat(row.helios_position_size),
    });
  } catch (err: any) {
    console.error('[Helios/settings] GET Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Helios settings' },
      { status: 500 }
    );
  }
});
