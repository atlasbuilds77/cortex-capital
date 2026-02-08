import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    
    const proposals = await db.query(`
      SELECT 
        id, title, agent_id, status, signal_type, 
        proposed_steps, entry_price, target_price, stop_loss,
        created_at, updated_at
      FROM ops_trading_proposals
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    return NextResponse.json({
      proposals: proposals.map((p: any) => ({
        id: p.id,
        title: p.title,
        agent_id: p.agent_id,
        status: p.status,
        signal_type: p.signal_type,
        proposed_steps: p.proposed_steps,
        entry_price: p.entry_price ? parseFloat(p.entry_price) : null,
        target_price: p.target_price ? parseFloat(p.target_price) : null,
        stop_loss: p.stop_loss ? parseFloat(p.stop_loss) : null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      count: proposals.length,
    });
  } catch (error) {
    console.error('Proposals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    
    const result = await db.queryOne(`
      INSERT INTO ops_trading_proposals 
        (agent_id, title, signal_type, entry_price, target_price, stop_loss, proposed_steps, metadata, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      body.agent_id,
      body.title,
      body.signal_type || 'manual',
      body.entry_price || null,
      body.target_price || null,
      body.stop_loss || null,
      JSON.stringify(body.proposed_steps || ['analyze']),
      JSON.stringify(body.metadata || {}),
    ]);
    
    return NextResponse.json({
      success: true,
      proposal: result,
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
