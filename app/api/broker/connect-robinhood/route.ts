export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { query } from '@/lib/db';
import { encryptToken } from '@/lib/broker-credentials';

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
      const encryptedUsername = encryptToken(username);
      const encryptedPassword = encryptToken(password);

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
        encryptedUsername.authTag,
        encryptedPassword.encrypted,
        encryptedPassword.iv,
        encryptedPassword.authTag,
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
    } catch (error) {
      console.error('Robinhood connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Robinhood' },
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
  } catch (error) {
    console.error('Robinhood status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
});
