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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
