/**
 * TRADE NOTIFIER
 * 
 * Sends notifications when trades are executed.
 * Called by the executor after any trade.
 */

import { sendTradeNotification, canReceiveNotification } from './email-notifications';
import { query } from '../db';

interface TradeEvent {
  userId: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  reason?: string;
  pnl?: number;
  pnlPercent?: number;
  isStopLoss?: boolean;
}

/**
 * Notify user about a trade execution
 */
export async function notifyTradeExecution(trade: TradeEvent): Promise<void> {
  try {
    // Get user info
    const result = await query(
      `SELECT email, name, tier, notification_settings FROM users WHERE id = $1`,
      [trade.userId]
    );

    if (result.rows.length === 0) {
      console.log('[TradeNotifier] User not found:', trade.userId);
      return;
    }

    const user = result.rows[0];
    const settings = user.notification_settings || {};
    const tier = user.tier || 'free';

    // Check if user can receive this notification
    const notificationType = trade.isStopLoss ? 'stop_loss' : 'trade_executed';
    
    if (!canReceiveNotification(tier, notificationType)) {
      console.log(`[TradeNotifier] User tier ${tier} cannot receive ${notificationType}`);
      return;
    }

    // Check if user has this notification enabled
    const settingKey = trade.isStopLoss ? 'email_stop_loss' : 'email_trade_executed';
    if (settings[settingKey] === false) {
      console.log(`[TradeNotifier] User has ${settingKey} disabled`);
      return;
    }

    // Send the notification
    await sendTradeNotification(user.email, user.name || 'Investor', {
      type: trade.isStopLoss ? 'stop_loss' : 'executed',
      symbol: trade.symbol,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      reason: trade.reason,
      pnl: trade.pnl,
      pnlPercent: trade.pnlPercent,
    });

    console.log(`[TradeNotifier] Sent ${notificationType} notification to ${user.email}`);
  } catch (error) {
    console.error('[TradeNotifier] Failed to send notification:', error);
  }
}

/**
 * Notify user about a trade signal (not executed yet)
 */
export async function notifyTradeSignal(
  userId: string,
  symbol: string,
  action: 'buy' | 'sell',
  reason: string
): Promise<void> {
  try {
    const result = await query(
      `SELECT email, name, tier, notification_settings FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return;

    const user = result.rows[0];
    const settings = user.notification_settings || {};
    
    if (!canReceiveNotification(user.tier, 'trade_signals')) return;
    if (settings.email_trade_signals === false) return;

    await sendTradeNotification(user.email, user.name || 'Investor', {
      type: 'signal',
      symbol,
      action,
      quantity: 0,
      price: 0,
      reason,
    });
  } catch (error) {
    console.error('[TradeNotifier] Failed to send signal notification:', error);
  }
}

export default {
  notifyTradeExecution,
  notifyTradeSignal,
};
