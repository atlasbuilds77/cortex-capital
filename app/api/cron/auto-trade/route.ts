export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Vercel

import { NextRequest, NextResponse } from 'next/server';
import { runCronCycle, isMarketOpen } from '@/lib/agents/auto-trading-cron';

// Vercel Cron endpoint for auto-trading
// Schedule: every 15 min, 9am-4pm ET, Mon-Fri
// Or call manually with CRON_SECRET header for testing
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically)
  // Accept both: Authorization header OR ?secret= query param (for Docker cron compatibility)
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
  
  // Check market hours (bypass with ?force=true for testing)
  const forceRun = url.searchParams.get('force') === 'true';
  if (!forceRun && !isMarketOpen()) {
    return NextResponse.json({ 
      success: true, 
      skipped: true,
      reason: 'Market closed' 
    });
  }
  
  try {
    const result = await runCronCycle();
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Cron API] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
