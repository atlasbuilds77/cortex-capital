// Cortex Capital - Production API Server
// Complete with auth, rate limiting, validation, and all endpoints

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { rateLimitOptions, rateLimitConfig } from './lib/rate-limit';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { brokerRoutes } from './routes/brokers';
import { healthRoutes } from './routes/health';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'production' ? undefined : {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  // Security headers
  trustProxy: true,
  // Request ID for tracing
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// ============================================
// MIDDLEWARE
// ============================================

// CORS
server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
  credentials: true,
});

// Rate limiting
server.register(rateLimit, rateLimitOptions);

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  server.addHook('onRequest', async (request, reply) => {
    server.log.info(`${request.method} ${request.url}`);
  });
}

// Error handler
server.setErrorHandler(async (error, request, reply) => {
  server.log.error(error);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;
  
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: message,
  });
});

// ============================================
// ROUTES
// ============================================

// Health checks (no rate limit)
server.register(healthRoutes);

// Authentication routes (strict rate limit)
server.register(async (fastify) => {
  fastify.register(rateLimit, {
    max: rateLimitConfig.auth.max,
    timeWindow: rateLimitConfig.auth.timeWindow,
  });
  fastify.register(authRoutes);
});

// User management routes (protected)
server.register(userRoutes);

// Broker management routes (protected)
server.register(brokerRoutes);

// ============================================
// LEGACY ENDPOINTS (from original server.ts)
// ============================================

import { analyzePortfolio } from './agents/analyst';
import { getAccounts, getUserProfile } from './integrations/tradier';
import { query } from './integrations/database';
import { authenticate, AuthenticatedRequest } from './lib/auth';

// Get Tradier user profile
server.get('/api/tradier/profile', {
  preHandler: authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const profile = await getUserProfile();
    return { success: true, data: profile };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get Tradier accounts
server.get('/api/tradier/accounts', {
  preHandler: authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const accounts = await getAccounts();
    return { success: true, data: accounts };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Analyze portfolio
server.get<{
  Params: { accountId: string };
}>('/api/portfolio/analyze/:accountId', {
  preHandler: authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const { accountId } = request.params;
    const report = await analyzePortfolio(accountId);
    return { success: true, data: report };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Save portfolio snapshot
server.post<{
  Body: {
    user_id: string;
    total_value: number;
    positions: any[];
    metrics: any;
  };
}>('/api/portfolio/snapshot', {
  preHandler: authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const { user_id, total_value, positions, metrics } = request.body;
    
    // Verify user owns this request
    if (user_id !== request.user!.userId) {
      return reply.status(403).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await query(
      `INSERT INTO portfolio_snapshots (user_id, total_value, positions, metrics) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, created_at`,
      [user_id, total_value, JSON.stringify(positions), JSON.stringify(metrics)]
    );

    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get portfolio snapshots for user
server.get<{
  Params: { userId: string };
}>('/api/portfolio/snapshots/:userId', {
  preHandler: authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  try {
    const { userId } = request.params;
    
    // Verify user owns this request
    if (userId !== request.user!.userId) {
      return reply.status(403).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await query(
      `SELECT id, snapshot_date, total_value, positions, metrics 
       FROM portfolio_snapshots 
       WHERE user_id = $1 
       ORDER BY snapshot_date DESC 
       LIMIT 30`,
      [userId]
    );

    return { success: true, data: result.rows };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async () => {
  console.log('\nShutting down server...');
  
  try {
    await server.close();
    console.log('Server closed');
    
    // Database will handle its own shutdown via event handlers
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================
// START SERVER
// ============================================

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    console.log(`\n🚀 Cortex Capital API Server`);
    console.log(`📡 Running on http://${host}:${port}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n✅ Endpoints registered:`);
    console.log(`   Authentication:`);
    console.log(`      POST   /api/auth/signup`);
    console.log(`      POST   /api/auth/login`);
    console.log(`      POST   /api/auth/refresh`);
    console.log(`      POST   /api/auth/logout`);
    console.log(`      POST   /api/auth/forgot-password`);
    console.log(`      POST   /api/auth/reset-password`);
    console.log(`      GET    /api/auth/me`);
    console.log(`   User Management:`);
    console.log(`      GET    /api/user/profile`);
    console.log(`      PUT    /api/user/profile`);
    console.log(`      PUT    /api/user/preferences`);
    console.log(`      DELETE /api/user`);
    console.log(`   Broker Management:`);
    console.log(`      GET    /api/brokers`);
    console.log(`      POST   /api/brokers/connect`);
    console.log(`      DELETE /api/brokers/:id`);
    console.log(`      GET    /api/brokers/:id/sync`);
    console.log(`   Health:`);
    console.log(`      GET    /health`);
    console.log(`      GET    /health/detailed`);
    console.log(`   Legacy (Protected):`);
    console.log(`      GET    /api/tradier/profile`);
    console.log(`      GET    /api/tradier/accounts`);
    console.log(`      GET    /api/portfolio/analyze/:accountId`);
    console.log(`      POST   /api/portfolio/snapshot`);
    console.log(`      GET    /api/portfolio/snapshots/:userId`);
    console.log(``);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
