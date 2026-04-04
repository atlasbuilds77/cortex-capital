import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT * FROM trade_approvals WHERE id = $1 AND user_id = $2`,
      [params.id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const approval = {
      id: row.id,
      userId: row.user_id,
      tradeData: row.trade_data,
      reasonRequired: row.reason_required,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      respondedAt: row.responded_at,
      responseMethod: row.response_method,
    };

    return NextResponse.json({ approval });
  } catch (error: any) {
    console.error('[API] Error fetching approval:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
