import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { approvalId, action } = body;

    if (!approvalId || !action) {
      return NextResponse.json({ error: 'Missing approvalId or action' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    // Get the approval
    const approvalResult = await query(
      `SELECT * FROM trade_approvals WHERE id = $1 AND user_id = $2`,
      [approvalId, session.user.id]
    );

    if (approvalResult.rows.length === 0) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const approval = approvalResult.rows[0];

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: `Approval already ${approval.status}` }, { status: 400 });
    }

    if (new Date() > new Date(approval.expires_at)) {
      return NextResponse.json({ error: 'Approval has expired' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the approval
    await query(
      `UPDATE trade_approvals 
       SET status = $1, responded_at = NOW(), response_method = 'dashboard'
       WHERE id = $2`,
      [newStatus, approvalId]
    );

    // If approved, execute the trade
    if (action === 'approve') {
      // Import and execute
      const { executeTradeForUser } = await import('@/lib/agents/trade-executor');
      await executeTradeForUser(session.user.id, approval.trade_data);
    }

    const updatedApproval = {
      id: approval.id,
      userId: approval.user_id,
      tradeData: approval.trade_data,
      reasonRequired: approval.reason_required,
      status: newStatus,
      createdAt: approval.created_at,
      expiresAt: approval.expires_at,
      respondedAt: new Date().toISOString(),
      responseMethod: 'dashboard',
    };

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Trade approved and executed' : 'Trade rejected',
      approval: updatedApproval,
    });

  } catch (error: any) {
    console.error('[API] Error responding to approval:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
