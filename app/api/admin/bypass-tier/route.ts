export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { safeEqual } from '@/lib/env';

const VALID_TIERS = ['free', 'recovery', 'scout', 'operator'];

export async function POST(request: NextRequest) {
  try {
    const { key, email, tier } = await request.json();

    const bypassKey = process.env.ADMIN_BYPASS_KEY;
    if (!bypassKey) {
      return NextResponse.json({ error: 'Bypass endpoint unavailable' }, { status: 503 });
    }

    if (typeof key !== 'string' || !safeEqual(key, bypassKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email || !tier) {
      return NextResponse.json({ error: 'Email and tier required' }, { status: 400 });
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier value' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Update or create user with specified tier
    const result = await query(`
      INSERT INTO users (email, tier, subscription_status, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        tier = $2,
        subscription_status = 'active',
        updated_at = NOW()
      RETURNING id, email, tier
    `, [normalizedEmail, tier]);

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: `Tier set to ${tier} for ${normalizedEmail}`
    });
  } catch (error) {
    console.error('Bypass error:', error);
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}
