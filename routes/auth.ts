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
        'SELECT id, email, tier, broker_type, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = result.rows[0];
      reply.send({
        id: user.id,
        email: user.email,
        tier: user.tier,
        brokerType: user.broker_type,
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

  fastify.log.info('Auth routes registered');
}
