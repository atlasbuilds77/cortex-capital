/**
 * TRADE APPROVAL QUEUE
 * Queues trades for approval based on tier rules
 */

import { Pool } from 'pg';
import type { TradeDecision } from '../decision-parser';
import { TIER_PERMISSIONS } from '../tier-permissions';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface QueuedTrade {
  id: string;
  userId: string;
  tier: string;
  decision: TradeDecision;
  status: ApprovalStatus;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  executionResult?: any;
  queuedAt: string;
}

/**
 * Queue a trade for approval/execution
 */
export async function queueTradeForApproval(
  userId: string,
  tier: 'free' | 'recovery' | 'scout' | 'operator' | 'partner',
  decision: TradeDecision,
  db: Pool
): Promise<QueuedTrade> {
  const permissions = TIER_PERMISSIONS[tier];
  const now = new Date().toISOString();

  // Determine if manual approval is required
  let approvalRequired = false;
  let autoApproved = false;

  if (tier === 'free' || tier === 'recovery') {
    // These tiers cannot execute at all
    const queued: QueuedTrade = {
      id: `${userId}-${decision.id}`,
      userId,
      tier,
      decision,
      status: 'rejected',
      approvalRequired: false,
      rejectionReason: `${tier} tier cannot execute trades`,
      queuedAt: now,
    };

    await db.query(
      `INSERT INTO trade_queue 
       (id, user_id, tier, decision_data, status, approval_required, rejection_reason, queued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        queued.id,
        queued.userId,
        queued.tier,
        JSON.stringify(queued.decision),
        queued.status,
        false,
        queued.rejectionReason,
        queued.queuedAt,
      ]
    );

    return queued;
  }

  if (tier === 'scout') {
    // Scout: auto-rebalancing only, all trades auto-approved if within limits
    approvalRequired = false;
    autoApproved = true;
  }

  if (tier === 'operator') {
    // Operator: manual approval for options, auto for stocks/ETFs
    if (decision.instrumentType === 'option') {
      approvalRequired = true;
    } else {
      approvalRequired = false;
      autoApproved = true;
    }
  }

  if (tier === 'partner') {
    // Partner: everything auto-approved if within risk limits
    approvalRequired = false;
    autoApproved = true;
  }

  const queued: QueuedTrade = {
    id: `${userId}-${decision.id}`,
    userId,
    tier,
    decision,
    status: autoApproved ? 'approved' : 'pending',
    approvalRequired,
    approvedAt: autoApproved ? now : undefined,
    approvedBy: autoApproved ? 'system' : undefined,
    queuedAt: now,
  };

  await db.query(
    `INSERT INTO trade_queue 
     (id, user_id, tier, decision_data, status, approval_required, approved_by, approved_at, queued_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      queued.id,
      queued.userId,
      queued.tier,
      JSON.stringify(queued.decision),
      queued.status,
      queued.approvalRequired,
      queued.approvedBy || null,
      queued.approvedAt || null,
      queued.queuedAt,
    ]
  );

  return queued;
}

/**
 * Approve a pending trade
 */
export async function approveTrade(
  tradeId: string,
  approvedBy: string,
  db: Pool
): Promise<void> {
  const now = new Date().toISOString();

  await db.query(
    `UPDATE trade_queue 
     SET status = $1, approved_by = $2, approved_at = $3
     WHERE id = $4 AND status = 'pending'`,
    ['approved', approvedBy, now, tradeId]
  );
}

/**
 * Reject a pending trade
 */
export async function rejectTrade(
  tradeId: string,
  reason: string,
  db: Pool
): Promise<void> {
  await db.query(
    `UPDATE trade_queue 
     SET status = $1, rejection_reason = $2
     WHERE id = $3 AND status = 'pending'`,
    ['rejected', reason, tradeId]
  );
}

/**
 * Get pending trades for a user
 */
export async function getPendingTrades(userId: string, db: Pool): Promise<QueuedTrade[]> {
  const result = await db.query(
    `SELECT * FROM trade_queue 
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY queued_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    tier: row.tier,
    decision: JSON.parse(row.decision_data),
    status: row.status,
    approvalRequired: row.approval_required,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    executionResult: row.execution_result ? JSON.parse(row.execution_result) : null,
    queuedAt: row.queued_at,
  }));
}
