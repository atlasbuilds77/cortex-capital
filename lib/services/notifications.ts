/**
 * Notification Service
 * Sends email notifications to users based on their preferences
 */

import { Resend } from 'resend';
import { query } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Cortex Capital <notifications@cortexcapitalgroup.com>';

type NotificationType = 
  | 'trade_executed'
  | 'stop_loss'
  | 'trade_signals'
  | 'daily_digest'
  | 'weekly_report'
  | 'account_alerts';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get user's notification email (custom or account email)
 */
async function getUserNotificationEmail(userId: string): Promise<string | null> {
  const result = await query(
    'SELECT email, notification_settings FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) return null;
  
  const { email, notification_settings } = result.rows[0];
  const settings = notification_settings || {};
  
  // Use custom notification email if set, otherwise account email
  return settings.notification_email || email;
}

/**
 * Check if user has enabled this notification type
 */
async function isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
  const result = await query(
    'SELECT notification_settings FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) return false;
  
  const settings = result.rows[0].notification_settings || {};
  const settingKey = `email_${type}`;
  
  // Default to true if not explicitly set
  return settings[settingKey] !== false;
}

/**
 * Send a notification email to a user
 */
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this notification type is enabled
    const enabled = await isNotificationEnabled(payload.userId, payload.type);
    if (!enabled) {
      return { success: true }; // Silently skip disabled notifications
    }
    
    // Get user's notification email
    const toEmail = await getUserNotificationEmail(payload.userId);
    if (!toEmail) {
      return { success: false, error: 'No email found for user' };
    }
    
    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Notification sent: ${payload.type} to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('Notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send trade executed notification
 */
export async function notifyTradeExecuted(userId: string, trade: {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
}) {
  const actionText = trade.action === 'buy' ? 'Bought' : 'Sold';
  
  return sendNotification({
    userId,
    type: 'trade_executed',
    subject: `Trade Executed: ${actionText} ${trade.quantity} ${trade.symbol}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Trade Executed ✓</h2>
        <div style="background: #1F2937; padding: 20px; border-radius: 8px; color: #fff;">
          <p><strong>Action:</strong> ${actionText}</p>
          <p><strong>Symbol:</strong> ${trade.symbol}</p>
          <p><strong>Quantity:</strong> ${trade.quantity}</p>
          <p><strong>Price:</strong> $${trade.price.toFixed(2)}</p>
          <p><strong>Total:</strong> $${trade.total.toFixed(2)}</p>
        </div>
        <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
          This trade was executed by Cortex Capital on your behalf.
        </p>
      </div>
    `,
  });
}

/**
 * Send stop loss triggered notification
 */
export async function notifyStopLoss(userId: string, data: {
  symbol: string;
  triggerPrice: number;
  lossAmount: number;
}) {
  return sendNotification({
    userId,
    type: 'stop_loss',
    subject: `⚠️ Stop Loss Triggered: ${data.symbol}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Stop Loss Triggered ⚠️</h2>
        <div style="background: #1F2937; padding: 20px; border-radius: 8px; color: #fff;">
          <p><strong>Symbol:</strong> ${data.symbol}</p>
          <p><strong>Trigger Price:</strong> $${data.triggerPrice.toFixed(2)}</p>
          <p><strong>Loss:</strong> -$${Math.abs(data.lossAmount).toFixed(2)}</p>
        </div>
        <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
          Your position was automatically closed to protect against further losses.
        </p>
      </div>
    `,
  });
}

/**
 * Send trade signal notification
 */
export async function notifyTradeSignal(userId: string, signal: {
  symbol: string;
  action: 'buy' | 'sell';
  confidence: number;
  reasoning: string;
}) {
  return sendNotification({
    userId,
    type: 'trade_signals',
    subject: `📊 Trade Signal: ${signal.action.toUpperCase()} ${signal.symbol}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">New Trade Signal 📊</h2>
        <div style="background: #1F2937; padding: 20px; border-radius: 8px; color: #fff;">
          <p><strong>Symbol:</strong> ${signal.symbol}</p>
          <p><strong>Action:</strong> ${signal.action.toUpperCase()}</p>
          <p><strong>Confidence:</strong> ${(signal.confidence * 100).toFixed(0)}%</p>
          <p><strong>Analysis:</strong> ${signal.reasoning}</p>
        </div>
        <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
          This signal was generated by Cortex AI agents. Review before acting.
        </p>
      </div>
    `,
  });
}
