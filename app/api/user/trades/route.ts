export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || authUser?.userId;
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trades from user_universes
    const result = await query(
      `SELECT trade_history 
       FROM user_universes 
       WHERE user_id = $1`,
      [userId]
    );

    const trades = result.rows[0]?.trade_history || [];
    
    // Sort by timestamp desc and limit
    const sortedTrades = trades
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ 
      success: true, 
      trades: sortedTrades,
      count: sortedTrades.length
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
