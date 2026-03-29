export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Vercel

import { NextRequest, NextResponse } from 'next/server';
import { runCronCycle, isMarketOpen } from '@/lib/agents/auto-trading-cron';

// Vercel Cron endpoint for auto-trading
// Schedule: every 15 min, 9am-4pm ET, Mon-Fri
// Or call manually with CRON_SECRET header for testing
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check market hours
  if (!isMarketOpen()) {
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
