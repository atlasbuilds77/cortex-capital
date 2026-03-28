export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { query } from '@/lib/db';
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
  requireTier('recovery')(async (request: NextRequest, user, tier) => {
    try {
      const body = await request.json();
      const { username, password, mfaCode } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }

      // Encrypt credentials
      const encryptedUsername = encrypt(username);
      const encryptedPassword = encrypt(password);

      // Store encrypted credentials in database
      await query(`
        INSERT INTO broker_credentials (
          user_id, broker, 
          encrypted_username, username_iv, username_tag,
          encrypted_password, password_iv, password_tag,
          status, updated_at
        )
        VALUES ($1, 'robinhood', $2, $3, $4, $5, $6, $7, 'pending_verification', NOW())
        ON CONFLICT (user_id, broker) 
        DO UPDATE SET 
          encrypted_username = EXCLUDED.encrypted_username,
          username_iv = EXCLUDED.username_iv,
          username_tag = EXCLUDED.username_tag,
          encrypted_password = EXCLUDED.encrypted_password,
          password_iv = EXCLUDED.password_iv,
          password_tag = EXCLUDED.password_tag,
          status = 'pending_verification',
          updated_at = NOW()
      `, [
        user.userId,
        encryptedUsername.encrypted,
        encryptedUsername.iv,
        encryptedUsername.tag,
        encryptedPassword.encrypted,
        encryptedPassword.iv,
        encryptedPassword.tag,
      ]);

      // Optionally validate credentials with Robinhood service
      const robinhoodServiceUrl = process.env.ROBINHOOD_SERVICE_URL;
      if (robinhoodServiceUrl) {
        try {
          const validateRes = await fetch(`${robinhoodServiceUrl}/api/account`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Key': process.env.ROBINHOOD_SERVICE_KEY || '',
            },
            body: JSON.stringify({ username, password }),
          });

          if (validateRes.ok) {
            // Update status to verified
            await query(`
              UPDATE broker_credentials 
              SET status = 'verified', updated_at = NOW()
              WHERE user_id = $1 AND broker = 'robinhood'
            `, [user.userId]);

            const accountData = await validateRes.json();
            
            return NextResponse.json({
              success: true,
              broker: 'robinhood',
              message: 'Robinhood connected and verified!',
              account: {
                status: 'verified',
                buyingPower: accountData.buying_power,
                portfolioValue: accountData.portfolio_value,
                positions: accountData.positions?.length || 0,
              },
            });
          } else {
            // Credentials invalid
            await query(`
              UPDATE broker_credentials 
              SET status = 'invalid', updated_at = NOW()
              WHERE user_id = $1 AND broker = 'robinhood'
            `, [user.userId]);

            return NextResponse.json({
              success: false,
              error: 'Robinhood credentials are invalid. Please check your username and password.',
            }, { status: 401 });
          }
        } catch (validateError) {
          console.error('Validation service error:', validateError);
          // Service unavailable, keep as pending
        }
      }

      // Service not available, return pending status
      return NextResponse.json({
        success: true,
        broker: 'robinhood',
        message: 'Robinhood credentials encrypted and saved. Connection will be verified on next trade.',
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

// GET - Check connection status
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const result = await query(`
      SELECT status, created_at, updated_at 
      FROM broker_credentials 
      WHERE user_id = $1 AND broker = 'robinhood'
    `, [user.userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
      });
    }

    const cred = result.rows[0];
    return NextResponse.json({
      connected: true,
      status: cred.status,
      connectedAt: cred.created_at,
      lastUpdated: cred.updated_at,
    });
  } catch (error: any) {
    console.error('Robinhood status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error.message },
      { status: 500 }
    );
  }
});
