// User Management Routes
// Profile, preferences, account deletion

import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedRequest, hashPassword, invalidateAllUserSessions } from '../lib/auth';
import { UpdateProfileSchema, UpdatePreferencesSchema, validateBody } from '../lib/validation';
import { query } from '../integrations/database';

export async function userRoutes(server: FastifyInstance) {
  // GET /api/user/profile - Get user profile
  server.get('/api/user/profile', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.tier, u.risk_profile, u.email_verified, u.created_at, u.updated_at,
                up.investment_horizon, up.constraints, up.day_trading_allocation, up.options_allocation
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.id = $1`,
        [request.user!.userId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }
      
      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // PUT /api/user/profile - Update user profile
  server.put<{
    Body: {
      email?: string;
      tier?: string;
      risk_profile?: string;
    };
  }>('/api/user/profile', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const data = validateBody(UpdateProfileSchema, request.body);
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (data.email) {
        // Check if email already exists
        const existing = await query(
          `SELECT id FROM users WHERE email = $1 AND id != $2`,
          [data.email, request.user!.userId]
        );
        
        if (existing.rows.length > 0) {
          return reply.status(400).send({
            success: false,
            error: 'Email already in use',
          });
        }
        
        updates.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      
      if (data.tier) {
        updates.push(`tier = $${paramIndex++}`);
        values.push(data.tier);
      }
      
      if (data.risk_profile) {
        updates.push(`risk_profile = $${paramIndex++}`);
        values.push(data.risk_profile);
      }
      
      if (updates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No fields to update',
        });
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(request.user!.userId);
      
      const result = await query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, tier, risk_profile, updated_at`,
        values
      );
      
      // Audit
      await query(
        `INSERT INTO audit_log (user_id, action, metadata)
         VALUES ($1, 'profile_updated', $2)`,
        [request.user!.userId, JSON.stringify(data)]
      );
      
      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // PUT /api/user/preferences - Update trading preferences
  server.put<{
    Body: {
      risk_profile?: string;
      investment_horizon?: string;
      constraints?: any;
      day_trading_allocation?: number;
      options_allocation?: number;
    };
  }>('/api/user/preferences', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const data = validateBody(UpdatePreferencesSchema, request.body);
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (data.risk_profile) {
        updates.push(`risk_profile = $${paramIndex++}`);
        values.push(data.risk_profile);
      }
      
      if (data.investment_horizon) {
        updates.push(`investment_horizon = $${paramIndex++}`);
        values.push(data.investment_horizon);
      }
      
      if (data.constraints) {
        updates.push(`constraints = $${paramIndex++}`);
        values.push(JSON.stringify(data.constraints));
      }
      
      if (data.day_trading_allocation !== undefined) {
        updates.push(`day_trading_allocation = $${paramIndex++}`);
        values.push(data.day_trading_allocation);
      }
      
      if (data.options_allocation !== undefined) {
        updates.push(`options_allocation = $${paramIndex++}`);
        values.push(data.options_allocation);
      }
      
      if (updates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No fields to update',
        });
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(request.user!.userId);
      
      // Check if preferences exist
      const existing = await query(
        `SELECT id FROM user_preferences WHERE user_id = $1`,
        [request.user!.userId]
      );
      
      let result;
      
      if (existing.rows.length === 0) {
        // Insert new preferences
        result = await query(
          `INSERT INTO user_preferences (user_id, ${updates.join(', ').replace(/\$\d+/g, (match) => {
            const num = parseInt(match.slice(1));
            return `$${num}`;
          })})
           VALUES ($${paramIndex}, ${values.map((_, i) => `$${i + 1}`).join(', ')})
           RETURNING *`,
          [...values, request.user!.userId]
        );
      } else {
        // Update existing
        result = await query(
          `UPDATE user_preferences SET ${updates.join(', ')}
           WHERE user_id = $${paramIndex}
           RETURNING *`,
          values
        );
      }
      
      // Also update users table risk_profile if provided
      if (data.risk_profile) {
        await query(
          `UPDATE users SET risk_profile = $1 WHERE id = $2`,
          [data.risk_profile, request.user!.userId]
        );
      }
      
      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // DELETE /api/user - Delete account
  server.delete('/api/user', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      // Invalidate all sessions
      await invalidateAllUserSessions(request.user!.userId);
      
      // Audit before deletion
      await query(
        `INSERT INTO audit_log (user_id, action, metadata)
         VALUES ($1, 'account_deleted', $2)`,
        [request.user!.userId, JSON.stringify({ timestamp: new Date().toISOString() })]
      );
      
      // Delete user (cascade will handle related records)
      await query(
        `DELETE FROM users WHERE id = $1`,
        [request.user!.userId]
      );
      
      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
