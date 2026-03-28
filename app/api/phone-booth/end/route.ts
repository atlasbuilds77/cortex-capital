export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { endPhoneBoothSession } from '@/lib/agents/phone-booth';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';

export const POST = requireAuth(
  requireTier('scout')(async (request: NextRequest, user) => {
    try {
      const { agentId } = await request.json();
      if (!agentId) {
        return NextResponse.json(
          { error: 'agentId is required' },
          { status: 400 }
        );
      }

      endPhoneBoothSession(agentId, user.userId);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Phone booth end error:', error);
      return NextResponse.json(
        { error: 'Failed to end phone booth session' },
        { status: 500 }
      );
    }
  })
);
