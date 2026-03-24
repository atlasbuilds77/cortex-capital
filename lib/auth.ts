// Authentication & Authorization Middleware
// JWT-based auth with refresh tokens

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../integrations/database';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface TokenPayload {
  userId: string;
  email: string;
  tier: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: TokenPayload;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET!) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Authentication middleware - verify JWT token
 */
export async function authenticate(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    // Attach user to request
    request.user = payload;
  } catch (error: any) {
    return reply.status(401).send({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
}

/**
 * Create session in database
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const result = await query(
    `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
     RETURNING id`,
    [userId, refreshToken, userAgent, ipAddress]
  );
  
  return result.rows[0].id;
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE id = $1`,
    [sessionId]
  );
}

/**
 * Invalidate all user sessions
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Validate refresh token
 */
export async function validateRefreshToken(refreshToken: string): Promise<TokenPayload | null> {
  try {
    const payload = verifyToken(refreshToken);
    
    // Check if session exists and is not revoked
    const result = await query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND refresh_token = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [payload.userId, refreshToken]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const result = await query(
    `SELECT id, email, password_hash, tier, risk_profile FROM users WHERE email = $1`,
    [email]
  );
  
  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const result = await query(
    `SELECT id, email, tier, risk_profile, created_at, updated_at FROM users WHERE id = $1`,
    [userId]
  );
  
  return result.rows[0] || null;
}
