export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

// GET - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getAuthUser } = await import('@/lib/auth-middleware');
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT risk_profile, trading_goals, sector_interests, exclusions, enabled_agents 
       FROM users WHERE id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      riskProfile: row.risk_profile || 'moderate',
      tradingGoals: row.trading_goals || ['Long-term growth'],
      sectorInterests: row.sector_interests || ['Technology'],
      exclusions: row.exclusions || [],
      enabledAgents: row.enabled_agents || {
        analyst: true,
        strategist: true,
        executor: true,
        reporter: true,
        options_strategist: true,
        day_trader: true,
        momentum: true,
      },
    });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update user preferences
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { riskProfile, tradingGoals, sectorInterests, exclusions, enabledAgents } = body;

    // Validate risk profile
    if (riskProfile && !['conservative', 'moderate', 'aggressive', 'ultra_aggressive'].includes(riskProfile)) {
      return NextResponse.json({ error: 'Invalid risk profile' }, { status: 400 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (riskProfile !== undefined) {
      updates.push(`risk_profile = $${paramIndex++}`);
      values.push(riskProfile);
    }
    if (tradingGoals !== undefined) {
      updates.push(`trading_goals = $${paramIndex++}`);
      values.push(JSON.stringify(tradingGoals));
    }
    if (sectorInterests !== undefined) {
      updates.push(`sector_interests = $${paramIndex++}`);
      values.push(JSON.stringify(sectorInterests));
    }
    if (exclusions !== undefined) {
      updates.push(`exclusions = $${paramIndex++}`);
      values.push(JSON.stringify(exclusions));
    }
    if (enabledAgents !== undefined) {
      updates.push(`enabled_agents = $${paramIndex++}`);
      values.push(JSON.stringify(enabledAgents));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(user.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING risk_profile, trading_goals, sector_interests, exclusions, enabled_agents`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
