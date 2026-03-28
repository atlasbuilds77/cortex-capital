import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Get user
    const result = await query(
      'SELECT id, email, tier, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get broker type from broker_credentials if exists
    const brokerResult = await query(
      'SELECT broker_type FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1',
      [decoded.userId]
    );

    const user = result.rows[0];
    return NextResponse.json({
      id: user.id,
      email: user.email,
      tier: user.tier,
      brokerType: brokerResult.rows[0]?.broker_type || null,
      createdAt: user.created_at,
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
