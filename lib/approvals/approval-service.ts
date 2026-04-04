/**
 * APPROVAL SERVICE
 * 
 * Core logic for creating, responding to, and expiring trade approvals.
 */

import { db } from '../db';
import { 
  TradeApproval, 
  TradeData, 
  ApprovalReason, 
  ApprovalStatus,
  ResponseMethod 
} from './types';
import { getUserApprovalSettings } from './approval-checker';
import { sendApprovalEmail, sendExecutionEmail } from './approval-notifier';

/**
 * Create a pending trade approval
 */
export async function createApproval(
  userId: string,
  trade: TradeData,
  reasons: ApprovalReason[]
): Promise<TradeApproval> {
  const settings = await getUserApprovalSettings(userId);
  const expiresAt = new Date(Date.now() + settings.autoExecuteTimeoutHours * 60 * 60 * 1000);
  
  const result = await db.query(
    `INSERT INTO trade_approvals (
      user_id, trade_data, reason_required, status, expires_at
    ) VALUES ($1, $2, $3, 'pending', $4)
    RETURNING *`,
    [userId, JSON.stringify(trade), reasons[0], expiresAt]
  );
  
  const approval: TradeApproval = {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    tradeData: result.rows[0].trade_data,
    reasonRequired: result.rows[0].reason_required,
    status: result.rows[0].status,
    createdAt: result.rows[0].created_at,
    expiresAt: result.rows[0].expires_at,
  };
  
  // Send notification email
  await sendApprovalEmail(userId, approval);
  
  console.log(`[ApprovalService] Created approval ${approval.id} for ${trade.symbol} (expires: ${expiresAt.toISOString()})`);
  
  return approval;
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId: string): Promise<TradeApproval[]> {
  const result = await db.query(
    `SELECT * FROM trade_approvals 
     WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    tradeData: row.trade_data,
    reasonRequired: row.reason_required,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    responseMethod: row.response_method,
  }));
}

/**
 * Get a single approval by ID
 */
export async function getApproval(approvalId: string): Promise<TradeApproval | null> {
  const result = await db.query(
    `SELECT * FROM trade_approvals WHERE id = $1`,
    [approvalId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
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
}

/**
 * Respond to an approval (approve or reject)
 */
export async function respondToApproval(
  approvalId: string,
  response: 'approve' | 'reject',
  method: ResponseMethod = 'dashboard'
): Promise<{ success: boolean; approval?: TradeApproval; error?: string }> {
  // Get the approval
  const approval = await getApproval(approvalId);
  
  if (!approval) {
    return { success: false, error: 'Approval not found' };
  }
  
  if (approval.status !== 'pending') {
    return { success: false, error: `Approval already ${approval.status}` };
  }
  
  if (new Date() > approval.expiresAt) {
    return { success: false, error: 'Approval has expired' };
  }
  
  const newStatus: ApprovalStatus = response === 'approve' ? 'approved' : 'rejected';
  
  // Update the approval
  await db.query(
    `UPDATE trade_approvals 
     SET status = $1, responded_at = NOW(), response_method = $2
     WHERE id = $3`,
    [newStatus, method, approvalId]
  );
  
  console.log(`[ApprovalService] Approval ${approvalId} ${newStatus} via ${method}`);
  
  // If approved, execute the trade
  if (response === 'approve') {
    await executeApprovedTrade(approval);
  }
  
  return { 
    success: true, 
    approval: { ...approval, status: newStatus, respondedAt: new Date(), responseMethod: method }
  };
}

/**
 * Execute an approved trade
 */
async function executeApprovedTrade(approval: TradeApproval): Promise<void> {
  // Import here to avoid circular dependency
  const { executeTradeForUser } = await import('../agents/trade-executor');
  
  try {
    await executeTradeForUser(approval.userId, approval.tradeData);
    console.log(`[ApprovalService] Executed approved trade ${approval.id}: ${approval.tradeData.symbol}`);
  } catch (error: any) {
    console.error(`[ApprovalService] Failed to execute approved trade ${approval.id}:`, error.message);
    
    // Log the failure
    await db.query(
      `UPDATE trade_approvals SET status = 'failed', response_method = 'error' WHERE id = $1`,
      [approval.id]
    );
  }
}

/**
 * Process expired approvals (called by cron)
 * Auto-executes or auto-rejects based on user settings
 */
export async function processExpiredApprovals(): Promise<{ processed: number; executed: number; rejected: number }> {
  // Find all expired pending approvals
  const result = await db.query(
    `SELECT * FROM trade_approvals 
     WHERE status = 'pending' AND expires_at <= NOW()`
  );
  
  let executed = 0;
  let rejected = 0;
  
  for (const row of result.rows) {
    const approval: TradeApproval = {
      id: row.id,
      userId: row.user_id,
      tradeData: row.trade_data,
      reasonRequired: row.reason_required,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
    
    // For now, default to auto-execute (hands-off approach)
    // In future, could check user preference for auto-execute vs auto-reject
    try {
      // Update status to auto_executed
      await db.query(
        `UPDATE trade_approvals 
         SET status = 'auto_executed', responded_at = NOW(), response_method = 'timeout'
         WHERE id = $1`,
        [approval.id]
      );
      
      // Execute the trade
      await executeApprovedTrade(approval);
      
      // Notify user
      await sendExecutionEmail(approval.userId, approval, 'auto');
      
      executed++;
      console.log(`[ApprovalService] Auto-executed expired approval ${approval.id}`);
    } catch (error: any) {
      console.error(`[ApprovalService] Failed to auto-execute ${approval.id}:`, error.message);
      rejected++;
    }
  }
  
  return { processed: result.rows.length, executed, rejected };
}

/**
 * Get approval stats for a user
 */
export async function getApprovalStats(userId: string): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  autoExecuted: number;
}> {
  const result = await db.query(
    `SELECT status, COUNT(*) as count 
     FROM trade_approvals 
     WHERE user_id = $1 
     GROUP BY status`,
    [userId]
  );
  
  const stats = { pending: 0, approved: 0, rejected: 0, autoExecuted: 0 };
  
  for (const row of result.rows) {
    switch (row.status) {
      case 'pending': stats.pending = parseInt(row.count); break;
      case 'approved': stats.approved = parseInt(row.count); break;
      case 'rejected': stats.rejected = parseInt(row.count); break;
      case 'auto_executed': stats.autoExecuted = parseInt(row.count); break;
    }
  }
  
  return stats;
}

export default {
  createApproval,
  getPendingApprovals,
  getApproval,
  respondToApproval,
  processExpiredApprovals,
  getApprovalStats,
};
