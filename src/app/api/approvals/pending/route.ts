import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending approvals
    const pendingResult = await query(
      `SELECT * FROM trade_approvals 
       WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [session.user.id]
    );

    const pending = pendingResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      tradeData: row.trade_data,
      reasonRequired: row.reason_required,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    // Get stats
    const statsResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM trade_approvals 
       WHERE user_id = $1 
       GROUP BY status`,
      [session.user.id]
    );

    const stats = { pending: 0, approved: 0, rejected: 0, autoExecuted: 0 };
    for (const row of statsResult.rows) {
      switch (row.status) {
        case 'pending': stats.pending = parseInt(row.count); break;
        case 'approved': stats.approved = parseInt(row.count); break;
        case 'rejected': stats.rejected = parseInt(row.count); break;
        case 'auto_executed': stats.autoExecuted = parseInt(row.count); break;
      }
    }

    return NextResponse.json({ pending, stats });

  } catch (error: any) {
    console.error('[API] Error fetching pending approvals:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
