export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { pool } from '@/lib/db';
import { listAccounts, listConnections } from '@/lib/integrations/snaptrade';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const brokers: any[] = [];

    // Check for SnapTrade connections first
    const snapResult = await pool.query(
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );
    
    const snapUserId = snapResult.rows[0]?.snaptrade_user_id;
    const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret;

    if (snapUserId && snapUserSecret) {
      try {
        const accounts = await listAccounts(snapUserId, snapUserSecret);
        
        // Group by brokerage
        const brokerageMap = new Map<string, any>();
        for (const account of accounts as any[]) {
          const brokerageName = account.brokerage_authorization?.brokerage?.name || 'Unknown';
          const slug = account.brokerage_authorization?.brokerage?.slug || 'unknown';
          
          if (!brokerageMap.has(slug)) {
            brokerageMap.set(slug, {
              id: `snaptrade_${slug}`,
              name: brokerageName,
              icon: 'chart',
              status: 'connected' as const,
              accountType: 'live',
              lastSync: 'Just now',
              accountNumber: account.number ? `****${account.number.slice(-4)}` : undefined,
              via: 'snaptrade',
            });
          }
        }
        
        brokers.push(...brokerageMap.values());
      } catch (err) {
        console.error('SnapTrade list accounts failed:', err);
      }
    }

    // Also check legacy broker tokens
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

    for (const row of result.rows) {
      brokers.push({
        id: row.broker,
        name: row.broker === 'alpaca' ? 'Alpaca' : row.broker === 'tradier' ? 'Tradier' : row.broker,
        icon: 'chart',
        status: 'connected' as const,
        accountType: row.account_type || 'paper',
        lastSync: row.last_sync ? formatTimeAgo(new Date(row.last_sync)) : 'Never',
        accountNumber: row.account_id ? `****${row.account_id.slice(-4)}` : undefined,
        via: 'direct',
      });
    }

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
