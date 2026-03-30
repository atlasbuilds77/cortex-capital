export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { getRequiredEnv } from '@/lib/env';
import { checkRateLimit, getRateLimitKey, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit';

function getJwtSecret(): string {
  return getRequiredEnv('JWT_SECRET');
}

export async function POST(request: NextRequest) {
  // Rate limiting - 5 attempts per 15 minutes
  const rateLimitKey = getRateLimitKey(request, 'login');
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.login);
  
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.resetAt);
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user (include 2FA status)
    const result = await query(
      'SELECT id, email, password_hash, tier, created_at, two_factor_enabled FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      // Generate temporary token for 2FA verification
      const tempToken = jwt.sign(
        { userId: user.id, email: user.email, pending2FA: true },
        getJwtSecret(),
        { expiresIn: '5m', algorithm: 'HS256' } // Short expiry for security
      );

      return NextResponse.json({
        requires2FA: true,
        tempToken,
      });
    }

    // Generate JWT token (no 2FA required)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '30d', algorithm: 'HS256' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR DETAILS:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
