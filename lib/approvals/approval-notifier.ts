/**
 * APPROVAL NOTIFIER
 * 
 * Sends email and dashboard notifications for trade approvals.
 */

import { Resend } from 'resend';
import { db } from '../db';
import { TradeApproval } from './types';

const resend = new Resend(process.env.RESEND_API_KEY);

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.DASHBOARD_URL || 'https://cortexcapitalgroup.com';
const FROM_EMAIL = 'trades@cortexcapital.ai';

/**
 * Get user email
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const result = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]);
  return result.rows[0]?.email || null;
}

/**
 * Format trade for display
 */
function formatTrade(approval: TradeApproval): string {
  const { tradeData } = approval;
  const action = tradeData.action.toUpperCase();
  const symbol = tradeData.symbol;
  const qty = tradeData.quantity;
  
  if (tradeData.isOption && tradeData.optionSymbol) {
    return `${action} ${qty}x ${tradeData.optionSymbol}`;
  }
  
  return `${action} ${qty} ${symbol} shares`;
}

/**
 * Get time remaining until expiry
 */
function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

/**
 * Get reason display text
 */
function getReasonText(reason: string): string {
  switch (reason) {
    case 'options_trade': return 'Options trade';
    case 'large_position': return 'Large position (>10% of portfolio)';
    case 'new_symbol': return 'First time trading this symbol';
    case 'day_trade': return 'Day trade (0DTE)';
    case 'short_position': return 'Short position';
    default: return 'Manual review required';
  }
}

/**
 * Send approval request email
 */
export async function sendApprovalEmail(userId: string, approval: TradeApproval): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) {
    console.warn(`[ApprovalNotifier] No email for user ${userId}`);
    return;
  }
  
  const { tradeData } = approval;
  const tradeDisplay = formatTrade(approval);
  const timeRemaining = getTimeRemaining(approval.expiresAt);
  const approveUrl = `${DASHBOARD_URL}/approvals/${approval.id}?action=approve`;
  const rejectUrl = `${DASHBOARD_URL}/approvals/${approval.id}?action=reject`;
  const detailsUrl = `${DASHBOARD_URL}/approvals/${approval.id}`;
  
  const subject = `🔔 Trade Pending Approval — ${tradeData.symbol}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
    .trade-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff; }
    .trade-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
    .trade-detail { color: #666; margin: 5px 0; }
    .buttons { margin: 25px 0; }
    .btn { display: inline-block; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-right: 10px; }
    .btn-approve { background: #28a745; color: white; }
    .btn-reject { background: #dc3545; color: white; }
    .timeout-notice { background: #fff3cd; border-radius: 6px; padding: 12px; margin: 20px 0; font-size: 14px; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Trade Pending Your Approval</h2>
    
    <div class="trade-box">
      <div class="trade-title">${tradeDisplay}</div>
      ${tradeData.estimatedTotal ? `<div class="trade-detail">💰 Estimated: $${tradeData.estimatedTotal.toLocaleString()}</div>` : ''}
      ${tradeData.confidence ? `<div class="trade-detail">📊 Confidence: ${tradeData.confidence}%</div>` : ''}
      ${tradeData.reason ? `<div class="trade-detail">📝 ${tradeData.reason}</div>` : ''}
      <div class="trade-detail">⚠️ Requires approval: ${getReasonText(approval.reasonRequired)}</div>
    </div>
    
    <div class="buttons">
      <a href="${approveUrl}" class="btn btn-approve">✓ Approve</a>
      <a href="${rejectUrl}" class="btn btn-reject">✗ Reject</a>
    </div>
    
    <div class="timeout-notice">
      ⏰ <strong>Auto-executes in ${timeRemaining}</strong> if no response.
      <br>
      <a href="${detailsUrl}">View details in dashboard →</a>
    </div>
    
    <div class="footer">
      You're receiving this because you have approval requirements enabled for this trade type.
      <br>
      <a href="${DASHBOARD_URL}/settings/approvals">Manage approval settings</a>
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    
    console.log(`[ApprovalNotifier] Sent approval email to ${email} for ${tradeData.symbol}`);
    
    // Log to email_history
    await db.query(
      `INSERT INTO email_history (user_id, email_type, subject, sent_at, metadata)
       VALUES ($1, 'trade_approval', $2, NOW(), $3)`,
      [userId, subject, JSON.stringify({ approvalId: approval.id, symbol: tradeData.symbol })]
    );
  } catch (error: any) {
    console.error(`[ApprovalNotifier] Failed to send email:`, error.message);
  }
}

/**
 * Send execution notification email (after trade executes)
 */
export async function sendExecutionEmail(
  userId: string, 
  approval: TradeApproval, 
  method: 'user' | 'auto'
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;
  
  const { tradeData } = approval;
  const tradeDisplay = formatTrade(approval);
  const methodText = method === 'auto' ? 'Auto-executed (no response received)' : 'Approved by you';
  
  const subject = `✅ Trade Executed — ${tradeData.symbol}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
    .trade-box { background: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745; }
    .trade-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
    .trade-detail { color: #666; margin: 5px 0; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>✅ Trade Executed</h2>
    
    <div class="trade-box">
      <div class="trade-title">${tradeDisplay}</div>
      ${tradeData.estimatedTotal ? `<div class="trade-detail">💰 Amount: $${tradeData.estimatedTotal.toLocaleString()}</div>` : ''}
      <div class="trade-detail">📋 ${methodText}</div>
    </div>
    
    <p>
      <a href="${DASHBOARD_URL}/portfolio">View your portfolio →</a>
    </p>
    
    <div class="footer">
      — Your Cortex AI Team
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    
    console.log(`[ApprovalNotifier] Sent execution email to ${email} for ${tradeData.symbol}`);
  } catch (error: any) {
    console.error(`[ApprovalNotifier] Failed to send execution email:`, error.message);
  }
}

/**
 * Send rejection notification
 */
export async function sendRejectionEmail(userId: string, approval: TradeApproval): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;
  
  const { tradeData } = approval;
  const subject = `❌ Trade Rejected — ${tradeData.symbol}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Trade Rejected</h2>
    <p>You rejected the following trade:</p>
    <p><strong>${formatTrade(approval)}</strong></p>
    <p>No action was taken. Your portfolio remains unchanged.</p>
    <p><a href="${DASHBOARD_URL}/portfolio">View portfolio →</a></p>
  </div>
</body>
</html>
  `;
  
  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
  } catch (error: any) {
    console.error(`[ApprovalNotifier] Failed to send rejection email:`, error.message);
  }
}

export default {
  sendApprovalEmail,
  sendExecutionEmail,
  sendRejectionEmail,
};
