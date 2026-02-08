import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AGENT_META: Record<string, { name: string; role: string; color: string; avatar: string }> = {
  atlas:    { name: 'Atlas',    role: 'Coordinator',     color: '#6366f1', avatar: '/agent-avatars/agent-02.png' },
  sage:     { name: 'Sage',     role: 'Risk Manager',    color: '#10b981', avatar: '/agent-avatars/agent-05.jpg' },
  scout:    { name: 'Scout',    role: 'Executor',        color: '#f59e0b', avatar: '/agent-avatars/agent-04.jpg' },
  growth:   { name: 'Growth',   role: 'Analytics',       color: '#8b5cf6', avatar: '/agent-avatars/agent-07.jpg' },
  intel:    { name: 'Intel',    role: 'Intelligence',    color: '#ef4444', avatar: '/agent-avatars/agent-03.jpg' },
  observer: { name: 'Observer', role: 'Quality Control', color: '#94a3b8', avatar: '/agent-avatars/agent-08.png' },
  xalt:     { name: 'X-Alt',    role: 'Twitter Intel',   color: '#06b6d4', avatar: '/agent-avatars/agent-09.jpg' },
  content:  { name: 'Content',  role: 'Content Creator', color: '#f97316', avatar: '/agent-avatars/agent-01.jpg' },
  social:   { name: 'Social',   role: 'Community',       color: '#22c55e', avatar: '/agent-avatars/agent-06.jpg' },
  creative: { name: 'Creative', role: 'Design',          color: '#ec4899', avatar: '/agent-avatars/agent-10.jpg' },
};

export async function GET() {
  try {
    const db = getDb();

    // Recent activity per agent (last 24h)
    const activity = await db.query(`
      SELECT agent_id, 
             COUNT(*) as event_count,
             MAX(created_at) as last_active
      FROM ops_agent_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY agent_id
    `).catch(() => []);

    // Recent memories per agent
    const memories = await db.query(`
      SELECT agent_id, COUNT(*) as memory_count
      FROM ops_agent_memory
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY agent_id
    `).catch(() => []);

    // Latest conversation snippet per agent
    const lastMessages = await db.query(`
      SELECT DISTINCT ON (agent_id) agent_id, payload->>'message' as last_message, created_at
      FROM ops_agent_events
      WHERE kind = 'conversation_turn'
      ORDER BY agent_id, created_at DESC
    `).catch(() => []);

    // Trade stats
    const tradeStats = await db.queryOne(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE outcome_type = 'win') as wins,
        COALESCE(SUM(pnl), 0) as total_pnl
      FROM ops_trade_outcomes
      WHERE created_at > NOW() - INTERVAL '7 days'
    `).catch(() => null);

    const activityMap = Object.fromEntries(activity.map((a: any) => [a.agent_id, a]));
    const memoryMap = Object.fromEntries(memories.map((m: any) => [m.agent_id, m]));
    const messageMap = Object.fromEntries(lastMessages.map((m: any) => [m.agent_id, m]));

    const agents = Object.entries(AGENT_META).map(([id, meta]) => {
      const act = activityMap[id];
      const mem = memoryMap[id];
      const msg = messageMap[id];
      
      const eventCount = parseInt(act?.event_count || '0');
      let state: string = 'idle';
      if (act?.last_active) {
        const minutesAgo = (Date.now() - new Date(act.last_active).getTime()) / 60000;
        if (minutesAgo < 5) state = 'working';
        else if (minutesAgo < 30) state = 'idle';
        else state = 'away';
      }

      return {
        id,
        ...meta,
        state,
        eventCount,
        memoryCount: parseInt(mem?.memory_count || '0'),
        lastMessage: msg?.last_message?.substring(0, 80) || null,
        lastActive: act?.last_active || null,
      };
    });

    return NextResponse.json({
      agents,
      summary: {
        totalTrades7d: parseInt(tradeStats?.total_trades || '0'),
        winRate7d: tradeStats && tradeStats.total_trades > 0
          ? Math.round((parseFloat(tradeStats.wins) / parseFloat(tradeStats.total_trades)) * 100)
          : 0,
        totalPnl7d: parseFloat(tradeStats?.total_pnl || '0'),
      },
    });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
