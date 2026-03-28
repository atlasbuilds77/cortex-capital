import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { broker } = body;

    if (!broker || !['alpaca', 'tradier'].includes(broker)) {
      return NextResponse.json(
        { error: 'Invalid broker. Must be "alpaca" or "tradier".' },
        { status: 400 }
      );
    }

    // Delete broker credentials
    await query(
      'DELETE FROM broker_credentials WHERE user_id = $1 AND broker_type = $2',
      [user.userId, broker]
    );

    return NextResponse.json({
      success: true,
      message: `${broker} disconnected successfully`,
    });
  } catch (error: any) {
    console.error('Broker disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect broker', details: error.message },
      { status: 500 }
    );
  }
});
