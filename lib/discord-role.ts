/**
 * lib/discord-role.ts
 *
 * Utilities for checking Discord guild membership / role assignment.
 * Used by Helios access gating.
 */

export const HELIOS_ROLE_ID = '1440026585053794465';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1354693841978134598';
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

/**
 * Check whether a Discord user holds the Helios role.
 *
 * Prefers bot-token approach (more reliable, no user scope expiry issues).
 * Falls back to user OAuth Bearer token if bot token is not configured.
 *
 * @param discordUserId  - The user's Discord snowflake ID
 * @param accessToken    - The user's Discord OAuth access_token (Bearer)
 * @returns              - true if the user holds HELIOS_ROLE_ID
 */
export async function checkHeliosRole(
  discordUserId: string,
  accessToken?: string | null
): Promise<boolean> {
  if (DISCORD_BOT_TOKEN) {
    return checkRoleWithBot(discordUserId);
  }

  if (accessToken) {
    return checkRoleWithUserToken(accessToken);
  }

  console.warn('[discord-role] No bot token or access token available for role check');
  return false;
}

/**
 * Check via Bot token — preferred method.
 * Requires DISCORD_BOT_TOKEN env var and the bot to be in the guild.
 */
async function checkRoleWithBot(discordUserId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        // Timeout: 5s
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.status === 404) {
      // User is not in the guild
      return false;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error('[discord-role] Bot member fetch failed:', res.status, text);
      return false;
    }

    const member = await res.json();
    const hasRole = (member.roles as string[])?.includes(HELIOS_ROLE_ID) ?? false;
    console.log(`[discord-role] Bot check for ${discordUserId}: hasHeliosRole=${hasRole}`);
    return hasRole;
  } catch (err: any) {
    console.error('[discord-role] Bot check error:', err?.message);
    return false;
  }
}

/**
 * Check via user OAuth Bearer token.
 * Requires guilds.members.read scope (already requested in Discord OAuth flow).
 */
async function checkRoleWithUserToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.status === 404 || res.status === 403) {
      // Not in guild or no access
      return false;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error('[discord-role] User token member fetch failed:', res.status, text);
      return false;
    }

    const member = await res.json();
    const hasRole = (member.roles as string[])?.includes(HELIOS_ROLE_ID) ?? false;
    console.log(`[discord-role] User token check: hasHeliosRole=${hasRole}`);
    return hasRole;
  } catch (err: any) {
    console.error('[discord-role] User token check error:', err?.message);
    return false;
  }
}
