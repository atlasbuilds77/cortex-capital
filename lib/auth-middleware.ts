import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

function getJwtSecret(): string {
  return getRequiredEnv('JWT_SECRET');
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser | null> {
  let token: string | null = null;
  
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Fall back to query param (for SSE which doesn't support headers)
  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get('token');
  }
  
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    }) as AuthenticatedUser;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return handler(request, user);
  };
}

/**
 * Get authenticated user without requiring auth (returns null if not authenticated)
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export async function getAuthUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  return authenticate(request);
}
