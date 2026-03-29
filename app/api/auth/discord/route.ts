export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1429327930005262337';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://cortexcapitalgroup.com/api/auth/discord/callback';

// Discord OAuth2 authorization URL
export async function GET(request: NextRequest) {
  const scope = 'identify email guilds.members.read';
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope,
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  
  return NextResponse.redirect(discordAuthUrl);
}
