export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { risk_profile } = await request.json();
    
    if (!risk_profile) {
      return NextResponse.json(
        { success: false, error: 'risk_profile is required' },
        { status: 400 }
      );
    }

    const validProfiles = ['conservative', 'moderate', 'aggressive', 'ultra_aggressive'];
    if (!validProfiles.includes(risk_profile)) {
      return NextResponse.json(
        { success: false, error: 'Invalid risk profile' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE users SET risk_profile = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, tier, risk_profile`,
      [risk_profile, user.userId]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Failed to update risk profile' },
      { status: 500 }
    );
  }
});
