/**
 * BROKER OAUTH ROUTES
 * Handles OAuth flows for broker connections (Tradier, Alpaca)
 */

import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../lib/auth';
import { query } from '../integrations/database';

const APP_URL = process.env.APP_URL || 'http://localhost:3002';

// Tradier OAuth config
const TRADIER_CLIENT_ID = process.env.TRADIER_CLIENT_ID || '';
const TRADIER_CLIENT_SECRET = process.env.TRADIER_CLIENT_SECRET || '';
const TRADIER_REDIRECT_URI = process.env.TRADIER_REDIRECT_URI || `${APP_URL}/api/broker/tradier/callback`;

// Alpaca OAuth config  
const ALPACA_CLIENT_ID = process.env.ALPACA_CLIENT_ID || '';
const ALPACA_CLIENT_SECRET = process.env.ALPACA_CLIENT_SECRET || '';
const ALPACA_REDIRECT_URI = process.env.ALPACA_REDIRECT_URI || `${APP_URL}/api/broker/alpaca/callback`;

export async function brokerOAuthRoutes(server: FastifyInstance) {
  
  // ================================
  // TRADIER OAUTH
  // ================================
  
  // Step 1: Redirect to Tradier authorization
  server.get('/api/broker/tradier/auth', async (request, reply) => {
    if (!TRADIER_CLIENT_ID) {
      // Fallback: show manual token entry
      return reply.redirect(302, `${APP_URL}/settings/brokers?connect=tradier&mode=manual`);
    }
    
    const authUrl = `https://api.tradier.com/v1/oauth/authorize?client_id=${TRADIER_CLIENT_ID}&scope=read,write,trade&state=tradier`;
    return reply.redirect(302, authUrl);
  });

  // Step 2: Handle Tradier callback
  server.get<{
    Querystring: { code?: string; error?: string; state?: string };
  }>('/api/broker/tradier/callback', async (request, reply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply.redirect(302, `${APP_URL}/settings/brokers?error=${error || 'no_code'}`);
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://api.tradier.com/v1/oauth/accesstoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_id=${TRADIER_CLIENT_ID}&client_secret=${TRADIER_CLIENT_SECRET}`,
      });

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        // Store the token (would need user context from session/cookie)
        // For now redirect with success
        return reply.redirect(302, `${APP_URL}/settings/brokers?connected=tradier&success=true`);
      }

      return reply.redirect(302, `${APP_URL}/settings/brokers?error=token_exchange_failed`);
    } catch (err: any) {
      server.log.error('Tradier OAuth error:', err);
      return reply.redirect(302, `${APP_URL}/settings/brokers?error=${encodeURIComponent(err.message)}`);
    }
  });

  // ================================
  // ALPACA OAUTH
  // ================================

  server.get('/api/broker/alpaca/auth', async (request, reply) => {
    if (!ALPACA_CLIENT_ID) {
      return reply.redirect(302, `${APP_URL}/settings/brokers?connect=alpaca&mode=manual`);
    }

    const authUrl = `https://app.alpaca.markets/oauth/authorize?response_type=code&client_id=${ALPACA_CLIENT_ID}&redirect_uri=${encodeURIComponent(ALPACA_REDIRECT_URI)}&scope=account:write%20trading`;
    return reply.redirect(302, authUrl);
  });

  server.get<{
    Querystring: { code?: string; error?: string };
  }>('/api/broker/alpaca/callback', async (request, reply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply.redirect(302, `${APP_URL}/settings/brokers?error=${error || 'no_code'}`);
    }

    try {
      const tokenRes = await fetch('https://api.alpaca.markets/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_id=${ALPACA_CLIENT_ID}&client_secret=${ALPACA_CLIENT_SECRET}&redirect_uri=${ALPACA_REDIRECT_URI}`,
      });

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        return reply.redirect(302, `${APP_URL}/settings/brokers?connected=alpaca&success=true`);
      }

      return reply.redirect(302, `${APP_URL}/settings/brokers?error=token_exchange_failed`);
    } catch (err: any) {
      server.log.error('Alpaca OAuth error:', err);
      return reply.redirect(302, `${APP_URL}/settings/brokers?error=${encodeURIComponent(err.message)}`);
    }
  });

  // ================================
  // MANUAL TOKEN ENTRY (fallback)
  // ================================

  server.post('/api/broker/connect-manual', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    const { broker, token, accountId } = request.body as any;

    if (!broker || !token) {
      return reply.code(400).send({ error: 'broker and token required' });
    }

    try {
      // Verify the token works
      let verified = false;
      
      if (broker === 'tradier') {
        const res = await fetch('https://api.tradier.com/v1/user/profile', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        verified = res.ok;
      } else if (broker === 'alpaca') {
        const res = await fetch('https://api.alpaca.markets/v2/account', {
          headers: { 'APCA-API-KEY-ID': token, 'APCA-API-SECRET-KEY': accountId || '' },
        });
        verified = res.ok;
      }

      if (!verified) {
        return reply.code(400).send({ error: 'Invalid credentials. Could not connect to broker.' });
      }

      // Store in DB
      await query(
        `INSERT INTO broker_credentials (user_id, broker_type, encrypted_api_key, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (user_id, broker_type) DO UPDATE SET encrypted_api_key = $3, is_active = true`,
        [request.user!.userId, broker, token] // TODO: encrypt token
      );

      return { success: true, broker, message: `${broker} connected successfully` };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  server.log.info('Broker OAuth routes registered');
}
