import { NextResponse } from 'next/server';

// Mock data - in production, connect to database
const mockProposals = [
  {
    id: 'prop_001',
    title: 'Entry: BONK momentum play',
    agent_id: 'intel',
    status: 'pending',
    signal_type: 'momentum',
    proposed_steps: ['analyze_signal', 'execute_trade'],
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'prop_002',
    title: 'Scale out: SPY 500C',
    agent_id: 'atlas',
    status: 'accepted',
    signal_type: 'exit',
    proposed_steps: ['execute_trade'],
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'prop_003',
    title: 'Risk review: Portfolio exposure',
    agent_id: 'sage',
    status: 'pending',
    signal_type: 'analysis',
    proposed_steps: ['analyze', 'roundtable_conversation'],
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({
    proposals: mockProposals,
    count: mockProposals.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newProposal = {
      id: `prop_${Date.now()}`,
      title: body.title,
      agent_id: body.agent_id,
      status: 'pending',
      signal_type: body.signal_type || 'manual',
      proposed_steps: body.proposed_steps || ['analyze'],
      created_at: new Date().toISOString(),
    };
    
    mockProposals.push(newProposal);
    
    return NextResponse.json({
      success: true,
      proposal: newProposal,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
