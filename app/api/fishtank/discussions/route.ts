export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '10';
    
    const result = await query(
      `SELECT 
        id,
        discussion_type as type,
        started_at as timestamp
      FROM agent_discussions
      ORDER BY started_at DESC
      LIMIT $1`,
      [parseInt(limit)]
    );

    const discussions = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
    }));

    return NextResponse.json(discussions);
  } catch (error) {
    console.error('Discussions fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
      { status: 500 }
    );
  }
}
