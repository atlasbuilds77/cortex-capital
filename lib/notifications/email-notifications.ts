/**
 * EMAIL NOTIFICATION SYSTEM
 * 
 * Sends trade alerts, daily digests, and account notifications via Resend.
 * 
 * Design: Black background, green terminal text (monospace)
 * No emojis - clean professional look
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Jg7Dp4iV_38FvagfWzy2WLY1AiAuAkZcG';
const FROM_EMAIL = 'Cortex Capital <alerts@cortexcapitalgroup.com>';

const resend = new Resend(RESEND_API_KEY);

// Color palette
const COLORS = {
  bg: '#0a0a0a',
  cardBg: '#0d0d0d',
  border: '#1a3d2a',
  green: '#00ff88',
  greenMuted: '#4a9d6a',
  red: '#ff4444',
  text: '#ccc',
  textMuted: '#666',
};

// Base email wrapper
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; background-color: ${COLORS.bg}; color: ${COLORS.green};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg}; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; border: 1px solid ${COLORS.border}; border-radius: 8px; background-color: ${COLORS.cardBg};">
          <tr>
            <td style="padding: 32px; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; color: ${COLORS.green};">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Notification preferences per tier
const TIER_NOTIFICATIONS = {
  free: ['account_alerts'],
  recovery: ['account_alerts', 'daily_digest'],
  scout: ['account_alerts', 'daily_digest', 'trade_signals'],
  operator: ['account_alerts', 'daily_digest', 'trade_signals', 'trade_executed', 'stop_loss', 'weekly_report'],
  partner: ['account_alerts', 'daily_digest', 'trade_signals', 'trade_executed', 'stop_loss', 'weekly_report'],
};

interface TradeNotification {
  type: 'executed' | 'signal' | 'stop_loss';
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  reason?: string;
  pnl?: number;
  pnlPercent?: number;
}

interface DigestData {
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  topMovers: { symbol: string; change: number }[];
  tradesExecuted: number;
  upcomingEvents?: string[];
}

/**
 * Send trade execution notification
 */
