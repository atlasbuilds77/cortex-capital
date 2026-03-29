export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// One-time migration to add onboarding_completed column
// DELETE THIS FILE AFTER RUNNING ONCE
export async function POST(request: NextRequest) {
  try {
    // Check for admin secret
    const { secret } = await request.json();
    if (secret !== 'cortex_migrate_2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add column if not exists
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false
    `);

    // Mark existing users with custom risk profile as completed
    const result1 = await query(`
      UPDATE users SET onboarding_completed = true 
      WHERE risk_profile IS NOT NULL AND risk_profile != 'moderate'
      RETURNING id
    `);

    // Mark users with broker credentials as completed
    const result2 = await query(`
      UPDATE users SET onboarding_completed = true 
      WHERE id IN (SELECT DISTINCT user_id FROM broker_credentials)
      RETURNING id
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      customRiskProfileUsers: result1.rowCount,
      brokerConnectedUsers: result2.rowCount,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
