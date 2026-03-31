export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRelationshipMatrix, getRecentShifts, initializeRelationships } from '@/lib/agents/relationship-tracker';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * GET /api/relationships
 * Returns the agent relationship matrix for the current user
 */
export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const matrix = await getRelationshipMatrix(user.id);
    const recentShifts = await getRecentShifts(user.id, 10);

    // If no relationships exist, initialize them
    if (matrix.length === 0) {
      await initializeRelationships(user.id);
      const newMatrix = await getRelationshipMatrix(user.id);
      return NextResponse.json({
        matrix: newMatrix,
        recentShifts: [],
        initialized: true,
      });
    }

    return NextResponse.json({
      matrix,
      recentShifts,
      initialized: false,
    });
  } catch (error) {
    console.error('Failed to get relationships:', error);
    return NextResponse.json(
      { error: 'Failed to get relationship matrix' },
      { status: 500 }
    );
  }
});
