/**
 * DISCUSSION ROUTES
 * API endpoints for portfolio discussions
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../lib/db';
import { startUserPortfolioDiscussion, type DiscussionType } from '../lib/user-discussion';

export default async function discussionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/discussions/start
   * Start a new portfolio discussion for the authenticated user
   */
  fastify.post('/api/discussions/start', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { type } = request.body as { type: DiscussionType };

      if (!['review', 'risk_assessment', 'opportunities', 'morning_briefing'].includes(type)) {
        return reply.code(400).send({ error: 'Invalid discussion type' });
      }

      const db = getPool();
      const discussion = await startUserPortfolioDiscussion(user.id, type, db);

      return reply.send({
        success: true,
        discussion,
      });
    } catch (error: any) {
      console.error('Discussion start failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/discussions/:id
   * Get a specific discussion by ID
   */
  fastify.get('/api/discussions/:id', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const db = getPool();
      const result = await db.query(
        `SELECT * FROM agent_discussions WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Discussion not found' });
      }

      const row = result.rows[0];
      return reply.send({
        id: row.id,
        userId: row.user_id,
        type: row.discussion_type,
        messages: JSON.parse(row.messages),
        decisions: JSON.parse(row.decisions || '[]'),
        startedAt: row.started_at,
        completedAt: row.completed_at,
      });
    } catch (error: any) {
      console.error('Discussion fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/discussions
   * List all discussions for the authenticated user
   */
  fastify.get('/api/discussions', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { limit = 10, offset = 0 } = request.query as any;

      const db = getPool();
      const result = await db.query(
        `SELECT id, discussion_type, started_at, completed_at
         FROM agent_discussions
         WHERE user_id = $1
         ORDER BY started_at DESC
         LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      );

      return reply.send({
        discussions: result.rows.map((row) => ({
          id: row.id,
          type: row.discussion_type,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        })),
      });
    } catch (error: any) {
      console.error('Discussion list failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
