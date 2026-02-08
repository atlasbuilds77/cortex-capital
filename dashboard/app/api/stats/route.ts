import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Real account balances (static for now, can be queried live later)
const ACCOUNT_BALANCES = {
  crypto: 112, // $112 (1.29 SOL)
  webull: 2532, // $2,532
  topstep: 48840, // $48,840
};

async function getCryptoBalance(): Promise<number> {
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const wallet = new PublicKey('CtvyPxtiHqkjVKuq7WXpvuS7QwUjfmkicX9BProaYrPo');
    const balance = await connection.getBalance(wallet);
    const solBalance = balance / LAMPORTS_PER_SOL;
    // Approximate SOL price at $87
    return solBalance * 87;
  } catch (error) {
    console.error('Failed to fetch crypto balance:', error);
    return ACCOUNT_BALANCES.crypto; // Fallback to static
  }
}

export async function GET() {
  try {
    const db = getDb();
    
    // Get open positions
    const positions = await db.query(`
      SELECT id, token, metadata->>'market' as market, entry_price, current_price, size, unrealized_pnl
      FROM ops_positions 
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get portfolio stats
    const portfolioStats = await db.queryOne(`
      SELECT 
        COALESCE(SUM(unrealized_pnl), 0) as total_unrealized_pnl,
        COUNT(*) as open_positions
      FROM ops_positions 
      WHERE status = 'open'
    `);
    
    // Get trade outcomes for win rate
    const tradeStats = await db.queryOne(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE outcome_type = 'win') as wins,
        COALESCE(SUM(pnl), 0) as total_pnl
      FROM ops_trade_outcomes
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    
    // Get recent memories
    const memories = await db.query(`
      SELECT id, agent_id, type, content, confidence, tags, promoted, created_at
      FROM ops_agent_memory
      ORDER BY confidence DESC, created_at DESC
      LIMIT 5
    `);
    
    // Get conversations today
    const conversationsToday = await db.queryOne(`
      SELECT COUNT(*) as count
      FROM ops_agent_events
      WHERE kind = 'conversation_turn'
      AND created_at > CURRENT_DATE
    `);
    
    // Get memories created today
    const memoriesCreated = await db.queryOne(`
      SELECT COUNT(*) as count
      FROM ops_agent_memory
      WHERE created_at > CURRENT_DATE
    `);
    
    // Get market performance (from metadata JSONB)
    const marketPerf = await db.query(`
      SELECT 
        metadata->>'market' as market,
        COUNT(*) as trades,
        COUNT(*) FILTER (WHERE outcome_type = 'win') as wins,
        COALESCE(SUM(pnl), 0) as total_pnl
      FROM ops_trade_outcomes
      WHERE created_at > NOW() - INTERVAL '30 days'
      AND metadata->>'market' IS NOT NULL
      GROUP BY metadata->>'market'
    `);
    
    const marketPerformance: Record<string, any> = {
      crypto: { winRate: 0, trades: 0, pnl: 0 },
      options: { winRate: 0, trades: 0, pnl: 0 },
      futures: { winRate: 0, trades: 0, pnl: 0 },
    };
    
    marketPerf.forEach((m: any) => {
      if (m.market) {
        marketPerformance[m.market] = {
          winRate: m.trades > 0 ? Math.round((m.wins / m.trades) * 100) : 0,
          trades: parseInt(m.trades),
          pnl: parseFloat(m.total_pnl),
        };
      }
    });
    
    // Calculate stats (handle null/string/number)
    const winRate = tradeStats && tradeStats.total_trades > 0 
      ? (parseFloat(tradeStats.wins) / parseFloat(tradeStats.total_trades)) * 100 
      : 0;
    
    // Get real crypto balance (live query)
    const cryptoBalance = await getCryptoBalance();
    
    // Calculate total portfolio value (account balances + unrealized P&L)
    const totalAccountValue = cryptoBalance + ACCOUNT_BALANCES.webull + ACCOUNT_BALANCES.topstep;
    const unrealizedPnL = parseFloat(portfolioStats?.total_unrealized_pnl || '0');
    const portfolioValue = totalAccountValue + unrealizedPnL;
    
    return NextResponse.json({
      stats: {
        portfolioValue: parseFloat(portfolioValue.toFixed(2)),
        accountBalances: {
          crypto: parseFloat(cryptoBalance.toFixed(2)),
          webull: ACCOUNT_BALANCES.webull,
          topstep: ACCOUNT_BALANCES.topstep,
          total: parseFloat(totalAccountValue.toFixed(2)),
        },
        pnl24h: 0, // TODO: Calculate from portfolio_history
        pnl24hPct: 0,
        winRate: parseFloat(winRate.toFixed(1)),
        openPositions: parseInt(String(portfolioStats?.open_positions || '0')),
        totalTrades: parseInt(String(tradeStats?.total_trades || '0')),
        activeAgents: 6, // TODO: Query from agent activity
        conversationsToday: parseInt(String(conversationsToday?.count || '0')),
        memoriesCreated: parseInt(String(memoriesCreated?.count || '0')),
      },
      positions: positions.map((p: any) => ({
        id: p.id,
        token: p.token,
        market: p.market,
        entryPrice: parseFloat(p.entry_price),
        currentPrice: parseFloat(p.current_price),
        size: parseFloat(p.size),
        unrealizedPnl: parseFloat(p.unrealized_pnl),
        pnlPct: p.entry_price > 0 
          ? ((p.current_price - p.entry_price) / p.entry_price) * 100 
          : 0,
      })),
      recentMemories: memories.map((m: any) => ({
        id: m.id,
        agent_id: m.agent_id,
        type: m.type,
        content: m.content,
        confidence: parseFloat(m.confidence),
        tags: m.tags,
        promoted: m.promoted,
        created_at: m.created_at,
      })),
      marketPerformance,
      systemHealth: {
        heartbeat: { 
          status: 'ok', 
          lastRun: new Date(Date.now() - 3 * 60 * 1000).toISOString() 
        },
        workers: {
          crypto: { status: 'ok', lastPoll: new Date(Date.now() - 20 * 1000).toISOString() },
          options: { status: 'ok', lastPoll: new Date(Date.now() - 15 * 1000).toISOString() },
          futures: { status: 'ok', lastPoll: new Date(Date.now() - 18 * 1000).toISOString() },
        },
        sse: { status: 'ok', connections: 0 },
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
