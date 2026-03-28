export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableAgents } from '@/lib/agents/phone-booth';

export async function GET(request: NextRequest) {
  try {
    const agents = getAvailableAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Phone booth agents route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
