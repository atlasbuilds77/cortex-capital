export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { executeTradeIdea } from '@/lib/agents/trade-pipeline';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';

export const POST = requireAuth(
  requireTier('operator')(async (request: NextRequest, user, tier) => {
    try {
      const { symbol, direction, thesis, source, confidence } = await request.json();
      
      if (!symbol || !direction) {
        return NextResponse.json(
          { error: 'symbol and direction required' },
          { status: 400 }
        );
      }

      // Run pipeline async (don't block the response)
      executeTradeIdea({
        symbol,
        direction: direction || 'long',
        thesis: thesis || `${direction} setup on ${symbol}`,
        source: source || 'MOMENTUM',
        confidence: confidence || 70,
      }).catch(console.error);

      return NextResponse.json({ 
        success: true, 
        message: `Trade pipeline started for ${symbol} ${direction}` 
      });
    } catch (error) {
      console.error('Trade signal route error:', error);
      return NextResponse.json(
        { error: 'Failed to start trade pipeline' },
        { status: 500 }
      );
    }
  })
);
