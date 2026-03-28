export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptToken } from '@/lib/broker-credentials';
import { verifyBrokerOAuthState } from '@/lib/broker-oauth-state';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const brokerParam = searchParams.get('broker');

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    const statePayload = verifyBrokerOAuthState(state);
    const broker = brokerParam || statePayload.broker;
    if (broker !== statePayload.broker) {
      return NextResponse.json(
        { error: 'Broker mismatch in callback state' },
        { status: 400 }
      );
    }

    const userId = statePayload.userId;

    // Exchange code for token based on broker
    if (broker === 'alpaca') {
      const clientId = process.env.ALPACA_CLIENT_ID;
      const clientSecret = process.env.ALPACA_CLIENT_SECRET;
      const redirectUri = process.env.ALPACA_REDIRECT_URI;
      if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json(
          { error: 'Alpaca integration is not configured' },
          { status: 503 }
        );
      }

      const tokenResponse = await fetch('https://api.alpaca.markets/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Alpaca token exchange failed:', errorData);
        return NextResponse.json(
          { error: 'Failed to exchange authorization code' },
          { status: 500 }
        );
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token } = tokenData;

      // Fetch account info
      const accountResponse = await fetch('https://api.alpaca.markets/v2/account', {
        headers: {
          'APCA-API-KEY-ID': clientId,
          'APCA-API-SECRET-KEY': access_token,
        },
      });

      const accountData = accountResponse.ok ? await accountResponse.json() : {};
      const accountId = accountData.account_number || null;

      // Encrypt tokens
      const encryptedAccess = encryptToken(access_token);
      const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : null;

      // Store in database (format: "encrypted:authTag" in one field, IV separate)
      await query(
        `INSERT INTO broker_credentials 
          (user_id, broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (user_id, broker_type) 
        DO UPDATE SET 
          encrypted_api_key = $3,
          encrypted_api_secret = $4,
          encryption_iv = $5,
          account_id = $6,
          is_active = true,
          updated_at = NOW()`,
        [
          userId,
          'alpaca',
          `${encryptedAccess.encrypted}:${encryptedAccess.authTag}`,
          encryptedRefresh ? `${encryptedRefresh.encrypted}:${encryptedRefresh.authTag}` : null,
          encryptedAccess.iv,
          accountId,
        ]
      );

      // Redirect to dashboard with success message
      return NextResponse.redirect(new URL('/dashboard?broker=connected', request.url));
    }

    if (broker === 'tradier') {
      const clientId = process.env.TRADIER_CLIENT_ID;
      const clientSecret = process.env.TRADIER_CLIENT_SECRET;
      const redirectUri = process.env.TRADIER_REDIRECT_URI;
      if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json(
          { error: 'Tradier integration is not configured' },
          { status: 503 }
        );
      }

      const tokenResponse = await fetch('https://api.tradier.com/v1/oauth/accesstoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Tradier token exchange failed:', errorData);
        return NextResponse.json(
          { error: 'Failed to exchange authorization code' },
          { status: 500 }
        );
      }

      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;

      // Fetch account info
      const profileResponse = await fetch('https://api.tradier.com/v1/user/profile', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
        },
      });

      const profileData = profileResponse.ok ? await profileResponse.json() : {};
      const accountId = profileData.profile?.account?.account_number || null;

      // Encrypt token
      const encryptedAccess = encryptToken(access_token);

      // Store in database (format: "encrypted:authTag")
      await query(
        `INSERT INTO broker_credentials 
          (user_id, broker_type, encrypted_api_key, encryption_iv, account_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        ON CONFLICT (user_id, broker_type) 
        DO UPDATE SET 
          encrypted_api_key = $3,
          encryption_iv = $4,
          account_id = $5,
          is_active = true,
          updated_at = NOW()`,
        [userId, 'tradier', `${encryptedAccess.encrypted}:${encryptedAccess.authTag}`, encryptedAccess.iv, accountId]
      );

      return NextResponse.redirect(new URL('/dashboard?broker=connected', request.url));
    }

    return NextResponse.json({ error: 'Unsupported broker' }, { status: 400 });
  } catch (error) {
    console.error('Broker callback error:', error);
    return NextResponse.json(
      { error: 'Failed to complete broker connection' },
      { status: 500 }
    );
  }
}
