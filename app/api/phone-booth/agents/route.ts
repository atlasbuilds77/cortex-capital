import { NextRequest, NextResponse } from 'next/server';
import { getAvailableAgents } from '@/lib/agents/phone-booth';

export async function GET(request: NextRequest) {
  try {
    const agents = getAvailableAgents();
    return NextResponse.json(agents);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
