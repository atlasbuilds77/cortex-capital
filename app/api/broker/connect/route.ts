export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { createBrokerOAuthState } from '@/lib/broker-oauth-state';

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
        const clientId = process.env.ALPACA_CLIENT_ID;
        const redirectUri = process.env.ALPACA_REDIRECT_URI;
        if (!clientId || !redirectUri) {
          return NextResponse.json(
            { error: 'Alpaca integration is not configured' },
            { status: 503 }
          );
        }

        const authUrl = new URL('https://app.alpaca.markets/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'account:write trading');
        authUrl.searchParams.set('state', createBrokerOAuthState(user.userId, 'alpaca'));
        authUrl.searchParams.set('broker', 'alpaca');

        return NextResponse.json({
          broker: 'alpaca',
          authUrl: authUrl.toString(),
        });
      }

      if (broker === 'tradier') {
        const clientId = process.env.TRADIER_CLIENT_ID;
        const redirectUri = process.env.TRADIER_REDIRECT_URI;
        if (!clientId || !redirectUri) {
          return NextResponse.json(
            { error: 'Tradier integration is not configured' },
            { status: 503 }
          );
        }

        const authUrl = new URL('https://api.tradier.com/v1/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'read write trade market');
        authUrl.searchParams.set('state', createBrokerOAuthState(user.userId, 'tradier'));
        authUrl.searchParams.set('broker', 'tradier');

        return NextResponse.json({
          broker: 'tradier',
          authUrl: authUrl.toString(),
        });
      }

      return NextResponse.json({ error: 'Unsupported broker' }, { status: 400 });
    } catch (error: any) {
      console.error('Broker connect error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate broker connection' },
        { status: 500 }
      );
    }
  })
);
