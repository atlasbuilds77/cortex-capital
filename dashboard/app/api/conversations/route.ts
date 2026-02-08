import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    
    const conversations = await db.query(`
      SELECT 
        id, agent_id, kind, title, summary, tags, 
        trade_id, pnl, pnl_percent, created_at
      FROM ops_agent_events
      WHERE kind = 'conversation_turn'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    return NextResponse.json({
      conversations: conversations.map((c: any) => ({
        id: c.id,
        agent_id: c.agent_id,
        kind: c.kind,
        title: c.title,
        summary: c.summary,
        tags: c.tags,
        trade_id: c.trade_id,
        pnl: c.pnl ? parseFloat(c.pnl) : null,
        pnl_percent: c.pnl_percent ? parseFloat(c.pnl_percent) : null,
        created_at: c.created_at,
      })),
      count: conversations.length,
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
