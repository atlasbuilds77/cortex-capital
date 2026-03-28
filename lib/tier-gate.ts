import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedUser } from './auth-middleware';
import { query } from './db';

export type Tier = 'free' | 'recovery' | 'scout' | 'operator';

const TIER_PERMISSIONS: Record<Tier, string[]> = {
  free: ['view_discussions', 'view_demo'],
  recovery: ['view_discussions', 'view_demo', 'alerts', 'analytics', 'view_portfolio'],
  scout: [
    'view_discussions',
    'view_demo',
    'alerts',
    'analytics',
    'view_portfolio',
    'phone_booth',
    'signals',
    'priority_support',
  ],
  operator: [
    'view_discussions',
    'view_demo',
    'alerts',
    'analytics',
    'view_portfolio',
    'phone_booth',
    'signals',
    'priority_support',
    'auto_execute',
    'broker_connect',
    'portfolio_management',
  ],
};

const TIER_HIERARCHY: Record<Tier, number> = {
  free: 0,
  recovery: 1,
  scout: 2,
  operator: 3,
};

/**
 * Check if a user's tier has a specific permission.
 */
export function hasPermission(userTier: Tier, permission: string): boolean {
  return TIER_PERMISSIONS[userTier]?.includes(permission) ?? false;
}

/**
 * Check if user's tier meets or exceeds minimum tier.
 */
export function meetsTier(userTier: Tier, minTier: Tier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[minTier];
}

/**
 * Fetch user tier from database.
 */
async function getUserTier(userId: string): Promise<Tier> {
  const result = await query(
    'SELECT tier FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return 'free'; // default
  }
  
  return (result.rows[0].tier as Tier) || 'free';
}

/**
 * Middleware wrapper that enforces minimum tier requirement.
 */
export function requireTier(minTier: Tier) {
  return function (
    handler: (request: NextRequest, user: AuthenticatedUser, tier: Tier) => Promise<Response>
  ) {
    return async (request: NextRequest, user: AuthenticatedUser) => {
      const userTier = await getUserTier(user.userId);
      
      if (!meetsTier(userTier, minTier)) {
        return NextResponse.json(
          { 
            error: 'Insufficient tier',
            required: minTier,
            current: userTier,
            message: `This feature requires ${minTier} tier or higher.`
          },
          { status: 403 }
        );
      }
      
      return handler(request, user, userTier);
    };
  };
}

/**
 * Check permission without throwing (for conditional features).
 */
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const tier = await getUserTier(userId);
  return hasPermission(tier, permission);
}
