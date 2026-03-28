export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { phoneBoothChat } from '@/lib/agents/phone-booth';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';

export const POST = requireAuth(
  requireTier('scout')(async (request: NextRequest, user, tier) => {
    try {
      const { agentId, message } = await request.json();
      
      if (!agentId || !message) {
        return NextResponse.json(
          { error: 'agentId and message required' },
          { status: 400 }
        );
      }

      const response = await phoneBoothChat(agentId, user.userId, message);
      return NextResponse.json({ success: true, ...response });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  })
);
