/**
 * PORTFOLIO CONTEXT BUILDER
 * Combines user profile + current positions for agent discussions
 */

import { Pool } from 'pg';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'recovery' | 'scout' | 'operator' | 'partner';
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';
  goals: string[];
  preferredSectors: string[];
  excludedSectors: string[];
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  assetType: 'stock' | 'etf' | 'option' | 'future';
}

export interface PortfolioSnapshot {
  user: UserProfile;
  totalValue: number;
  cash: number;
  positions: Position[];
  sectorExposure: Record<string, number>;
  pnlYTD: number;
  pnlYTDPct: number;
}

export interface AgentContext {
  userName: string;
  tier: string;
  riskProfile: string;
  goals: string[];
  totalValue: number;
  cash: number;
  positionsCount: number;
  topHoldings: Array<{ symbol: string; weight: number; pnl: number }>;
  sectorBreakdown: Record<string, number>;
  performance: {
    ytd: number;
    ytdPct: number;
  };
  alerts: string[];
}

/**
 * Fetch user's complete portfolio context
 */
export async function getPortfolioContext(
  userId: string,
  db: Pool
): Promise<PortfolioSnapshot | null> {
  try {
    // 1. Get user profile
    const userResult = await db.query(
      `SELECT 
        id, email, tier, risk_profile
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const userRow = userResult.rows[0];

    // 2. Get user's connected broker credentials
    const credsResult = await db.query(
      `SELECT broker_type, account_id 
       FROM broker_credentials 
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (credsResult.rows.length === 0) {
      // User hasn't connected a broker yet
      return {
        user: {
          id: userRow.id,
          name: userRow.name,
          email: userRow.email,
          tier: userRow.tier,
          riskProfile: userRow.risk_profile,
          goals: userRow.goals || [],
          preferredSectors: userRow.preferred_sectors || [],
          excludedSectors: userRow.excluded_sectors || [],
        },
        totalValue: 0,
        cash: 0,
        positions: [],
        sectorExposure: {},
        pnlYTD: 0,
        pnlYTDPct: 0,
      };
    }

    // 3. Fetch positions from broker
    const { fetchUserPositions, calculateSectorExposure, calculateYTDPnL } = await import(
      './services/position-fetcher'
    );

    const brokerData = await fetchUserPositions(userId, db);

    const user: UserProfile = {
      id: userRow.id,
      name: userRow.email.split('@')[0], // Use email prefix as name
      email: userRow.email,
      tier: userRow.tier,
      riskProfile: userRow.risk_profile,
      goals: [],
      preferredSectors: [],
      excludedSectors: [],
    };

    if (!brokerData) {
      // No broker connected or fetch failed
      return {
        user,
        totalValue: 0,
        cash: 0,
        positions: [],
        sectorExposure: {},
        pnlYTD: 0,
        pnlYTDPct: 0,
      };
    }

    const { positions, balance } = brokerData;
    const sectorExposure = calculateSectorExposure(positions, balance.portfolioValue);
    const ytdPnL = calculateYTDPnL(positions);

    return {
      user,
      totalValue: balance.portfolioValue,
      cash: balance.cash,
      positions,
      sectorExposure,
      pnlYTD: ytdPnL.pnl,
      pnlYTDPct: ytdPnL.pnlPct,
    };
  } catch (error: any) {
    console.error('Failed to fetch portfolio context:', error);
    return null;
  }
}

/**
 * Build agent-friendly context from portfolio snapshot
 */
export function buildAgentContext(snapshot: PortfolioSnapshot): AgentContext {
  const topHoldings = snapshot.positions
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      weight: (p.marketValue / snapshot.totalValue) * 100,
      pnl: p.unrealizedPnLPct,
    }));

  const alerts: string[] = [];

  // Check for concentrated positions
  topHoldings.forEach((holding) => {
    if (holding.weight > 25) {
      alerts.push(`⚠️ ${holding.symbol} is ${holding.weight.toFixed(1)}% of portfolio (concentrated)`);
    }
  });

  // Check for sector concentration
  Object.entries(snapshot.sectorExposure).forEach(([sector, weight]) => {
    if (weight > 40) {
      alerts.push(`⚠️ ${sector} sector is ${weight.toFixed(1)}% of portfolio (concentrated)`);
    }
  });

  return {
    userName: snapshot.user.name,
    tier: snapshot.user.tier,
    riskProfile: snapshot.user.riskProfile,
    goals: snapshot.user.goals,
    totalValue: snapshot.totalValue,
    cash: snapshot.cash,
    positionsCount: snapshot.positions.length,
    topHoldings,
    sectorBreakdown: snapshot.sectorExposure,
    performance: {
      ytd: snapshot.pnlYTD,
      ytdPct: snapshot.pnlYTDPct,
    },
    alerts,
  };
}
