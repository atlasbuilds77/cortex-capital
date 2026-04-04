export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

/**
 * GET /api/helios/stats
 * Get Helios performance statistics
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check if user has Helios role
    const userResult = await query(
      'SELECT has_helios_role FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userResult.rows[0]?.has_helios_role) {
      return NextResponse.json(
        { error: 'Access denied. Helios role required.', code: 'HELIOS_ROLE_REQUIRED' },
        { status: 403 }
      );
    }

    // Get user's executions with PnL
    const execResult = await query(
      `SELECT 
        e.status,
        e.pnl,
        e.created_at,
        s.ticker
      FROM helios_executions e
      JOIN helios_signals s ON e.signal_id = s.signal_id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC`,
      [user.userId]
    );

    const executions = execResult.rows;
    const totalSignals = executions.length;
    
    // Calculate stats
    const completedTrades = executions.filter(e => e.pnl !== null);
    const wins = completedTrades.filter(e => e.pnl > 0);
    const losses = completedTrades.filter(e => e.pnl <= 0);
    
    const winRate = completedTrades.length > 0 
      ? (wins.length / completedTrades.length) * 100 
      : 0;
    
    const totalPnl = completedTrades.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const avgReturn = completedTrades.length > 0 
      ? totalPnl / completedTrades.length 
      : 0;

    // Today's signals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const signalsToday = executions.filter(e => new Date(e.created_at) >= today).length;

    // Calculate streak
    let streak = 0;
    let streakType: 'win' | 'loss' = 'win';
    for (const trade of completedTrades) {
      if (streak === 0) {
        streakType = trade.pnl > 0 ? 'win' : 'loss';
        streak = 1;
      } else if ((trade.pnl > 0 && streakType === 'win') || (trade.pnl <= 0 && streakType === 'loss')) {
        streak++;
      } else {
        break;
      }
    }

    // Best/worst trade
    const pnls = completedTrades.map(e => e.pnl || 0);
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

    return NextResponse.json({
      total_signals: totalSignals,
      win_rate: winRate,
      total_pnl: totalPnl,
      avg_return: avgReturn,
      signals_today: signalsToday,
      streak,
      streak_type: streakType,
      best_trade: bestTrade,
      worst_trade: worstTrade,
    });

  } catch (error: any) {
    console.error('[Helios Stats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
});
