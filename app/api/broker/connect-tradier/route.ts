export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import crypto from 'crypto';

// Encryption key from env (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.BROKER_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 64);

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export const POST = requireAuth(
  requireTier('operator')(async (request: NextRequest, user, tier) => {
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
      const encryptedToken = encrypt(apiToken);

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
    } catch (error: any) {
      console.error('Tradier connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Tradier', details: error.message },
        { status: 500 }
      );
    }
  })
);
