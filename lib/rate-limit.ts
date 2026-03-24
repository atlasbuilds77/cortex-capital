// Rate limiting configuration for different endpoint types

export const rateLimitConfig = {
  // Global default: 100 requests per minute
  global: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 60 seconds
  },
  
  // Authentication endpoints: stricter limits to prevent brute force
  auth: {
    max: 5,
    timeWindow: 60000, // 5 requests per minute
    ban: 3, // Ban after 3 violations
  },
  
  // Trading/execution endpoints: very strict
  trading: {
    max: 10,
    timeWindow: 60000, // 10 trades per minute
  },
  
  // Read-only endpoints: more permissive
  read: {
    max: 200,
    timeWindow: 60000, // 200 requests per minute
  },
  
  // Webhook endpoints: based on expected volume
  webhook: {
    max: 50,
    timeWindow: 60000, // 50 webhooks per minute
  },
};

export const rateLimitOptions = {
  max: rateLimitConfig.global.max,
  timeWindow: rateLimitConfig.global.timeWindow,
  cache: 10000, // Keep track of 10,000 unique IPs
  allowList: ['127.0.0.1', '::1'], // Localhost exempt
  redis: process.env.REDIS_URL ? {
    host: new URL(process.env.REDIS_URL).hostname,
    port: parseInt(new URL(process.env.REDIS_URL).port || '6379'),
  } : undefined,
  nameSpace: 'cortex-capital-rl:',
  continueExceeding: false, // Stop processing when limit exceeded
  enableDraftSpec: true, // Use draft spec for headers
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
};
