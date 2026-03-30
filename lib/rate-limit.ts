/**
 * RATE LIMITING
 * 
 * In-memory rate limiter for API endpoints.
 * Uses sliding window algorithm.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on deploy - fine for basic protection)
const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;  // Time window in ms
  maxRequests: number;  // Max requests per window
}

// Presets for different endpoints
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },      // 10 per 15 min
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },       // 5 per 15 min
  signup: { windowMs: 60 * 60 * 1000, maxRequests: 3 },      // 3 per hour
  api: { windowMs: 60 * 1000, maxRequests: 60 },             // 60 per min
  trade: { windowMs: 60 * 1000, maxRequests: 10 },           // 10 per min
  cron: { windowMs: 60 * 1000, maxRequests: 5 },             // 5 per min
};

/**
 * Check if request is rate limited
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = store.get(key);
  
  // Clean up expired entry
  if (entry && entry.resetAt < now) {
    store.delete(key);
    entry = undefined;
  }
  
  if (!entry) {
    // First request in window
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit identifier from request
 * Uses IP + optional user ID for more accurate limiting
 */
export function getRateLimitKey(
  request: Request,
  prefix: string,
  userId?: string
): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  
  if (userId) {
    return `${prefix}:${userId}:${ip}`;
  }
  return `${prefix}:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  };
}

/**
 * Create rate limited error response
 */
export function rateLimitedResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...rateLimitHeaders(0, resetAt),
      },
    }
  );
}

// Cleanup old entries periodically (every 5 min)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
