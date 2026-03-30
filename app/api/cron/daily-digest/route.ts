export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendDailyDigest, canReceiveNotification } from '@/lib/notifications/email-notifications';

/**
 * DAILY DIGEST CRON
 * 
 * Sends end-of-day portfolio summaries to users who have it enabled.
 * Should be called via Vercel cron or external scheduler at market close (4pm ET / 1pm PT)
 * 
 * Cron: 0 21 * * 1-5 (9pm UTC = 4pm ET on weekdays)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  // Accept both: Authorization header OR ?secret= query param (for Docker cron compatibility)
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  
  const isAuthorized = cronSecret && (
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret
  );
  
  if (cronSecret && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with daily digest enabled
    const users = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.tier,
        u.notification_settings
      FROM users u
      WHERE u.tier IS NOT NULL
    `);

    let sent = 0;
    let skipped = 0;

    for (const user of users.rows) {
      const settings = user.notification_settings || {};
      
      // Check if user can receive daily digest based on tier
      if (!canReceiveNotification(user.tier || 'free', 'daily_digest')) {
        skipped++;
        continue;
      }
      
      // Check if user has daily digest enabled (default true)
      if (settings.email_daily_digest === false) {
        skipped++;
        continue;
      }

      // Get user's portfolio data
      const portfolioData = await getUserPortfolioSummary(user.id);
      
      if (!portfolioData) {
        skipped++;
        continue;
      }

      // Get notification email (custom or account email)
      const toEmail = settings.notification_email || user.email;

      // Send digest
      const success = await sendDailyDigest(toEmail, user.name || 'Investor', portfolioData);
      
      if (success) {
        sent++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      total: users.rows.length,
    });
  } catch (error: any) {
    console.error('Daily digest cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get portfolio summary for a user
 */
async function getUserPortfolioSummary(userId: string) {
  try {
    // Get today's trades
    const trades = await query(`
      SELECT COUNT(*) as count
      FROM trade_logs
      WHERE user_id = $1 AND DATE(executed_at) = CURRENT_DATE
    `, [userId]);

    // For now, return mock data since we don't have real portfolio tracking yet
    // In production, this would pull from broker APIs
    return {
      portfolioValue: 50000, // Would come from broker
      dayChange: 250,        // Would be calculated
      dayChangePercent: 0.5, // Would be calculated
      topMovers: [],         // Would come from positions
      tradesExecuted: parseInt(trades.rows[0]?.count || '0'),
    };
  } catch (error) {
    console.error('Failed to get portfolio summary:', error);
    return null;
  }
}
