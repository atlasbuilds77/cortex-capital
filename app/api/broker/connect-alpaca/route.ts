import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import crypto from 'crypto';

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
      const { apiKey, apiSecret, paper } = body;

      if (!apiKey || !apiSecret) {
        return NextResponse.json(
          { error: 'API Key and Secret are required' },
          { status: 400 }
        );
      }

      // Determine endpoint based on paper/live
      const baseUrl = paper 
        ? 'https://paper-api.alpaca.markets'
        : 'https://api.alpaca.markets';

      // Validate credentials by fetching account info
      const validateRes = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
      });

      if (!validateRes.ok) {
        const errText = await validateRes.text();
        console.error('Alpaca validation failed:', errText);
        return NextResponse.json(
          { error: 'Invalid API credentials. Please check your key and secret.' },
          { status: 400 }
        );
      }

      const account = await validateRes.json();

      // Encrypt credentials before storage
      const encryptedKey = encrypt(apiKey);
      const encryptedSecret = encrypt(apiSecret);

      // TODO: Store in database
      // await db.query(`
      //   INSERT INTO broker_credentials (user_id, broker, encrypted_key, encrypted_secret, ...)
      //   VALUES ($1, 'alpaca', $2, $3, ...)
      // `, [user.userId, encryptedKey.encrypted, encryptedSecret.encrypted, ...])

      return NextResponse.json({
        success: true,
        broker: 'alpaca',
        message: 'Alpaca credentials verified and encrypted.',
        account: {
          status: 'connected',
          accountNumber: account.account_number,
          accountType: paper ? 'paper' : 'live',
          equity: account.equity,
          buyingPower: account.buying_power,
        },
      });
    } catch (error: any) {
      console.error('Alpaca connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Alpaca', details: error.message },
        { status: 500 }
      );
    }
  })
);
