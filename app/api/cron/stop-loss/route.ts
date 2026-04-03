export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { runStopLossGuardian } from '@/lib/agents/stop-loss-guardian';
import { getMarketStatus } from '@/lib/agents/auto-trading-cron';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && querySecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check market status
  const marketStatus = getMarketStatus();
  if (!marketStatus.open) {
    return NextResponse.json({ 
      success: true, 
      skipped: true,
      reason: marketStatus.reason,
      date: marketStatus.date,
    });
  }
  
  try {
    const result = await runStopLossGuardian();
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[StopLoss Cron] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
