export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, getAgent } from '@/lib/agents/agent-config';

/**
 * GET /api/agents
 * Returns all agent configurations with avatars
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('id');

  if (agentId) {
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  }

  return NextResponse.json(getAllAgents());
}
