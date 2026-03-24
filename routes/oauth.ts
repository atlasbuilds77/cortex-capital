// OAuth Routes (Google & Apple)
// Stubs for social authentication - redirects to email signup for MVP

import { FastifyInstance } from 'fastify';

const APP_URL = process.env.APP_URL || 'http://localhost:3001';

export async function oauthRoutes(server: FastifyInstance) {
  // ================================
  // GOOGLE OAUTH
  // ================================

  // GET /api/auth/google - Redirect to Google OAuth
  server.get('/api/auth/google', async (request, reply) => {
    // MVP: Redirect to email signup with message
    const redirectUrl = `${APP_URL}/signup?oauth=google&message=coming_soon`;

    return reply.redirect(302, redirectUrl);

    // TODO: Production implementation
    // const googleClientId = process.env.GOOGLE_CLIENT_ID;
    // const redirectUri = `${APP_URL}/api/auth/google/callback`;
    // const scope = encodeURIComponent('email profile');
    // const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    // return reply.redirect(302, googleAuthUrl);
  });

  // GET /api/auth/google/callback - Handle Google OAuth callback
  server.get<{
    Querystring: {
      code?: string;
      error?: string;
    };
  }>('/api/auth/google/callback', async (request, reply) => {
    const { code, error } = request.query;

    if (error) {
      return reply.redirect(302, `${APP_URL}/signup?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return reply.redirect(302, `${APP_URL}/signup?error=no_code`);
    }

    // MVP: Show coming soon message
    return reply.redirect(302, `${APP_URL}/signup?oauth=google&message=coming_soon`);

    // TODO: Production implementation
    // 1. Exchange code for tokens
    // 2. Get user info from Google
    // 3. Create/find user in database
    // 4. Generate JWT tokens
    // 5. Redirect to dashboard with tokens
  });

  // GET /api/auth/google/status - Check Google OAuth availability
  server.get('/api/auth/google/status', async (request, reply) => {
    const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    return {
      success: true,
      data: {
        provider: 'google',
        available: isConfigured,
        status: isConfigured ? 'ready' : 'coming_soon',
        message: isConfigured ? 'Google sign-in available' : 'Google sign-in coming soon',
      },
    };
  });

  // ================================
  // APPLE OAUTH
  // ================================

  // GET /api/auth/apple - Redirect to Apple OAuth
  server.get('/api/auth/apple', async (request, reply) => {
    // MVP: Redirect to email signup with message
    const redirectUrl = `${APP_URL}/signup?oauth=apple&message=coming_soon`;

    return reply.redirect(302, redirectUrl);

    // TODO: Production implementation
    // const appleClientId = process.env.APPLE_CLIENT_ID;
    // const redirectUri = `${APP_URL}/api/auth/apple/callback`;
    // const scope = 'email name';
    // const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${appleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&response_mode=form_post`;
    // return reply.redirect(302, appleAuthUrl);
  });

  // POST /api/auth/apple/callback - Handle Apple OAuth callback (Apple uses POST)
  server.post<{
    Body: {
      code?: string;
      id_token?: string;
      user?: string;
      error?: string;
    };
  }>('/api/auth/apple/callback', async (request, reply) => {
    const { code, error } = request.body;

    if (error) {
      return reply.redirect(302, `${APP_URL}/signup?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return reply.redirect(302, `${APP_URL}/signup?error=no_code`);
    }

    // MVP: Show coming soon message
    return reply.redirect(302, `${APP_URL}/signup?oauth=apple&message=coming_soon`);

    // TODO: Production implementation
    // 1. Verify id_token with Apple
    // 2. Exchange code for tokens if needed
    // 3. Extract user info from id_token
    // 4. Create/find user in database
    // 5. Generate JWT tokens
    // 6. Redirect to dashboard with tokens
  });

  // GET /api/auth/apple/status - Check Apple OAuth availability
  server.get('/api/auth/apple/status', async (request, reply) => {
    const isConfigured = !!(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID
    );

    return {
      success: true,
      data: {
        provider: 'apple',
        available: isConfigured,
        status: isConfigured ? 'ready' : 'coming_soon',
        message: isConfigured ? 'Apple sign-in available' : 'Apple sign-in coming soon',
      },
    };
  });

  // ================================
  // GENERIC OAUTH STATUS
  // ================================

  // GET /api/auth/providers - List all OAuth providers and their status
  server.get('/api/auth/providers', async (request, reply) => {
    const providers = [
      {
        id: 'email',
        name: 'Email & Password',
        available: true,
        status: 'ready',
        icon: '📧',
      },
      {
        id: 'google',
        name: 'Google',
        available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        status: process.env.GOOGLE_CLIENT_ID ? 'ready' : 'coming_soon',
        icon: '🔵',
      },
      {
        id: 'apple',
        name: 'Apple',
        available: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID),
        status: process.env.APPLE_CLIENT_ID ? 'ready' : 'coming_soon',
        icon: '🍎',
      },
    ];

    return {
      success: true,
      data: providers,
    };
  });
}
