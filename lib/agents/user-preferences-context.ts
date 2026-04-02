/**
 * USER PREFERENCES CONTEXT FOR AGENTS
 * 
 * Converts user preferences into agent-readable context.
 * Ensures agents respect goals, exclusions, and risk tolerance.
 */

import { query } from '../db';

export interface UserPreferences {
  userId: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';
  tradingGoals: string[];
  sectorInterests: string[];
  exclusions: string[];
  enabledAgents: Record<string, boolean>;
  tier: string;
  allowedSymbols: string[];
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const raw = value.trim();

    // PostgreSQL array literal support: {AAPL,MSFT} or {"AAPL","MSFT"}
    if (raw.startsWith('{') && raw.endsWith('}')) {
      const inner = raw.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(',')
        .map((item) => item.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseStringArray(parsed);
      }
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseEnabledAgents(value: unknown): Record<string, boolean> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, boolean>;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
    } catch {
      // Ignore malformed legacy payload.
    }
  }
  return {};
}

/**
 * Load user preferences from database
 */
export async function loadUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const result = await query(
      `SELECT 
        id,
        risk_profile,
        trading_goals,
        sector_interests,
        exclusions,
        enabled_agents,
        tier,
        allowed_symbols
      FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.id,
      riskProfile: row.risk_profile || 'moderate',
      tradingGoals: parseStringArray(row.trading_goals),
      sectorInterests: parseStringArray(row.sector_interests),
      exclusions: parseStringArray(row.exclusions),
      enabledAgents: parseEnabledAgents(row.enabled_agents),
      tier: row.tier || 'free',
      allowedSymbols: parseStringArray(row.allowed_symbols),
    };
  } catch (error) {
    console.error('[UserPreferences] Failed to load:', error);
    return null;
  }
}

/**
 * Generate agent context based on user preferences
 * Uses smart defaults when user hasn't set specific preferences
 */
export function generatePreferencesContext(prefs: UserPreferences): string {
  const sections: string[] = [];

  // Risk Profile Section
  sections.push(`RISK PROFILE: ${prefs.riskProfile.toUpperCase()}`);

  // Apply smart defaults based on risk profile if no specific goals set
  if (prefs.tradingGoals.length === 0) {
    const defaultGoals: Record<string, string[]> = {
      conservative: ['Capital preservation', 'Income generation'],
      moderate: ['Long-term growth', 'Capital preservation'],
      aggressive: ['Long-term growth', 'Sector exposure'],
      ultra_aggressive: ['Long-term growth', 'Sector exposure'],
    };
    prefs.tradingGoals = defaultGoals[prefs.riskProfile] || defaultGoals.moderate;
  }

  if (prefs.sectorInterests.length === 0) {
    // Default to broad market exposure
    prefs.sectorInterests = ['Technology', 'Healthcare', 'Financials'];
  }
  
  const riskGuidance: Record<string, string> = {
    conservative: `
- Prioritize capital preservation above all
- Maximum position size: 3% of portfolio
- Prefer dividend-paying stocks and bonds
- Avoid speculative plays, options, and high-beta stocks
- Stop losses mandatory at -5%
- Cash allocation should be 20-40%

OPTIONS: Not recommended for this risk profile`,
    moderate: `
- Balance growth and preservation
- Maximum position size: 5% of portfolio  
- Mix of growth and value stocks acceptable
- Limited options exposure (covered calls, protective puts)
- Stop losses at -10%
- Cash allocation 10-20%

OPTIONS RULES (if enabled):
- LEAPS only (6+ months expiry) with 0.70+ delta
- Max 5% of portfolio in options
- Stop loss at -35% (options decay differently)
- No weeklies or 0DTE`,
    aggressive: `
- Growth-focused, higher volatility acceptable
- Maximum position size: 10% of portfolio
- Growth stocks, momentum plays encouraged
- Options strategies allowed
- Stop losses at -15%
- Cash allocation 5-15%

OPTIONS RULES:
- LEAPS preferred (0.60-0.80 delta, 6+ months)
- Monthly options OK (30+ DTE, 0.50+ delta)
- Max 15% of portfolio in options
- Stop loss at -35% for options
- Roll at 21 DTE or take profits at +50%`,
    ultra_aggressive: `
- Maximum growth, high risk tolerance
- Position sizes up to 15% acceptable
- Concentrated bets, momentum, and options welcome
- Leveraged positions considered
- Wider stop losses at -20%
- Cash allocation can be minimal

OPTIONS RULES:
- MINIMUM 2 weeks to expiry (no weeklies, no 0DTE)
- Bi-weekly or monthly options for day trading
- LEAPS for swing positions (6 months - 2 years preferred)
- Delta range: 0.30-0.80 based on conviction
- Max 30% of portfolio in options
- Stop loss at -50% for options (high conviction plays)
- Scale out: +30% sell 1/3, +50% sell 1/2, +100% sell rest`,
  };
  
  sections.push(riskGuidance[prefs.riskProfile] || riskGuidance.moderate);

  // Trading Goals Section
  if (prefs.tradingGoals.length > 0) {
    sections.push(`\nTRADING GOALS:`);
    
    const goalGuidance: Record<string, string> = {
      'Long-term growth': '- Focus on companies with strong revenue growth and market position',
      'Income generation': '- Prioritize dividend yields >2%, REITs, and covered call strategies',
      'Capital preservation': '- Defensive sectors, low beta, quality over growth',
      'Tax optimization': '- Consider holding periods, harvest losses, prefer qualified dividends',
      'Sector exposure': '- Align recommendations with user\'s sector interests below',
      'Hedge positions': '- Include protective strategies, inverse ETFs, or puts for downside protection',
    };

    for (const goal of prefs.tradingGoals) {
      const guidance = goalGuidance[goal];
      if (guidance) {
        sections.push(guidance);
      } else {
        sections.push(`- ${goal}`);
      }
    }
  }

  // Sector Interests
  if (prefs.sectorInterests.length > 0) {
    sections.push(`\nSECTOR FOCUS: ${prefs.sectorInterests.join(', ')}`);
    sections.push('Prioritize opportunities in these sectors when making recommendations.');
  }

  // EXCLUSIONS - Critical for compliance
  if (prefs.exclusions.length > 0) {
    sections.push(`\n⛔ EXCLUSIONS (DO NOT RECOMMEND):`);
    
    const exclusionTickers: Record<string, string[]> = {
      'Tobacco': ['MO', 'PM', 'BTI', 'IMBBY'],
      'Weapons': ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
      'Gambling': ['MGM', 'WYNN', 'LVS', 'CZR', 'DKNG', 'PENN'],
      'Fossil fuels': ['XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL'],
      'Private prisons': ['GEO', 'CXW'],
      'Animal testing': ['Avoid cosmetics/pharma with animal testing controversies'],
    };

    for (const exclusion of prefs.exclusions) {
      const tickers = exclusionTickers[exclusion];
      if (tickers) {
        sections.push(`- ${exclusion}: NEVER recommend ${tickers.join(', ')}`);
      } else {
        sections.push(`- ${exclusion}: Avoid this category`);
      }
    }
    
    sections.push('\nThese exclusions are NON-NEGOTIABLE. Do not recommend these under any circumstances.');
  }

  return sections.join('\n');
}

/**
 * Check if a symbol is excluded for a user
 */
export function isSymbolExcluded(symbol: string, prefs: UserPreferences): boolean {
  const exclusionTickers: Record<string, string[]> = {
    'Tobacco': ['MO', 'PM', 'BTI', 'IMBBY'],
    'Weapons': ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
    'Gambling': ['MGM', 'WYNN', 'LVS', 'CZR', 'DKNG', 'PENN'],
    'Fossil fuels': ['XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL'],
    'Private prisons': ['GEO', 'CXW'],
  };

  for (const exclusion of prefs.exclusions) {
    const tickers = exclusionTickers[exclusion] || [];
    if (tickers.includes(symbol.toUpperCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Get position sizing guidance based on risk profile
 */
export function getPositionSizeGuidance(prefs: UserPreferences, portfolioValue: number): {
  maxPositionPct: number;
  maxPositionDollars: number;
  stopLossPct: number;
} {
  const sizing: Record<string, { maxPct: number; stopLoss: number }> = {
    conservative: { maxPct: 3, stopLoss: 5 },
    moderate: { maxPct: 5, stopLoss: 10 },
    aggressive: { maxPct: 10, stopLoss: 15 },
    ultra_aggressive: { maxPct: 15, stopLoss: 20 },
  };

  const config = sizing[prefs.riskProfile] || sizing.moderate;
  
  return {
    maxPositionPct: config.maxPct,
    maxPositionDollars: portfolioValue * (config.maxPct / 100),
    stopLossPct: config.stopLoss,
  };
}

export default {
  loadUserPreferences,
  generatePreferencesContext,
  isSymbolExcluded,
  getPositionSizeGuidance,
};
