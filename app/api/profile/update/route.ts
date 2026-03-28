export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { name, phone, risk_profile } = await request.json();

    // Validate risk profile if provided
    if (risk_profile) {
      const validProfiles = ['conservative', 'moderate', 'aggressive', 'ultra_aggressive'];
      if (!validProfiles.includes(risk_profile)) {
        return NextResponse.json(
          { success: false, error: 'Invalid risk profile' },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (risk_profile !== undefined) {
      updates.push(`risk_profile = $${paramIndex++}`);
      values.push(risk_profile);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(user.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, tier, risk_profile`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
});
