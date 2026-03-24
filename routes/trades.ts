/**
 * TRADE ROUTES
 * API endpoints for trade approval and execution
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../lib/db';
import { getPendingTrades, approveTrade, rejectTrade } from '../services/trade-queue';
import { executeApprovedTrade } from '../services/broker-executor';

export default async function tradeRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/trades/pending
   * Get pending trades awaiting approval
   */
  fastify.get('/api/trades/pending', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const db = getPool();
      const pendingTrades = await getPendingTrades(user.id, db);

      return reply.send({
        trades: pendingTrades,
      });
    } catch (error: any) {
      console.error('Fetch pending trades failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/trades/:id/approve
   * Approve a pending trade
   */
  fastify.post('/api/trades/:id/approve', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const db = getPool();

      // Verify trade belongs to user
      const tradeResult = await db.query(
        `SELECT * FROM trade_queue WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      );

      if (tradeResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Trade not found' });
      }

      // Approve trade
      await approveTrade(id, user.id, db);

      // Execute immediately
      const trade = {
        id: tradeResult.rows[0].id,
        userId: tradeResult.rows[0].user_id,
        tier: tradeResult.rows[0].tier,
        decision: JSON.parse(tradeResult.rows[0].decision_data),
        status: 'approved' as const,
        approvalRequired: tradeResult.rows[0].approval_required,
        queuedAt: tradeResult.rows[0].queued_at,
      };

      const executionResult = await executeApprovedTrade(trade, db);

      return reply.send({
        success: true,
        executionResult,
      });
    } catch (error: any) {
      console.error('Trade approval failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/trades/:id/reject
   * Reject a pending trade
   */
  fastify.post('/api/trades/:id/reject', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      const db = getPool();

      // Verify trade belongs to user
      const tradeResult = await db.query(
        `SELECT * FROM trade_queue WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      );

      if (tradeResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Trade not found' });
      }

      // Reject trade
      await rejectTrade(id, reason || 'User rejected', db);

      return reply.send({
        success: true,
      });
    } catch (error: any) {
      console.error('Trade rejection failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/trades/history
   * Get user's trade history
   */
  fastify.get('/api/trades/history', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { limit = 50, offset = 0 } = request.query as any;

      const db = getPool();
      const result = await db.query(
        `SELECT * FROM trade_history
         WHERE user_id = $1
         ORDER BY executed_at DESC
         LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      );

      return reply.send({
        trades: result.rows,
      });
    } catch (error: any) {
      console.error('Trade history fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
