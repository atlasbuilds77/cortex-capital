export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Secret bypass key - only you know this
const BYPASS_KEY = 'orion-titan-2026';

export async function POST(request: NextRequest) {
  try {
    const { key, email, tier } = await request.json();
    
    if (key !== BYPASS_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!email || !tier) {
      return NextResponse.json({ error: 'Email and tier required' }, { status: 400 });
    }
    
    // Update or create user with specified tier
    const result = await query(`
      INSERT INTO users (email, tier, subscription_status, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        tier = $2,
        subscription_status = 'active',
        updated_at = NOW()
      RETURNING id, email, tier
    `, [email, tier]);
    
    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: `Tier set to ${tier} for ${email}`
    });
  } catch (error: any) {
    console.error('Bypass error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
