export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1429327930005262337';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'vkeHWOe60F9Ceycj97OJjSJNEpIWU8Rm';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://cortexcapitalgroup.com/api/auth/discord/callback';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1354693841978134598';
const SINGULARITY_ROLE_ID = process.env.SINGULARITY_ROLE_ID || '1454737556062208073';
const JWT_SECRET = process.env.JWT_SECRET || 'cortex-capital-secret-key-change-in-prod';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

interface DiscordUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=discord_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/login?error=user_fetch_failed', request.url));
    }

    const discordUser: DiscordUser = await userResponse.json();

    // Check if user has SINGULARITY role in the guild
    let hasSingularityRole = false;
    
    if (DISCORD_BOT_TOKEN) {
      // Use bot token to check guild member roles
      const memberResponse = await fetch(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordUser.id}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );

      if (memberResponse.ok) {
        const member = await memberResponse.json();
        hasSingularityRole = member.roles?.includes(SINGULARITY_ROLE_ID) || false;
      }
    } else {
      // Fallback: Try using user's OAuth token to get guild member info
      const guildMemberResponse = await fetch(
        `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      console.log('Guild member response status:', guildMemberResponse.status);
      
      if (guildMemberResponse.ok) {
        const member = await guildMemberResponse.json();
        console.log('Member roles:', member.roles);
        console.log('Looking for SINGULARITY_ROLE_ID:', SINGULARITY_ROLE_ID);
        hasSingularityRole = member.roles?.includes(SINGULARITY_ROLE_ID) || false;
        console.log('hasSingularityRole:', hasSingularityRole);
      } else {
        console.log('Guild member fetch failed:', await guildMemberResponse.text());
      }
    }

    // Determine tier based on SINGULARITY role
    const tier = hasSingularityRole ? 'operator' : 'recovery';
    console.log('Final tier assigned:', tier);

    // Check if user exists in DB (by discord_id OR email)
    const existingUser = await query(
      'SELECT id, email, tier, discord_id FROM users WHERE discord_id = $1 OR email = $2',
      [discordUser.id, discordUser.email]
    );

    let userId: string;
    let userEmail = discordUser.email;
    let currentTier = tier; // Start with calculated tier

    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      
      // Link Discord if not already linked
      if (!existingUser.rows[0].discord_id) {
        await query(
          'UPDATE users SET discord_id = $1, discord_username = $2, updated_at = NOW() WHERE id = $3',
          [discordUser.id, discordUser.username, userId]
        );
        console.log('Linked Discord to existing user:', userId);
      }
      
      // SINGULARITY role = upgrade to operator
      if (hasSingularityRole && existingUser.rows[0].tier !== 'operator' && existingUser.rows[0].tier !== 'partner') {
        await query(
          'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
          ['operator', userId]
        );
        currentTier = 'operator';
        console.log('Upgraded user to operator via SINGULARITY role');
      } else {
        // Keep existing tier if higher
        currentTier = existingUser.rows[0].tier;
      }
    } else {
      // Create new user (password_hash set to 'oauth' placeholder for OAuth users)
      const result = await query(
        `INSERT INTO users (email, password_hash, discord_id, discord_username, tier, risk_profile, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'moderate', NOW(), NOW())
         RETURNING id`,
        [discordUser.email || `${discordUser.id}@discord.user`, 'OAUTH_USER_NO_PASSWORD', discordUser.id, discordUser.username, tier]
      );
      userId = result.rows[0].id;
      console.log('Created new Discord user:', userId, 'with tier:', tier);
    }

    // Generate JWT with actual tier (may have been preserved from existing user)
    const token = jwt.sign(
      {
        userId,
        email: userEmail,
        discordId: discordUser.id,
        tier: currentTier,
        hasSingularity: hasSingularityRole,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Generated JWT with tier:', currentTier);

    // Check if user needs onboarding (new user created this session OR never completed onboarding)
    const userProfileResult = await query(
      'SELECT risk_profile, onboarding_completed, created_at FROM users WHERE id = $1',
      [userId]
    );
    const profile = userProfileResult.rows[0];
    // Needs onboarding if: explicitly not completed, OR created in last 30 seconds (new signup)
    const isNewUser = profile?.created_at && (Date.now() - new Date(profile.created_at).getTime() < 30000);
    const needsOnboarding = profile?.onboarding_completed === false || isNewUser;
    
    // Redirect to onboarding or dashboard
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cortexcapitalgroup.com';
    const redirectPath = needsOnboarding ? '/onboarding' : '/dashboard';
    const redirectUrl = new URL(redirectPath, baseUrl);
    console.log('Redirecting to:', redirectPath, 'isNewUser:', isNewUser, 'onboarding_completed:', profile?.onboarding_completed);
    
    // Set token in cookie (use 'cortex_token' to match middleware check)
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('cortex_token', token, {
      httpOnly: false, // Allow JS access for auth header
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
