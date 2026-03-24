import { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Discord Singularity Tier Override
 * Grants Partner tier (highest) to specific Discord users
 */

const SINGULARITY_DISCORD_IDS = [
  '1070789896204550174', // Singularity bot
  // Add more Discord IDs here if needed
];

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
   * Link Discord user to Cortex account, auto-grant Partner tier if Singularity
   */
  fastify.post('/api/discord/link', async (request, reply) => {
    try {
      const { discordId, email } = request.body as { discordId: string; email: string };

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

      // Check if Discord ID is Singularity
      const isSingularity = SINGULARITY_DISCORD_IDS.includes(discordId);
      const newTier = isSingularity ? 'partner' : user.tier;

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
        upgraded: isSingularity && user.tier !== 'partner',
        message: isSingularity 
          ? '🎉 Singularity user detected! Upgraded to Partner tier (free forever)'
          : 'Discord account linked',
      });
    } catch (error: any) {
      fastify.log.error('Discord link error:', error);
      reply.code(500).send({ error: 'Failed to link Discord account' });
    }
  });

  /**
   * GET /api/discord/check/:discordId
   * Check if Discord user has premium access
   */
  fastify.get('/api/discord/check/:discordId', async (request, reply) => {
    try {
      const { discordId } = request.params as { discordId: string };

      const isSingularity = SINGULARITY_DISCORD_IDS.includes(discordId);

      reply.send({
        discordId,
        isSingularity,
        tier: isSingularity ? 'partner' : null,
        message: isSingularity 
          ? 'Singularity user - Partner tier access granted'
          : 'Standard user',
      });
    } catch (error: any) {
      fastify.log.error('Discord check error:', error);
      reply.code(500).send({ error: 'Failed to check Discord status' });
    }
  });

  fastify.log.info('Discord tier override routes registered');
}
