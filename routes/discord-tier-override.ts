import { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Discord Singularity Tier Override
 * Grants Partner tier (highest) to users with Singularity role
 */

const SINGULARITY_ROLE_ID = '1339409988604252234'; // @Singularity role

export async function discordTierOverride(fastify: FastifyInstance) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL required');
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  /**
   * POST /api/discord/link
   * Link Discord user to Cortex account, auto-grant Partner tier if has Singularity role
   */
  fastify.post('/api/discord/link', async (request, reply) => {
    try {
      const { discordId, email, roles } = request.body as { 
        discordId: string; 
        email: string; 
        roles?: string[] 
      };

      if (!discordId || !email) {
        return reply.code(400).send({ error: 'discordId and email required' });
      }

      // Check if user exists
      const userResult = await pool.query(
        'SELECT id, tier FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Check if user has Singularity role
      const hasSingularityRole = roles?.includes(SINGULARITY_ROLE_ID) || false;
      const newTier = hasSingularityRole ? 'partner' : user.tier;

      // Update user with Discord ID and tier
      await pool.query(
        `UPDATE users 
         SET discord_id = $1, tier = $2, updated_at = NOW() 
         WHERE id = $3`,
        [discordId, newTier, user.id]
      );

      reply.send({
        success: true,
        tier: newTier,
        upgraded: hasSingularityRole && user.tier !== 'partner',
        message: hasSingularityRole 
          ? '🎉 Singularity role detected! Upgraded to Partner tier (free forever)'
          : 'Discord account linked',
      });
    } catch (error: any) {
      fastify.log.error('Discord link error:', error);
      reply.code(500).send({ error: 'Failed to link Discord account' });
    }
  });

  /**
   * POST /api/discord/check
   * Check if Discord user has Singularity role (requires roles array)
   */
  fastify.post('/api/discord/check', async (request, reply) => {
    try {
      const { discordId, roles } = request.body as { 
        discordId: string; 
        roles?: string[] 
      };

      if (!discordId) {
        return reply.code(400).send({ error: 'discordId required' });
      }

      const hasSingularityRole = roles?.includes(SINGULARITY_ROLE_ID) || false;

      reply.send({
        discordId,
        hasSingularityRole,
        tier: hasSingularityRole ? 'partner' : null,
        message: hasSingularityRole 
          ? 'Singularity role detected - Partner tier access granted'
          : 'Standard user - no premium role',
      });
    } catch (error: any) {
      fastify.log.error('Discord check error:', error);
      reply.code(500).send({ error: 'Failed to check Discord status' });
    }
  });

  fastify.log.info('Discord tier override routes registered');
}
