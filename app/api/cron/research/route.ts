export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getFullResearchContext } from '@/lib/agents/data/research-engine';
import { listAccounts, getPositions } from '@/lib/integrations/snaptrade';

/**
 * RESEARCH CRON - Runs at 8 AM PST daily
 * 
 * For each user with a broker connected:
 * 1. Load their preferences and positions
 * 2. Run research (Brave news, market data, sector analysis)
 * 3. Store findings in agent_memories for auto-trade to use later
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
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

  const startTime = Date.now();
  const results: { userId: string; success: boolean; error?: string }[] = [];

  try {
    // Get all users with a connected broker (SnapTrade or legacy)
    const usersResult = await query(`
      SELECT 
        u.id, 
        u.email,
        u.snaptrade_user_id,
        u.snaptrade_user_secret,
        u.selected_snaptrade_account,
        u.sector_interests,
        u.allowed_symbols
      FROM users u
      WHERE u.snaptrade_user_id IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM broker_credentials bc
           WHERE bc.user_id = u.id
             AND bc.is_active = true
         )
         OR EXISTS (
           SELECT 1
           FROM brokerage_connections bcx
           WHERE bcx.user_id = u.id
         )
    `);

    console.log(`[Research Cron] Processing ${usersResult.rows.length} users`);

    for (const user of usersResult.rows) {
      try {
        // Get user's positions
        let positionSymbols: string[] = [];
        
        if (user.snaptrade_user_id && user.snaptrade_user_secret) {
          const accounts = await listAccounts(user.snaptrade_user_id, user.snaptrade_user_secret);
          const accountId = user.selected_snaptrade_account || accounts[0]?.id;
          
          if (accountId) {
            const positions = await getPositions(user.snaptrade_user_id, user.snaptrade_user_secret, accountId);
            positionSymbols = positions.map((p: any) => {
              if (typeof p.symbol === 'string') return p.symbol;
              return p.symbol?.symbol || p.symbol?.ticker || 'UNKNOWN';
            }).filter((s: string) => s !== 'UNKNOWN');
          }
        }

        // Parse user preferences
        const userSectors = Array.isArray(user.sector_interests)
          ? user.sector_interests
          : ['Technology', 'Healthcare'];
        const allowedSymbols = Array.isArray(user.allowed_symbols) ? user.allowed_symbols : [];

        // Run full research
        const researchContext = await getFullResearchContext(
          userSectors,
          positionSymbols,
          allowedSymbols
        );

        // Store research in agent_memories for this user
        const today = new Date().toISOString().split('T')[0];
        
        await query(`
          INSERT INTO agent_memories (user_id, agent_id, memory_type, content, metadata, importance, created_at)
          VALUES ($1, 'RESEARCH', 'daily_research', $2, $3, 8, NOW())
        `, [
          user.id,
          researchContext,
          JSON.stringify({ 
            date: today, 
            positionsAnalyzed: positionSymbols.length,
            sectorsAnalyzed: userSectors.length 
          })
        ]);

        results.push({ userId: user.id, success: true });
        console.log(`[Research Cron] ✅ ${user.email} - ${positionSymbols.length} positions analyzed`);

      } catch (error: any) {
        console.error(`[Research Cron] ❌ ${user.email}:`, error.message);
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    const duration = Date.now() - startTime;
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      totalUsers: usersResult.rows.length,
      succeeded,
      failed,
      durationMs: duration,
    });

  } catch (error: any) {
    console.error('[Research Cron] Fatal error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
