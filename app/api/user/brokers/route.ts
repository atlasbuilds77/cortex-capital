import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { pool } from '@/lib/db';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Query user's connected brokers from database
    const result = await pool.query(
      `SELECT 
        broker,
        account_id,
        account_type,
        created_at,
        last_sync
      FROM user_broker_tokens 
      WHERE user_id = $1`,
      [user.userId]
    );

    const brokers = result.rows.map(row => ({
      id: row.broker,
      name: row.broker === 'alpaca' ? 'Alpaca' : row.broker === 'tradier' ? 'Tradier' : row.broker,
      icon: 'chart',
      status: 'connected' as const,
      accountType: row.account_type || 'paper',
      lastSync: row.last_sync ? formatTimeAgo(new Date(row.last_sync)) : 'Never',
      accountNumber: row.account_id ? `****${row.account_id.slice(-4)}` : undefined,
    }));

    return NextResponse.json({ brokers });
  } catch (error: any) {
    console.error('List brokers error:', error);
    return NextResponse.json(
      { error: 'Failed to list brokers', brokers: [] },
      { status: 500 }
    );
  }
});

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
