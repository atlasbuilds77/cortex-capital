export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { morningRoutine } from '@/lib/agents/trade-pipeline';

export async function POST(request: NextRequest) {
  try {
    morningRoutine().catch(console.error);
    return NextResponse.json({ 
      success: true, 
      message: 'Morning routine started' 
    });
  } catch (error) {
    console.error('Morning route error:', error);
    return NextResponse.json(
      { error: 'Failed to start morning routine' },
      { status: 500 }
    );
  }
}
