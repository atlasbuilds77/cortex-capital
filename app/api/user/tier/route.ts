export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  getAgentsForTier, 
  getAllAgentsWithAccess, 
  getTierDisplayInfo,
  TIER_RESPONSE_DETAIL,
  type Tier 
} from '@/lib/tier-agents';

// Get user ID from cookie/session (simplified)
function getUserIdFromRequest(request: NextRequest): string | null {
  const authCookie = request.cookies.get('cortex_auth');
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value);
      return parsed.userId || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    // Default to free tier if not logged in
    let tier: Tier = 'free';
    let user = null;
    
    if (userId) {
      const result = await query(
        'SELECT id, email, tier, subscription_status FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length > 0) {
        user = result.rows[0];
        tier = (user.tier as Tier) || 'free';
        
        // If subscription is past_due or canceled, may need to downgrade
        if (user.subscription_status === 'canceled') {
          tier = 'free';
        }
      }
    }
    
    const agents = getAllAgentsWithAccess(tier);
    const visibleAgents = getAgentsForTier(tier);
    const tierInfo = getTierDisplayInfo(tier);
    const responseDetail = TIER_RESPONSE_DETAIL[tier];
    
    return NextResponse.json({
      tier,
      tierInfo,
      responseDetail,
      agents: {
        all: agents,
        visible: visibleAgents,
        lockedCount: agents.filter(a => a.locked).length,
      },
      user: user ? {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching user tier:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
