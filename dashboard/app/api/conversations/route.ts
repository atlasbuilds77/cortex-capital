import { NextResponse } from 'next/server';

// Mock data - in production, connect to database
const mockConversations = [
  {
    id: 'conv_001',
    format: 'morning_standup',
    participants: ['atlas', 'sage', 'intel', 'scout'],
    topic: 'Daily strategy alignment',
    status: 'completed',
    history: [
      { speaker: 'atlas', message: "Good morning team. What's the overnight activity?", turn: 1, timestamp: Date.now() - 3600000 },
      { speaker: 'intel', message: "Seeing strong momentum in SOL ecosystem. Multiple KOLs accumulating.", turn: 2, timestamp: Date.now() - 3540000 },
      { speaker: 'sage', message: "Current portfolio exposure is 45%. Room for 1-2 more positions.", turn: 3, timestamp: Date.now() - 3480000 },
      { speaker: 'scout', message: "Ready to execute. Jupiter API responding normally.", turn: 4, timestamp: Date.now() - 3420000 },
      { speaker: 'atlas', message: "Let's focus on high-confidence signals only. Prioritize risk-reward.", turn: 5, timestamp: Date.now() - 3360000 },
    ],
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv_002',
    format: 'debate',
    participants: ['sage', 'intel'],
    topic: 'BONK entry timing',
    status: 'completed',
    history: [
      { speaker: 'intel', message: "BONK showing 85% confidence signal. Whale accumulation visible.", turn: 1, timestamp: Date.now() - 1800000 },
      { speaker: 'sage', message: "Volatility is elevated. 24h ATR at 15%. Suggests smaller position.", turn: 2, timestamp: Date.now() - 1740000 },
      { speaker: 'intel', message: "Volume supports the move. 3x average daily.", turn: 3, timestamp: Date.now() - 1680000 },
      { speaker: 'sage', message: "Agreed on entry, but recommend 50% standard size.", turn: 4, timestamp: Date.now() - 1620000 },
    ],
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv_003',
    format: 'post_mortem',
    participants: ['atlas', 'sage', 'growth', 'scout'],
    topic: 'WIF trade analysis',
    status: 'completed',
    history: [
      { speaker: 'atlas', message: "Let's review the WIF trade. -30% stop hit.", turn: 1, timestamp: Date.now() - 900000 },
      { speaker: 'growth', message: "Entry timing was off. Entered after 40% pump already.", turn: 2, timestamp: Date.now() - 840000 },
      { speaker: 'scout', message: "Execution was clean. Fill at expected price.", turn: 3, timestamp: Date.now() - 780000 },
      { speaker: 'sage', message: "Lesson: Don't chase momentum after large moves.", turn: 4, timestamp: Date.now() - 720000 },
      { speaker: 'atlas', message: "Adding this to memory. Growth, track this pattern.", turn: 5, timestamp: Date.now() - 660000 },
    ],
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({
    conversations: mockConversations,
    count: mockConversations.length,
    todayCount: mockConversations.filter(c => {
      const created = new Date(c.created_at);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length,
  });
}
