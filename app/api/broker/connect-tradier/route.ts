export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { encryptToken } from '@/lib/broker-credentials';

export const POST = requireAuth(
  requireTier('recovery')(async (request: NextRequest, user, tier) => {
    try {
      const body = await request.json();
      const { apiToken, accountId } = body;

      if (!apiToken) {
        return NextResponse.json(
          { error: 'API token is required' },
          { status: 400 }
        );
      }

      // Validate token by making a test request to Tradier
      const validateRes = await fetch('https://api.tradier.com/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!validateRes.ok) {
        return NextResponse.json(
          { error: 'Invalid API token. Please check your Tradier API key.' },
          { status: 400 }
        );
      }

      const profile = await validateRes.json();
      const accountName = profile.profile?.account?.account_number || accountId || 'Connected';

      // Encrypt token before storage
      const encryptedToken = encryptToken(apiToken);

      // TODO: Store in database
      // await db.query(`
      //   INSERT INTO broker_credentials (user_id, broker, encrypted_token, iv, tag, account_id)
      //   VALUES ($1, 'tradier', $2, $3, $4, $5)
      //   ON CONFLICT (user_id, broker) DO UPDATE SET ...
      // `, [user.userId, encryptedToken.encrypted, encryptedToken.iv, encryptedToken.tag, accountName])

      return NextResponse.json({
        success: true,
        broker: 'tradier',
        message: 'Tradier API token verified and encrypted.',
        account: {
          status: 'connected',
          accountNumber: accountName,
        },
      });
    } catch (error) {
      console.error('Tradier connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Tradier' },
        { status: 500 }
      );
    }
  })
);
