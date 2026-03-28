export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { endOfDayRoutine } from '@/lib/agents/trade-pipeline';

export async function POST(request: NextRequest) {
  try {
    endOfDayRoutine().catch(console.error);
    return NextResponse.json({ 
      success: true, 
      message: 'EOD routine started' 
    });
  } catch (error) {
    console.error('EOD route error:', error);
    return NextResponse.json(
      { error: 'Failed to start EOD routine' },
      { status: 500 }
    );
  }
}
