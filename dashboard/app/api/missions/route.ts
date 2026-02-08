import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    
    const missions = await db.query(`
      SELECT 
        m.id, m.title, m.status, m.created_by, m.mission_type,
        m.proposal_id, m.priority, m.created_at, m.started_at, m.completed_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', ms.id,
              'kind', ms.kind,
              'status', ms.status,
              'created_at', ms.created_at
            ) ORDER BY ms.created_at ASC
          )
          FROM ops_mission_steps ms
          WHERE ms.mission_id = m.id
        ) as steps
      FROM ops_missions m
      ORDER BY m.created_at DESC
      LIMIT 20
    `);
    
    return NextResponse.json({
      missions: missions.map((m: any) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        created_by: m.created_by,
        mission_type: m.mission_type,
        proposal_id: m.proposal_id,
        priority: m.priority,
        created_at: m.created_at,
        started_at: m.started_at,
        completed_at: m.completed_at,
        steps: m.steps || [],
      })),
      count: missions.length,
    });
  } catch (error) {
    console.error('Missions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
