import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-change-in-production';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
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
