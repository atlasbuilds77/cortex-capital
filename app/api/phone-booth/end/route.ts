export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { endPhoneBoothSession } from '@/lib/agents/phone-booth';

export async function POST(request: NextRequest) {
  try {
    const { agentId, userId } = await request.json();
    endPhoneBoothSession(agentId, userId || 'demo-user');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
