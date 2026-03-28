export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';

const ALPACA_CLIENT_ID = process.env.ALPACA_CLIENT_ID || 'PKXPAHHSVOFCAXOXINQXP6UXST';
const ALPACA_REDIRECT_URI = process.env.ALPACA_REDIRECT_URI || 'http://localhost:3000/api/broker/callback';

const TRADIER_CLIENT_ID = process.env.TRADIER_CLIENT_ID || '';
const TRADIER_REDIRECT_URI = process.env.TRADIER_REDIRECT_URI || 'http://localhost:3000/api/broker/callback';

export const POST = requireAuth(
  requireTier('operator')(async (request: NextRequest, user, tier) => {
    try {
      const body = await request.json();
      const { broker } = body;

      if (!broker || !['alpaca', 'tradier'].includes(broker)) {
        return NextResponse.json(
          { error: 'Invalid broker. Must be "alpaca" or "tradier".' },
          { status: 400 }
        );
      }

      // Generate OAuth URL based on broker
      if (broker === 'alpaca') {
        const authUrl = new URL('https://app.alpaca.markets/oauth/authorize');
        authUrl.searchParams.set('client_id', ALPACA_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', ALPACA_REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'account:write trading');
        authUrl.searchParams.set('state', user.userId); // Pass user ID in state

        return NextResponse.json({
          broker: 'alpaca',
          authUrl: authUrl.toString(),
        });
      }

      if (broker === 'tradier') {
        const authUrl = new URL('https://api.tradier.com/v1/oauth/authorize');
        authUrl.searchParams.set('client_id', TRADIER_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', TRADIER_REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'read write trade market');
        authUrl.searchParams.set('state', user.userId);

        return NextResponse.json({
          broker: 'tradier',
          authUrl: authUrl.toString(),
        });
      }

      return NextResponse.json({ error: 'Unsupported broker' }, { status: 400 });
    } catch (error: any) {
      console.error('Broker connect error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate broker connection', details: error.message },
        { status: 500 }
      );
    }
  })
);
