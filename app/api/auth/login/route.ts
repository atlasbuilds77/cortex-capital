import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, tier, created_at FROM users WHERE email = $1',
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
    console.error('LOGIN ERROR DETAILS:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    );
  }
}
