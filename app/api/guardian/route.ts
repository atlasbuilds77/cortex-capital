export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { startExpiryGuardianCron } from '@/lib/agents/expiry-guardian';
import { safeEqual } from '@/lib/env';

/**
 * GET /api/guardian - Check guardian status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Expiry Guardian is available. POST to /api/guardian to start cron.',
  });
}

/**
 * POST /api/guardian - Start guardian cron job
 * This should be called by a Vercel cron or external cron service
 */
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-guardian-secret');

    const expectedSecret = process.env.GUARDIAN_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Guardian endpoint unavailable' },
        { status: 503 }
      );
    }

    if (!secret || !safeEqual(secret, expectedSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start the guardian
    startExpiryGuardianCron();

    return NextResponse.json({
      success: true,
      message: 'Expiry Guardian started',
    });
  } catch (error) {
    console.error('Guardian start error:', error);
    return NextResponse.json(
      { error: 'Failed to start guardian' },
      { status: 500 }
    );
  }
}
