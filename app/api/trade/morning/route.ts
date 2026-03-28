import { NextRequest, NextResponse } from 'next/server';
import { morningRoutine } from '@/lib/agents/trade-pipeline';

export async function POST(request: NextRequest) {
  try {
    morningRoutine().catch(console.error);
    return NextResponse.json({ 
      success: true, 
      message: 'Morning routine started' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
