export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-change-in-production';
const SALT_ROUNDS = 10;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Get tier from request body (paid via Stripe) or default to free
    const { tier: requestedTier, stripeSessionId } = await request.clone().json().catch(() => ({}));
    
    // Only allow paid tiers if stripeSessionId is provided
    const validPaidTiers = ['recovery', 'scout', 'operator', 'partner'];
    const userTier = (stripeSessionId && validPaidTiers.includes(requestedTier)) 
      ? requestedTier 
      : 'free';

    // Create user with the specified tier
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, password_hash, tier, risk_profile, is_active, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, email, tier, created_at`,
      [userId, email.toLowerCase(), passwordHash, userTier, 'moderate', true, false]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
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
  } catch (error: any) {
    console.error('SIGNUP ERROR DETAILS:', error);
    return NextResponse.json(
      { error: 'Signup failed', details: error.message },
      { status: 500 }
    );
  }
}
