export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { requireTier } from '@/lib/tier-gate';
import { encryptToken } from '@/lib/broker-credentials';

export const POST = requireAuth(
  requireTier('recovery')(async (request: NextRequest, user, tier) => {
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
      const encryptedKey = encryptToken(apiKey);
      const encryptedSecret = encryptToken(apiSecret);

      // Import query function
      const { query } = await import('@/lib/db');

      // Delete any existing Alpaca connection for this user first
      await query(`DELETE FROM broker_credentials WHERE user_id = $1 AND broker_type = 'alpaca'`, [user.userId]);

      // Store in database
      await query(`
        INSERT INTO broker_credentials (user_id, broker_type, encrypted_api_key, encrypted_api_secret, encryption_iv, account_id, is_active, created_at, updated_at)
        VALUES ($1, 'alpaca', $2, $3, $4, $5, true, NOW(), NOW())
      `, [
        user.userId, 
        encryptedKey.encrypted,
        encryptedSecret.encrypted,
        encryptedKey.iv, // Using same IV for simplicity, but both keys have their own
        account.account_number
      ]);

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
    } catch (error) {
      console.error('Alpaca connect error:', error);
      return NextResponse.json(
        { error: 'Failed to connect Alpaca' },
        { status: 500 }
      );
    }
  })
);
