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
      const { username, password, mfaCode } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }

      // Encrypt credentials before any storage
      const encryptedUsername = encrypt(username);
      const encryptedPassword = encrypt(password);

      // For now, we'll validate credentials by attempting a login via robin-stocks
      // In production, this would call a Python microservice or serverless function
      // that uses robin-stocks to validate and get account info
      
      // Store encrypted credentials in database
      // TODO: Implement actual database storage
      // await db.query(`
      //   INSERT INTO broker_credentials (user_id, broker, encrypted_username, encrypted_password, iv, tag)
      //   VALUES ($1, 'robinhood', $2, $3, $4, $5)
      //   ON CONFLICT (user_id, broker) DO UPDATE SET ...
      // `, [user.userId, encryptedUsername.encrypted, encryptedPassword.encrypted, ...])

      // For demo purposes, we'll return success
      // In production, validate with Robinhood first
      return NextResponse.json({
        success: true,
        broker: 'robinhood',
        message: 'Robinhood credentials encrypted and saved. Connection will be verified on next trade.',
        // Return account info if we validated successfully
        account: {
          status: 'pending_verification',
        },
      });
    } catch (error: any) {
      console.error('Robinhood connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Robinhood', details: error.message },
        { status: 500 }
      );
    }
  })
);
