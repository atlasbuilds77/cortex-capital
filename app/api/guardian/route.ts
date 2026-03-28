export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { startExpiryGuardianCron } from '@/lib/agents/expiry-guardian';

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
    
    // Simple secret protection (set GUARDIAN_SECRET in env)
    const expectedSecret = process.env.GUARDIAN_SECRET || 'cortex-guardian-2026';
    if (secret !== expectedSecret) {
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
  } catch (error: any) {
    console.error('Guardian start error:', error);
    return NextResponse.json(
      { error: 'Failed to start guardian', details: error.message },
      { status: 500 }
    );
  }
}
