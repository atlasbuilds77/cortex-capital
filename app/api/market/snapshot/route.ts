import { NextRequest, NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/agents/data/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getMarketSnapshot();
    return NextResponse.json({
      success: true,
      spy: snapshot.spy,
      qqq: snapshot.qqq,
      iwm: snapshot.iwm,
      vix: snapshot.vix,
      marketStatus: snapshot.marketStatus,
      timestamp: snapshot.timestamp,
    });
  } catch (error) {
    console.error('[API] Market snapshot failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
