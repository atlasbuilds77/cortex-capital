import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter
// In production, use Redis or similar distributed cache
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
};

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Skip health check from rate limiting
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }
  
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [key, value] of rateLimit.entries()) {
      if (value.resetAt < now) {
        rateLimit.delete(key);
      }
    }
  }
  
  const limit = rateLimit.get(ip);
  
  if (limit && limit.resetAt > now) {
    if (limit.count >= RATE_LIMIT.maxRequests) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((limit.resetAt - now) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limit.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(limit.resetAt),
          },
        }
      );
    }
    limit.count++;
  } else {
    rateLimit.set(ip, { 
      count: 1, 
      resetAt: now + RATE_LIMIT.windowMs 
    });
  }
  
  const currentLimit = rateLimit.get(ip)!;
  const response = NextResponse.next();
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT.maxRequests - currentLimit.count));
  response.headers.set('X-RateLimit-Reset', String(currentLimit.resetAt));
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
