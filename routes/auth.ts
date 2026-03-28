import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-change-in-production';
const SALT_ROUNDS = 10;

export async function authRoutes(fastify: FastifyInstance) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL required');
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  /**
   * POST /api/auth/signup
   * Create new user account
   */
  fastify.post('/api/auth/signup', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.code(400).send({ error: 'Invalid email format' });
      }

      // Validate password length
      if (password.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters' });
      }

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user (defaults to free tier, moderate risk)
      const userId = uuidv4();
      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, tier, risk_profile, is_active, email_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, email, tier, created_at`,
        [userId, email.toLowerCase(), passwordHash, 'free', 'moderate', true, false]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          createdAt: user.created_at,
        },
      });
    } catch (error: any) {
      console.error('SIGNUP ERROR DETAILS:', error);
      fastify.log.error('Signup error:', error);
      reply.code(500).send({ error: 'Signup failed', details: error.message });
    }
  });

  /**
   * POST /api/auth/login
   * Authenticate existing user
   */
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password required' });
      }

      // Find user
      const result = await pool.query(
        'SELECT id, email, password_hash, tier, created_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          createdAt: user.created_at,
        },
      });
    } catch (error: any) {
      console.error('LOGIN ERROR DETAILS:', error);
      fastify.log.error('Login error:', error);
      reply.code(500).send({ error: 'Login failed', details: error.message });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user info (requires auth)
   */
  fastify.get('/api/auth/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      // Get user
      const result = await pool.query(
        'SELECT id, email, tier, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get broker type from broker_credentials if exists
      const brokerResult = await pool.query(
        'SELECT broker_type FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1',
        [decoded.userId]
      );

      const user = result.rows[0];
      reply.send({
        id: user.id,
        email: user.email,
        tier: user.tier,
        brokerType: brokerResult.rows[0]?.broker_type || null,
        createdAt: user.created_at,
      });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return reply.code(401).send({ error: 'Invalid token' });
      }
      fastify.log.error('Auth me error:', error);
      reply.code(500).send({ error: 'Failed to get user info' });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Request password reset email
   */
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Check if user exists (but don't reveal this to the client)
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      // Always return success to prevent email enumeration
      // In production, this would send an actual email if user exists
      if (result.rows.length > 0) {
        // TODO: Generate reset token and send email via Resend
        fastify.log.info(`Password reset requested for: ${email}`);
      }

      reply.send({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    } catch (error: any) {
      fastify.log.error('Forgot password error:', error);
      reply.code(500).send({ error: 'Failed to process request' });
    }
  });

  /**
   * PUT /api/auth/change-password
   * Change password for authenticated user
   */
  fastify.put('/api/auth/change-password', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      if (!currentPassword || !newPassword) {
        return reply.code(400).send({ error: 'Current and new password required' });
      }

      if (newPassword.length < 8) {
        return reply.code(400).send({ error: 'New password must be at least 8 characters' });
      }

      // Verify current password
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!validPassword) {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }

      // Hash and save new password
      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, decoded.userId]
      );

      reply.send({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return reply.code(401).send({ error: 'Invalid token' });
      }
      fastify.log.error('Change password error:', error);
      reply.code(500).send({ error: 'Failed to change password' });
    }
  });

  fastify.log.info('Auth routes registered');
}
