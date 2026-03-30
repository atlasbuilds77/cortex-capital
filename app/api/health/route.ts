export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * GET /api/health - Basic health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
