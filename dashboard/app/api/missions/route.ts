import { NextResponse } from 'next/server';

// Mock data - in production, connect to database
const mockMissions = [
  {
    id: 'mission_001',
    title: 'Execute BONK entry',
    status: 'running',
    mission_type: 'entry',
    created_by: 'intel',
    progress: 60,
    metadata: {
      token: 'BONK',
      entry_price: 0.00002,
      size: 0.23,
    },
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'mission_002',
    title: 'Monitor SPY position',
    status: 'running',
    mission_type: 'monitor',
    created_by: 'scout',
    progress: 100,
    metadata: {
      symbol: 'SPY',
      position: '500C',
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mission_003',
    title: 'MNQ scalp trade',
    status: 'succeeded',
    mission_type: 'entry',
    created_by: 'atlas',
    pnl: 45.50,
    metadata: {
      symbol: 'MNQ',
      contracts: 10,
    },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mission_004',
    title: 'WIF momentum play',
    status: 'failed',
    mission_type: 'entry',
    created_by: 'intel',
    pnl: -12.30,
    metadata: {
      token: 'WIF',
      reason: 'Stop loss hit',
    },
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mission_005',
    title: 'MES long position',
    status: 'succeeded',
    mission_type: 'entry',
    created_by: 'atlas',
    pnl: 125.00,
    metadata: {
      symbol: 'MES',
      contracts: 10,
    },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({
    missions: mockMissions,
    count: mockMissions.length,
    active: mockMissions.filter(m => ['approved', 'running'].includes(m.status)).length,
    completed: mockMissions.filter(m => ['succeeded', 'failed'].includes(m.status)).length,
  });
}
