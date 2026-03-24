/**
 * Example: Integrate Scheduler with Main Server
 * 
 * Shows how to add the scheduler to your existing server.ts
 */

import Fastify from 'fastify';
import { createScheduler } from '../services/scheduler';
import { createPortfolioEngine } from '../services/portfolio-engine';

const fastify = Fastify({ logger: true });

// Initialize scheduler
const scheduler = createScheduler();
const engine = createPortfolioEngine();

// Start scheduler on server startup
fastify.addHook('onReady', async () => {
  scheduler.start();
  fastify.log.info('✅ Portfolio scheduler started');
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  scheduler.stop();
  fastify.log.info('✅ Scheduler stopped');
});

// API Endpoints

// Get scheduler status
fastify.get('/api/scheduler/status', async () => {
  return scheduler.getStatus();
});

// Manually trigger a job (admin only)
fastify.post('/api/scheduler/trigger', async (request, reply) => {
  const { job } = request.body as any;
  
  if (!['daily', 'weekly_rebalance', 'monthly_report', 'weekly_report'].includes(job)) {
    return reply.code(400).send({ error: 'Invalid job name' });
  }
  
  // In production, add auth check here
  await scheduler.triggerJob(job);
  
  return { success: true, job, triggeredAt: new Date().toISOString() };
});

// Analyze a user's portfolio (user endpoint)
fastify.post('/api/portfolio/:userId/analyze', async (request, reply) => {
  const { userId } = request.params as any;
  
  // In production, verify userId matches authenticated user
  try {
    const analysis = await engine.analyzePortfolio(userId);
    return analysis;
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
});

// Generate rebalancing plan
fastify.post('/api/portfolio/:userId/rebalance', async (request, reply) => {
  const { userId } = request.params as any;
  
  try {
    const plan = await engine.generatePlan(userId);
    return plan;
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
});

// Execute approved plan
fastify.post('/api/portfolio/:userId/execute/:planId', async (request, reply) => {
  const { userId, planId } = request.params as any;
  
  try {
    const result = await engine.executePlan(userId, planId);
    return result;
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
});

// Get user's reports
fastify.get('/api/portfolio/:userId/reports', async (request, reply) => {
  const { userId } = request.params as any;
  const { type } = request.query as any; // daily, weekly, monthly
  
  // Query reports from database
  // (implementation depends on your Supabase setup)
  
  return { userId, reportType: type || 'all', reports: [] };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server running on http://localhost:3000');
    console.log('⏰ Scheduler active - jobs will run automatically');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
