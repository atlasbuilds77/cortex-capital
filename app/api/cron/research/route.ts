export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getFullResearchContext } from '@/lib/agents/data/research-engine';
import { listAccounts, getPositions } from '@/lib/integrations/snaptrade';

const ET_TIMEZONE = 'America/New_York';

const SECTOR_SYMBOLS: Record<string, string[]> = {
  Technology: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
  Healthcare: ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK'],
  Financials: ['JPM', 'BAC', 'GS', 'MS', 'WFC'],
  Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
  Consumer: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
  Utilities: ['NEE', 'DUK', 'SO', 'AEP', 'EXC'],
  Communications: ['GOOGL', 'META', 'NFLX', 'DIS', 'T'],
  Industrials: ['CAT', 'GE', 'DE', 'BA', 'HON'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG'],
  Materials: ['LIN', 'APD', 'SHW', 'ECL', 'NEM'],
};

const EXCLUSION_SYMBOLS: Record<string, string[]> = {
  Tobacco: ['MO', 'PM', 'BTI', 'IMBBY'],
  Weapons: ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
  Gambling: ['MGM', 'WYNN', 'LVS', 'CZR', 'DKNG', 'PENN'],
  'Fossil fuels': ['XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL'],
  'Private prisons': ['GEO', 'CXW'],
};

function toEtDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseStringArray(parsed);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeSymbols(symbols: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function defaultSectorsForRisk(riskProfile: string): string[] {
  switch ((riskProfile || '').toLowerCase()) {
    case 'conservative':
      return ['Healthcare', 'Utilities', 'Financials'];
    case 'aggressive':
      return ['Technology', 'Communications', 'Consumer'];
    case 'ultra_aggressive':
      return ['Technology', 'Consumer', 'Energy', 'Communications'];
    default:
      return ['Technology', 'Healthcare', 'Financials'];
  }
}

function personalizeAllowedSymbols(
  allowedSymbols: string[],
  sectors: string[],
  exclusions: string[],
  riskProfile: string
): string[] {
  const blocked = new Set<string>();
  for (const exclusion of exclusions) {
    for (const symbol of EXCLUSION_SYMBOLS[exclusion] || []) {
      blocked.add(symbol.toUpperCase());
    }
  }

  const sectorDerived: string[] = [];
  for (const sector of sectors) {
    sectorDerived.push(...(SECTOR_SYMBOLS[sector] || []));
  }

  const merged = normalizeSymbols([...allowedSymbols, ...sectorDerived]).filter((s) => !blocked.has(s));
  const cap =
    riskProfile === 'conservative' ? 4 :
    riskProfile === 'ultra_aggressive' ? 10 :
    riskProfile === 'aggressive' ? 8 : 6;

  return merged.slice(0, cap);
}

/**
 * RESEARCH CRON
 *
 * For each user with a broker connected:
 * 1. Load preferences + positions
 * 2. Generate personalized research context
 * 3. Store one RESEARCH memory per user/day (ET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = cronSecret && (
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret
  );

  if (cronSecret && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: { userId: string; success: boolean; error?: string }[] = [];

  try {
    const usersResult = await query(`
      SELECT
        u.id,
        u.email,
        u.risk_profile,
        u.exclusions,
        u.snaptrade_user_id,
        u.snaptrade_user_secret,
        u.selected_snaptrade_account,
        u.sector_interests,
        u.allowed_symbols
      FROM users u
      WHERE u.snaptrade_user_id IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM broker_credentials bc
           WHERE bc.user_id = u.id
             AND bc.is_active = true
         )
         OR EXISTS (
           SELECT 1
           FROM brokerage_connections bcx
           WHERE bcx.user_id = u.id
         )
    `);

    console.log(`[Research Cron] Processing ${usersResult.rows.length} users`);

    for (const user of usersResult.rows) {
      try {
        let positionSymbols: string[] = [];

        if (user.snaptrade_user_id && user.snaptrade_user_secret) {
          try {
            const accounts = await listAccounts(user.snaptrade_user_id, user.snaptrade_user_secret);
            const accountId = user.selected_snaptrade_account || accounts[0]?.id;

            if (accountId) {
              const positions = await getPositions(user.snaptrade_user_id, user.snaptrade_user_secret, accountId);
              positionSymbols = positions
                .map((p: any) => {
                  const raw = typeof p.symbol === 'string'
                    ? p.symbol
                    : (p.symbol?.symbol || p.symbol?.ticker || 'UNKNOWN');
                  return typeof raw === 'string' ? raw.toUpperCase() : 'UNKNOWN';
                })
                .filter((s: string) => s !== 'UNKNOWN');
            }
          } catch (snapErr: any) {
            console.warn(
              `[Research Cron] SnapTrade positions unavailable for ${user.email}: ${snapErr?.message || snapErr}`
            );
          }
        }

        const riskProfile = String(user.risk_profile || 'moderate').toLowerCase();
        const exclusions = parseStringArray(user.exclusions);
        const parsedSectors = parseStringArray(user.sector_interests);
        const userSectors = parsedSectors.length > 0 ? parsedSectors : defaultSectorsForRisk(riskProfile);
        const rawAllowedSymbols = parseStringArray(user.allowed_symbols);
        const allowedSymbols = personalizeAllowedSymbols(rawAllowedSymbols, userSectors, exclusions, riskProfile);

        const researchContext = await getFullResearchContext(
          userSectors,
          positionSymbols,
          allowedSymbols,
          {
            riskProfile,
            exclusions,
            userTag: String(user.id).slice(0, 8),
          }
        );

        const todayEt = toEtDateString(new Date());
        const researchPayload = {
          text: researchContext,
          date: todayEt,
          riskProfile,
          positionsAnalyzed: positionSymbols.length,
          sectorsAnalyzed: userSectors.length,
          allowedSymbolsCount: allowedSymbols.length,
          exclusionsCount: exclusions.length,
          sectors: userSectors,
          allowedSymbols,
          exclusions,
        };

        await query(`
          DELETE FROM agent_memories
          WHERE user_id = $1
            AND agent_name = 'RESEARCH'
            AND memory_type = 'insight'
            AND (created_at AT TIME ZONE 'US/Eastern')::date = $2::date
        `, [user.id, todayEt]);

        await query(`
          INSERT INTO agent_memories (agent_name, user_id, memory_type, content, created_at)
          VALUES ('RESEARCH', $1, 'insight', $2::jsonb, NOW())
        `, [
          user.id,
          JSON.stringify(researchPayload),
        ]);

        results.push({ userId: user.id, success: true });
        console.log(
          `[Research Cron] ✅ ${user.email} - sectors=${userSectors.length}, allowed=${allowedSymbols.length}, positions=${positionSymbols.length}`
        );
      } catch (error: any) {
        console.error(`[Research Cron] ❌ ${user.email}:`, error.message);
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    const duration = Date.now() - startTime;
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      totalUsers: usersResult.rows.length,
      succeeded,
      failed,
      durationMs: duration,
    });
  } catch (error: any) {
    console.error('[Research Cron] Fatal error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
