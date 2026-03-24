// Health Check Endpoint
// Database, brokers, and system health

import { FastifyInstance } from 'fastify';
import { query, getPoolStats } from '../integrations/database';

export async function healthRoutes(server: FastifyInstance) {
  // GET /health - Basic health check
  server.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
  
  // GET /health/detailed - Detailed health check
  server.get('/health/detailed', async (request, reply) => {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: { status: 'unknown' },
        brokers: { status: 'unknown' },
        memory: { status: 'ok' },
      },
    };
    
    // Database health
    try {
      const dbStart = Date.now();
      await query('SELECT 1');
      const dbLatency = Date.now() - dbStart;
      
      const poolStats = getPoolStats();
      
      health.checks.database = {
        status: 'ok',
        latency: dbLatency,
        pool: {
          total: poolStats.totalCount,
          idle: poolStats.idleCount,
          waiting: poolStats.waitingCount,
        },
      };
    } catch (error: any) {
      health.checks.database = {
        status: 'error',
        error: error.message,
      };
      health.status = 'degraded';
    }
    
    // Broker API health (check Tradier)
    try {
      if (process.env.TRADIER_TOKEN) {
        const axios = (await import('axios')).default;
        const tradierStart = Date.now();
        
        const response = await axios.get(
          `${process.env.TRADIER_BASE_URL || 'https://sandbox.tradier.com'}/v1/user/profile`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TRADIER_TOKEN}`,
              Accept: 'application/json',
            },
            timeout: 5000,
          }
        );
        
        const tradierLatency = Date.now() - tradierStart;
        
        health.checks.brokers = {
          status: 'ok',
          tradier: {
            status: 'ok',
            latency: tradierLatency,
            account: response.data.profile?.account?.account_number || 'connected',
          },
        };
      } else {
        health.checks.brokers = {
          status: 'not_configured',
          message: 'No broker API tokens configured',
        };
      }
    } catch (error: any) {
      health.checks.brokers = {
        status: 'error',
        error: error.message,
      };
      health.status = 'degraded';
    }
    
    // Memory health
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    
    health.checks.memory = {
      status: memUsageMB.heapUsed > 1024 ? 'warning' : 'ok',
      usage: memUsageMB,
    };
    
    // Set HTTP status based on health
    const statusCode = health.status === 'ok' ? 200 : 503;
    
    return reply.status(statusCode).send(health);
  });
}