export async function sendTradeNotification(
  email: string,
  userName: string,
  trade: TradeNotification
): Promise<boolean> {
  try {
    const subject = trade.type === 'stop_loss' 
      ? `Stop Loss Triggered: ${trade.symbol}`
      : trade.type === 'signal'
      ? `Trade Signal: ${trade.action.toUpperCase()} ${trade.symbol}`
      : `Trade Executed: ${trade.action.toUpperCase()} ${trade.symbol}`;

    const actionColor = trade.action === 'buy' ? COLORS.green : COLORS.red;
    const typeLabel = trade.type === 'stop_loss' ? 'STOP LOSS' : trade.type === 'signal' ? 'SIGNAL' : 'EXECUTED';

    const content = `
      <div style="border-bottom: 1px solid ${COLORS.border}; padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 500; color: ${COLORS.green};">CORTEX CAPITAL</h1>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: ${COLORS.greenMuted};">TRADE ${typeLabel}</p>
      </div>

      <p style="color: ${COLORS.text}; font-size: 14px; margin-bottom: 24px;">
        ${trade.type === 'stop_loss' ? 'Stop loss triggered on position:' : trade.type === 'signal' ? 'Trade opportunity identified:' : 'Trade executed on your behalf:'}
      </p>

      <div style="background: #111; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 600; color: ${COLORS.green};">${trade.symbol}</span>
          <span style="padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #000; background: ${actionColor};">${trade.action.toUpperCase()}</span>
        </div>
        
        <div style="border-top: 1px solid ${COLORS.border}; padding-top: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: ${COLORS.greenMuted};">Quantity</span>
            <span style="color: ${COLORS.text};">${trade.quantity} shares</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: ${COLORS.greenMuted};">Price</span>
            <span style="color: ${COLORS.text};">$${trade.price.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: ${COLORS.greenMuted};">Total</span>
            <span style="color: ${COLORS.green};">$${(trade.quantity * trade.price).toLocaleString()}</span>
          </div>
        </div>

        ${trade.pnl !== undefined ? `
        <div style="border-top: 1px solid ${COLORS.border}; padding-top: 16px; margin-top: 8px; text-align: center;">
          <span style="font-size: 20px; font-weight: 600; color: ${trade.pnl >= 0 ? COLORS.green : COLORS.red};">
            ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)} (${trade.pnlPercent?.toFixed(1)}%)
          </span>
        </div>
        ` : ''}
      </div>

      ${trade.reason ? `
      <div style="background: #111; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: ${COLORS.greenMuted}; margin-bottom: 8px;">REASON</p>
        <p style="margin: 0; font-size: 13px; color: ${COLORS.text};">${trade.reason}</p>
      </div>
      ` : ''}

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
        <a href="https://cortexcapitalgroup.com/dashboard" style="display: inline-block; padding: 12px 24px; background: ${COLORS.green}; color: #000; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px;">VIEW DASHBOARD</a>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${COLORS.textMuted};">
          <a href="https://cortexcapitalgroup.com/settings" style="color: ${COLORS.greenMuted};">Manage preferences</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: emailWrapper(content),
    });

    console.log(`[EMAIL] Sent ${trade.type} notification to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send trade notification:', error);
    return false;
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(
  email: string,
  userName: string,
  data: DigestData
): Promise<boolean> {
  try {
    const changeColor = data.dayChange >= 0 ? COLORS.green : COLORS.red;
    const changeSign = data.dayChange >= 0 ? '+' : '';
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    const content = `
      <div style="border-bottom: 1px solid ${COLORS.border}; padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 500; color: ${COLORS.green};">CORTEX CAPITAL</h1>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: ${COLORS.greenMuted};">DAILY DIGEST // ${today}</p>
      </div>

      <div style="margin-bottom: 32px;">
        <p style="color: ${COLORS.greenMuted}; font-size: 12px; margin: 0 0 8px 0;">PORTFOLIO VALUE</p>
        <div style="font-size: 32px; font-weight: 600; color: ${COLORS.green}; margin-bottom: 8px;">$${data.portfolioValue.toLocaleString()}</div>
        <div style="font-size: 14px; color: ${changeColor};">${changeSign}$${Math.abs(data.dayChange).toLocaleString()} (${changeSign}${data.dayChangePercent.toFixed(2)}%) TODAY</div>
      </div>

      ${data.topMovers.length > 0 ? `
      <div style="background: #111; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 20px; margin-bottom: 24px;">
        <p style="font-size: 11px; color: ${COLORS.greenMuted}; margin: 0 0 16px 0; letter-spacing: 1px;">TOP MOVERS</p>
        ${data.topMovers.map(m => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
            <span style="color: ${COLORS.text};">${m.symbol}</span>
            <span style="color: ${m.change >= 0 ? COLORS.green : COLORS.red};">${m.change >= 0 ? '+' : ''}${m.change.toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div style="background: #111; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 20px; margin-bottom: 24px;">
        <p style="font-size: 11px; color: ${COLORS.greenMuted}; margin: 0 0 16px 0; letter-spacing: 1px;">AGENT ACTIVITY</p>
        <p style="margin: 0 0 8px 0; color: ${COLORS.text}; font-size: 13px;">${data.tradesExecuted} trades executed</p>
        <p style="margin: 0; color: ${COLORS.text}; font-size: 13px;">Portfolio health: OPTIMAL</p>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
        <a href="https://cortexcapitalgroup.com/dashboard" style="display: inline-block; padding: 12px 24px; background: ${COLORS.green}; color: #000; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px;">VIEW DASHBOARD</a>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${COLORS.textMuted};">
          Sent at market close
          <br>
          <a href="https://cortexcapitalgroup.com/settings" style="color: ${COLORS.greenMuted};">Manage preferences</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Daily Summary: ${changeSign}$${Math.abs(data.dayChange).toLocaleString()} (${changeSign}${data.dayChangePercent.toFixed(2)}%)`,
      html: emailWrapper(content),
    });

    console.log(`[EMAIL] Sent daily digest to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send daily digest:', error);
    return false;
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  tier: string
): Promise<boolean> {
  try {
    const content = `
      <div style="border-bottom: 1px solid ${COLORS.border}; padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 500; color: ${COLORS.green};">CORTEX CAPITAL</h1>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: ${COLORS.greenMuted};">WELCOME</p>
      </div>

      <p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">
        Your account is now active.
      </p>

      <div style="background: #111; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 11px; color: ${COLORS.greenMuted}; margin: 0 0 8px 0; letter-spacing: 1px;">YOUR TIER</p>
        <p style="font-size: 20px; font-weight: 600; color: ${COLORS.green}; margin: 0;">${tier.toUpperCase()}</p>
      </div>

      <p style="color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">
        Next steps:<br>
        1. Connect your broker<br>
        2. Set your preferences<br>
        3. Visit the trading floor
      </p>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid ${COLORS.border}; margin-top: 24px;">
        <a href="https://cortexcapitalgroup.com/dashboard" style="display: inline-block; padding: 12px 24px; background: ${COLORS.green}; color: #000; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px;">GET STARTED</a>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to Cortex Capital`,
      html: emailWrapper(content),
    });

    console.log(`[EMAIL] Sent welcome email to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Check if user should receive notification type based on tier
 */
export function canReceiveNotification(tier: string, notificationType: string): boolean {
  const allowed = TIER_NOTIFICATIONS[tier as keyof typeof TIER_NOTIFICATIONS] || TIER_NOTIFICATIONS.free;
  return allowed.includes(notificationType);
}

export { TIER_NOTIFICATIONS };
