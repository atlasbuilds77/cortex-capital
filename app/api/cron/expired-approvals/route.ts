export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { processExpiredApprovals } from '@/lib/approvals';

// Cron endpoint for processing expired trade approvals
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = cronSecret && (
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret
  );

  if (cronSecret && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processExpiredApprovals();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Expired Approvals Cron] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process expired approvals' }, { status: 500 });
  }
}
