import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel cron endpoint for heartbeat
// Configured via vercel.json: "crons": [{ "path": "/api/heartbeat", "schedule": "*/5 * * * *" }]

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.HEARTBEAT_AUTH_TOKEN;
  
  // Skip auth for Vercel cron (has specific header)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  
  if (!isVercelCron && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const startTime = Date.now();
  
  try {
    // In production, this would import and run the actual heartbeat
    // import { heartbeat } from '../../../integration/heartbeat';
    // const result = await heartbeat.run();
    
    // For now, simulate heartbeat result
    const result = {
      timestamp: new Date().toISOString(),
      durationMs: Math.floor(Math.random() * 5000) + 2000,
      operations: {
        evaluateTriggers: { success: true, fired: Math.floor(Math.random() * 3), durationMs: 1200 },
        processReactionQueue: { success: true, processed: Math.floor(Math.random() * 5), durationMs: 800 },
        promoteInsights: { success: true, promoted: Math.floor(Math.random() * 2), durationMs: 400 },
        learnFromOutcomes: { success: true, lessons: Math.floor(Math.random() * 3), durationMs: 600 },
        recoverStaleSteps: { success: true, recovered: 0, durationMs: 200 },
        recoverStaleRoundtables: { success: true, recovered: 0, durationMs: 100 },
      },
      errors: [],
    };
    
    const totalDuration = Date.now() - startTime;
    
    // Check budget (15 seconds)
    if (totalDuration > 15000) {
      console.warn(`Heartbeat exceeded budget: ${totalDuration}ms`);
    }
    
    return NextResponse.json({
      success: true,
      result,
      executedAt: new Date().toISOString(),
      durationMs: totalDuration,
    });
    
  } catch (error) {
    console.error('Heartbeat failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow POST for manual triggers
  return GET(request);
}
