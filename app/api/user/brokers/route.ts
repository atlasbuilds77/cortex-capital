export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts } from '@/lib/integrations/snaptrade';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const brokers: any[] = [];

    // Check for SnapTrade connections first
    const snapResult = await query(
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
    const result = await query(
      `SELECT 
        broker_type,
        account_id,
        updated_at
      FROM broker_credentials 
      WHERE user_id = $1 AND is_active = true`,
      [user.userId]
    );

    for (const row of result.rows) {
      brokers.push({
        id: row.broker_type,
        name: row.broker_type === 'alpaca' ? 'Alpaca' : row.broker_type === 'tradier' ? 'Tradier' : row.broker_type,
        icon: 'chart',
        status: 'connected' as const,
        accountType: 'live',
        lastSync: row.updated_at ? formatTimeAgo(new Date(row.updated_at)) : 'Never',
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
