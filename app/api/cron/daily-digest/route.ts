export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendDailyDigest, canReceiveNotification } from '@/lib/notifications/email-notifications';
import { listAccounts, getPositions, getBalances } from '@/lib/integrations/snaptrade';
import { getAccountInfo } from '@/lib/brokers/robinhood';

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

    const skippedReasons: Record<string, number> = {
      tier_not_allowed: 0,
      digest_disabled: 0,
      no_portfolio: 0,
      send_failed: 0,
    };

    for (const user of users.rows) {
      const settings = user.notification_settings || {};
      
      // Check if user can receive daily digest based on tier
      if (!canReceiveNotification(user.tier || 'free', 'daily_digest')) {
        skipped++;
        skippedReasons.tier_not_allowed++;
        continue;
      }
      
      // Check if user has daily digest enabled (default true)
      if (settings.email_daily_digest === false) {
        skipped++;
        skippedReasons.digest_disabled++;
        continue;
      }

      // Get user's portfolio data
      const portfolioData = await getUserPortfolioSummary(user.id);
      
      if (!portfolioData) {
        skipped++;
        skippedReasons.no_portfolio++;
        continue;
      }

      // Get notification email (custom or account email)
      const toEmail = settings.notification_email || user.email;

      // Send digest
      console.log(`[Daily Digest] Sending to ${user.email} (${user.tier})`);
      const success = await sendDailyDigest(toEmail, user.name || 'Investor', portfolioData);
      
      if (success) {
        sent++;
      } else {
        skipped++;
        skippedReasons.send_failed++;
      }
    }
    
    console.log('[Daily Digest] Skip reasons:', skippedReasons);

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      skippedReasons,
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
    // Get user's SnapTrade credentials
    const userResult = await query(
      `SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    const snapUserId = userResult.rows[0]?.snaptrade_user_id;
    const snapUserSecret = userResult.rows[0]?.snaptrade_user_secret;
    const selectedAccount = userResult.rows[0]?.selected_snaptrade_account;

    // Get today's trades count
    const trades = await query(`
      SELECT COUNT(*) as count
      FROM trade_logs
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [userId]);
    
    const tradesExecuted = parseInt(trades.rows[0]?.count || '0');

    // If user has SnapTrade connected, get real portfolio data
    if (snapUserId && snapUserSecret) {
      try {
        const accounts = await listAccounts(snapUserId, snapUserSecret);
        const accountId = selectedAccount || accounts[0]?.id;
        
        if (accountId) {
          // Get positions and balances
          const [positions, balances] = await Promise.all([
            getPositions(snapUserId, snapUserSecret, accountId),
            getBalances(snapUserId, snapUserSecret, accountId),
          ]);

          // Calculate cash from balances (SnapTrade returns { cash: number, buying_power: number })
          const cashBalance = balances?.find((b: any) => b.currency?.code === 'USD');
          const cashValue = cashBalance?.cash || 0;
          
          // Calculate top movers from positions
          const topMovers = (positions as any[])
            .filter((p: any) => p.symbol && p.price?.change_percent !== undefined)
            .map((p: any) => ({
              symbol: p.symbol?.symbol || p.symbol,
              change: p.price?.change_percent || 0,
            }))
            .sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, 5);

          // Calculate day change from positions
          let dayChange = 0;
          let positionsValue = 0;
          for (const p of positions as any[]) {
            const qty = p.units || 0;
            const price = p.price?.last_trade_price || p.average_purchase_price || 0;
            const change = p.price?.change_percent || 0;
            const posValue = qty * price;
            positionsValue += posValue;
            dayChange += posValue * (change / 100);
          }

          const totalValue = cashValue + positionsValue;
          const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

          return {
            portfolioValue: totalValue,
            dayChange,
            dayChangePercent,
            topMovers,
            tradesExecuted,
          };
        }
      } catch (err) {
        console.error('[Daily Digest] SnapTrade fetch failed for user:', userId, err);
        // Fall through to legacy brokers
      }
    }

    // Check legacy broker connections (Robinhood, etc.)
    const brokerResult = await query(
      `SELECT broker_type, is_active FROM broker_credentials WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    
    if (brokerResult.rows.length > 0) {
      const broker = brokerResult.rows[0].broker_type;
      
      if (broker === 'robinhood') {
        try {
          const accountResult = await getAccountInfo(userId);
          
          if (accountResult.success && accountResult.data) {
            const positions = accountResult.data.positions || [];
            const portfolioValue = accountResult.data.portfolioValue || 0;
            
            // Calculate day change from positions
            let dayChange = 0;
            for (const p of positions) {
              dayChange += (p.currentPrice - p.averageCost) * p.quantity;
            }
            const dayChangePercent = portfolioValue > 0 ? (dayChange / portfolioValue) * 100 : 0;
            
            // Top movers
            const topMovers = positions
              .map((p: any) => ({
                symbol: p.symbol,
                change: p.averageCost > 0 ? ((p.currentPrice - p.averageCost) / p.averageCost) * 100 : 0,
              }))
              .sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change))
              .slice(0, 5);

            return {
              portfolioValue,
              dayChange,
              dayChangePercent,
              topMovers,
              tradesExecuted,
            };
          }
        } catch (err) {
          console.error('[Daily Digest] Robinhood fetch failed for user:', userId, err);
        }
      }
      
      // Other legacy brokers can be added here (Tradier, Alpaca, etc.)
    }

    // Fallback: no broker connected
    return {
      portfolioValue: 0,
      dayChange: 0,
      dayChangePercent: 0,
      topMovers: [],
      tradesExecuted,
    };
  } catch (error) {
    console.error('Failed to get portfolio summary:', error);
    return null;
  }
}
