export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { checkHeliosRole } from '@/lib/discord-role';

/**
 * POST /api/helios/refresh-role
 *
 * Re-checks whether the authenticated user holds the Helios Discord role
 * and updates has_helios_role in the DB accordingly.
 *
 * Returns:
 * {
 *   has_helios_role: boolean,
 *   message: string,
 * }
 */
export const POST = requireAuth(async (_request: NextRequest, user) => {
  try {
    // Fetch user's discord_id and stored access token from DB
    const userResult = await query(
      'SELECT discord_id, discord_access_token FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userResult.rows.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { discord_id, discord_access_token } = userResult.rows[0];

    if (!discord_id) {
      return NextResponse.json(
        {
          error: 'Discord account not linked. Please log in via Discord first.',
          code: 'DISCORD_NOT_LINKED',
        },
        { status: 400 }
      );
    }

    // Re-check role via Discord API
    const hasHeliosRole = await checkHeliosRole(discord_id, discord_access_token);

    // Persist result
    await query(
      'UPDATE users SET has_helios_role = $1, updated_at = NOW() WHERE id = $2',
      [hasHeliosRole, user.userId]
    );

    console.log(
      `[Helios/refresh-role] userId=${user.userId} discordId=${discord_id} hasHeliosRole=${hasHeliosRole}`
    );

    return NextResponse.json({
      has_helios_role: hasHeliosRole,
      message: hasHeliosRole
        ? 'Helios role confirmed. Access granted.'
        : 'Helios role not found. Access denied. Make sure you hold the Helios role in the Discord server.',
    });
  } catch (err: any) {
    console.error('[Helios/refresh-role] Error:', err);
    return NextResponse.json(
      { error: 'Failed to refresh Helios role' },
      { status: 500 }
    );
  }
});
