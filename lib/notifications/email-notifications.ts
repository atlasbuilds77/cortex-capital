/**
 * EMAIL NOTIFICATION SYSTEM
 * 
 * Sends trade alerts, daily digests, and account notifications via Resend.
 * 
 * Notification Types:
 * - Trade executed (immediate)
 * - Stop loss hit (immediate)
 * - Daily digest (scheduled)
 * - Weekly report (scheduled)
 * - Account alerts (immediate)
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Jg7Dp4iV_38FvagfWzy2WLY1AiAuAkZcG';
const FROM_EMAIL = 'Cortex Capital <alerts@cortexcapitalgroup.com>';

const resend = new Resend(RESEND_API_KEY);

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
      ? `🛑 Stop Loss Triggered: ${trade.symbol}`
      : trade.type === 'signal'
      ? `📊 Trade Signal: ${trade.action.toUpperCase()} ${trade.symbol}`
      : `✅ Trade Executed: ${trade.action.toUpperCase()} ${trade.symbol}`;

    const actionColor = trade.action === 'buy' ? '#22c55e' : '#ef4444';
    const actionEmoji = trade.action === 'buy' ? '📈' : '📉';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #333; }
    .logo { font-size: 24px; font-weight: bold; color: #a855f7; }
    .content { padding: 30px 0; }
    .trade-card { background: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333; }
    .trade-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .symbol { font-size: 28px; font-weight: bold; }
    .action { padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; color: white; background: ${actionColor}; }
    .details { color: #888; font-size: 14px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; }
    .pnl { font-size: 20px; font-weight: bold; margin-top: 16px; text-align: center; }
    .pnl.positive { color: #22c55e; }
    .pnl.negative { color: #ef4444; }
    .reason { margin-top: 16px; padding: 12px; background: #111; border-radius: 8px; font-size: 13px; color: #aaa; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ Cortex Capital</div>
    </div>
    <div class="content">
      <p>Hey ${userName || 'there'},</p>
      <p>${trade.type === 'stop_loss' ? 'A stop loss was triggered on your position:' : trade.type === 'signal' ? 'Your agents identified a trade opportunity:' : 'A trade was executed on your behalf:'}</p>
      
      <div class="trade-card">
        <div class="trade-header">
          <span class="symbol">${actionEmoji} ${trade.symbol}</span>
          <span class="action">${trade.action.toUpperCase()}</span>
        </div>
        <div class="details">
          <div class="detail-row">
            <span>Quantity</span>
            <span>${trade.quantity} shares</span>
          </div>
          <div class="detail-row">
            <span>Price</span>
            <span>$${trade.price.toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span>Total</span>
            <span>$${(trade.quantity * trade.price).toLocaleString()}</span>
          </div>
        </div>
        ${trade.pnl !== undefined ? `
        <div class="pnl ${trade.pnl >= 0 ? 'positive' : 'negative'}">
          ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)} (${trade.pnlPercent?.toFixed(1)}%)
        </div>
        ` : ''}
        ${trade.reason ? `<div class="reason">💡 ${trade.reason}</div>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>You're receiving this because you have trade notifications enabled.</p>
      <p><a href="https://cortexcapitalgroup.com/settings/notifications" style="color: #a855f7;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
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
    const changeColor = data.dayChange >= 0 ? '#22c55e' : '#ef4444';
    const changeSign = data.dayChange >= 0 ? '+' : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #333; }
    .logo { font-size: 24px; font-weight: bold; color: #a855f7; }
    .content { padding: 30px 0; }
    .portfolio-card { background: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333; text-align: center; }
    .portfolio-value { font-size: 36px; font-weight: bold; }
    .portfolio-change { font-size: 18px; margin-top: 8px; color: ${changeColor}; }
    .section { margin-top: 24px; }
    .section-title { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .mover { display: flex; justify-content: space-between; padding: 8px 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px; }
    .mover-positive { color: #22c55e; }
    .mover-negative { color: #ef4444; }
    .stat { display: inline-block; text-align: center; padding: 16px 24px; background: #1a1a1a; border-radius: 8px; margin: 4px; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #888; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ Cortex Capital</div>
      <p style="color: #888; margin-top: 8px;">Daily Portfolio Summary</p>
    </div>
    <div class="content">
      <p>Good evening ${userName || 'there'},</p>
      <p>Here's how your portfolio performed today:</p>
      
      <div class="portfolio-card">
        <div class="portfolio-value">$${data.portfolioValue.toLocaleString()}</div>
        <div class="portfolio-change">${changeSign}$${Math.abs(data.dayChange).toLocaleString()} (${changeSign}${data.dayChangePercent.toFixed(2)}%)</div>
      </div>

      ${data.topMovers.length > 0 ? `
      <div class="section">
        <div class="section-title">Top Movers</div>
        ${data.topMovers.map(m => `
          <div class="mover">
            <span>${m.symbol}</span>
            <span class="${m.change >= 0 ? 'mover-positive' : 'mover-negative'}">${m.change >= 0 ? '+' : ''}${m.change.toFixed(2)}%</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="section" style="text-align: center;">
        <div class="stat">
          <div class="stat-value">${data.tradesExecuted}</div>
          <div class="stat-label">Trades Today</div>
        </div>
      </div>

      <p style="text-align: center; margin-top: 24px;">
        <a href="https://cortexcapitalgroup.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #a855f7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
      </p>
    </div>
    <div class="footer">
      <p>You're receiving this daily digest because you have notifications enabled.</p>
      <p><a href="https://cortexcapitalgroup.com/settings/notifications" style="color: #a855f7;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `📊 Daily Summary: ${changeSign}$${Math.abs(data.dayChange).toLocaleString()} (${changeSign}${data.dayChangePercent.toFixed(2)}%)`,
      html,
    });

    console.log(`[EMAIL] Sent daily digest to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send daily digest:', error);
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
