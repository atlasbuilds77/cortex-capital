/**
 * USER UNIVERSE - Database-backed Per-User Agent Instances
 * 
 * CRITICAL: All queries use user_id to prevent context bleeding between users.
 * Each user gets their own isolated "universe" of agents with:
 * - Memory (what agents have discussed with THIS user only)
 * - Trade history (trades made for THIS user only)
 * - Preferences (learned from THIS user only)
 * - Personality overrides (Partner tier customization)
 * 
 * NO FILESYSTEM STORAGE - everything in PostgreSQL for persistence.
 */

import { query } from '@/lib/db';

// Agent IDs that exist in each universe
const AGENT_IDS = [
  'ANALYST',
  'STRATEGIST', 
  'DAY_TRADER',
  'MOMENTUM',
  'RISK',
  'EXECUTOR',
  'REPORTER',
  'OPTIONS_STRATEGIST',
  'VALUE',
  'GROWTH',
] as const;

type AgentId = typeof AGENT_IDS[number];

interface AgentMemory {
  type: string;
  content: string;
  timestamp: string;
}

interface TradeRecord {
  symbol: string;
  direction: 'long' | 'short';
  entry: number;
  exit?: number;
  outcome?: 'win' | 'loss' | 'pending';
  pnl?: number;
  timestamp: string;
}

interface UserPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  sectors: string[];
  tradingStyle: string;
}

interface UserUniverse {
  userId: string;
  agentMemories: Record<string, AgentMemory[]>;
  tradeHistory: TradeRecord[];
  preferences: UserPreferences;
  personalityOverrides: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  riskTolerance: 'moderate',
  sectors: [],
  tradingStyle: 'balanced',
};

/**
 * Ensure a universe row exists for the user.
 * Safe idempotent upsert to avoid runtime reference errors in context loading paths.
 */
async function ensureUserUniverse(userId: string): Promise<void> {
  await query(
    `INSERT INTO user_universes (user_id, agent_memories, trade_history, preferences, personality_overrides)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      userId,
      JSON.stringify({}),
      JSON.stringify([]),
      JSON.stringify(DEFAULT_PREFERENCES),
      JSON.stringify({}),
    ]
  );
}

/**
 * Get or create a user's universe
 * ISOLATED: Only returns data for the specified user_id
 */
export async function getUserUniverse(userId: string): Promise<UserUniverse> {
  try {
    // Try to fetch existing
    const result = await query(
      `SELECT 
        user_id,
        agent_memories,
        trade_history,
        preferences,
        personality_overrides,
        created_at,
        updated_at
      FROM user_universes 
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        userId: row.user_id,
        agentMemories: row.agent_memories || {},
        tradeHistory: row.trade_history || [],
        preferences: row.preferences || DEFAULT_PREFERENCES,
        personalityOverrides: row.personality_overrides || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    // Create new universe for this user
    const insertResult = await query(
      `INSERT INTO user_universes (user_id, agent_memories, trade_history, preferences, personality_overrides)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING created_at, updated_at`,
      [
        userId,
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify(DEFAULT_PREFERENCES),
        JSON.stringify({}),
      ]
    );

    return {
      userId,
      agentMemories: {},
      tradeHistory: [],
      preferences: DEFAULT_PREFERENCES,
      personalityOverrides: {},
      createdAt: insertResult.rows[0]?.created_at || new Date().toISOString(),
      updatedAt: insertResult.rows[0]?.updated_at || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[UserUniverse] Failed to get/create universe:', error.message);
    // Return empty universe on error (don't leak other users' data)
    return {
      userId,
      agentMemories: {},
      tradeHistory: [],
      preferences: DEFAULT_PREFERENCES,
      personalityOverrides: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save/update a user's universe
 * ISOLATED: Only updates the specified user's universe
 */
export async function saveUserUniverse(universe: UserUniverse): Promise<void> {
  try {
    await query(
      `INSERT INTO user_universes (user_id, agent_memories, trade_history, preferences, personality_overrides, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         agent_memories = EXCLUDED.agent_memories,
         trade_history = EXCLUDED.trade_history,
         preferences = EXCLUDED.preferences,
         personality_overrides = EXCLUDED.personality_overrides,
         updated_at = NOW()`,
      [
        universe.userId,
        JSON.stringify(universe.agentMemories),
        JSON.stringify(universe.tradeHistory),
        JSON.stringify(universe.preferences),
        JSON.stringify(universe.personalityOverrides),
      ]
    );
  } catch (error: any) {
    console.error('[UserUniverse] Failed to save universe:', error.message);
  }
}

/**
 * Add a memory to an agent for a specific user
 * ISOLATED: Only modifies the specified user's agent memory
 */
export async function addAgentMemory(
  userId: string,
  agentId: string,
  memory: { type: string; content: string }
): Promise<void> {
  try {
    const newMemory: AgentMemory = {
      ...memory,
      timestamp: new Date().toISOString(),
    };

    // Upsert: create universe if doesn't exist, then append memory
    // Uses JSONB operations to safely append to the specific agent's array
    await query(
      `INSERT INTO user_universes (user_id, agent_memories)
       VALUES ($1, jsonb_build_object($2, jsonb_build_array($3::jsonb)))
       ON CONFLICT (user_id) DO UPDATE SET
         agent_memories = CASE
           WHEN user_universes.agent_memories ? $2 THEN
             jsonb_set(
               user_universes.agent_memories,
               ARRAY[$2],
               (
                 SELECT jsonb_agg(elem)
                 FROM (
                   SELECT elem FROM jsonb_array_elements(user_universes.agent_memories->$2) elem
                   UNION ALL
                   SELECT $3::jsonb
                   ORDER BY elem->>'timestamp' DESC
                   LIMIT 50
                 ) sub
               )
             )
           ELSE
             user_universes.agent_memories || jsonb_build_object($2, jsonb_build_array($3::jsonb))
         END`,
      [userId, agentId, JSON.stringify(newMemory)]
    );
  } catch (error: any) {
    console.error('[UserUniverse] Failed to add agent memory:', error.message);
  }
}

/**
 * Get an agent's memories for a specific user
 * ISOLATED: Only returns memories from this user's universe
 */
export async function getAgentMemories(
  userId: string,
  agentId: string,
  limit = 10
): Promise<AgentMemory[]> {
  try {
    const result = await query(
      `SELECT agent_memories->$2 as memories
       FROM user_universes 
       WHERE user_id = $1`,
      [userId, agentId]
    );

    const memories = result.rows[0]?.memories || [];
    return memories.slice(-limit);
  } catch (error: any) {
    console.error('[UserUniverse] Failed to get agent memories:', error.message);
    return [];
  }
}

/**
 * Get context string for an agent when responding to a specific user
 * ISOLATED: Only includes information from this user's universe
 */
export async function getUserAgentContext(
  userId: string,
  agentId: string
): Promise<string> {
  try {
    // Ensure universe exists before loading
    await ensureUserUniverse(userId);
    const universe = await getUserUniverse(userId);
    
    const memories = universe.agentMemories[agentId] || [];
    const recentMemories = memories.slice(-5);
    
    let context = '';
    
    // Add user preferences
    if (universe.preferences.riskTolerance) {
      context += `This client's risk tolerance: ${universe.preferences.riskTolerance}. `;
    }
    
    if (universe.preferences.sectors.length > 0) {
      context += `This client's sector interests: ${universe.preferences.sectors.join(', ')}. `;
    }

    if (universe.preferences.tradingStyle) {
      context += `This client's trading style: ${universe.preferences.tradingStyle}. `;
    }

    // Add recent memories with this user
    if (recentMemories.length > 0) {
      context += `\n\nYour recent interactions with THIS CLIENT:\n`;
      recentMemories.forEach(m => {
        context += `- [${m.timestamp}] ${m.content}\n`;
      });
    }

    // Add recent trade history for this user
    if (universe.tradeHistory.length > 0) {
      const lastTrades = universe.tradeHistory.slice(-5);
      context += `\n\nRecent trades you've made for THIS CLIENT:\n`;
      lastTrades.forEach(t => {
        const outcomeStr = t.outcome ? ` (${t.outcome}${t.pnl ? `, $${t.pnl.toFixed(2)}` : ''})` : ' (pending)';
        context += `- ${t.symbol} ${t.direction} @ $${t.entry}${outcomeStr}\n`;
      });
    }

    // Partner tier personality overrides
    if (universe.personalityOverrides[agentId]) {
      context += `\n\nCustom personality tuning for this client: ${universe.personalityOverrides[agentId]}`;
    }

    return context;
  } catch (error: any) {
    console.error('[UserUniverse] Failed to get agent context:', error.message);
    console.error('[UserUniverse] Stack:', error.stack);
    return '';
  }
}

/**
 * Log a trade in the user's universe
 * ISOLATED: Only adds to this user's trade history
 */
export async function logUserTrade(
  userId: string,
  trade: Omit<TradeRecord, 'timestamp'>
): Promise<void> {
  try {
    const newTrade: TradeRecord = {
      ...trade,
      timestamp: new Date().toISOString(),
    };

    // Append trade and keep last 100
    await query(
      `INSERT INTO user_universes (user_id, trade_history)
       VALUES ($1, jsonb_build_array($2::jsonb))
       ON CONFLICT (user_id) DO UPDATE SET
         trade_history = (
           SELECT jsonb_agg(elem)
           FROM (
             SELECT elem FROM jsonb_array_elements(user_universes.trade_history) elem
             UNION ALL
             SELECT $2::jsonb
             ORDER BY elem->>'timestamp' DESC
             LIMIT 100
           ) sub
         )`,
      [userId, JSON.stringify(newTrade)]
    );
  } catch (error: any) {
    console.error('[UserUniverse] Failed to log trade:', error.message);
  }
}

/**
 * Backward-compatible alias used by older broker abstraction paths.
 */
export async function addTradeToHistory(
  userId: string,
  trade: Omit<TradeRecord, 'timestamp'>
): Promise<void> {
  await logUserTrade(userId, trade);
}

/**
 * Update user preferences
 * ISOLATED: Only updates this user's preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    const universe = await getUserUniverse(userId);
    const updatedPrefs = { ...universe.preferences, ...preferences };

    await query(
      `UPDATE user_universes 
       SET preferences = $2
       WHERE user_id = $1`,
      [userId, JSON.stringify(updatedPrefs)]
    );
  } catch (error: any) {
    console.error('[UserUniverse] Failed to update preferences:', error.message);
  }
}

/**
 * Set personality override for an agent (Partner tier only)
 * ISOLATED: Only affects this user's agents
 */
export async function setAgentPersonality(
  userId: string,
  agentId: string,
  override: string
): Promise<boolean> {
  try {
    // Verify user is Partner tier
    const tierResult = await query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId]
    );

    if (tierResult.rows[0]?.subscription_tier !== 'partner') {
      return false; // Only partner tier can customize
    }

    await query(
      `UPDATE user_universes 
       SET personality_overrides = personality_overrides || jsonb_build_object($2, $3)
       WHERE user_id = $1`,
      [userId, agentId, override]
    );

    return true;
  } catch (error: any) {
    console.error('[UserUniverse] Failed to set personality:', error.message);
    return false;
  }
}

/**
 * Clear a user's universe (for account deletion or reset)
 * ISOLATED: Only deletes this user's data
 */
export async function clearUserUniverse(userId: string): Promise<void> {
  try {
    await query(
      `DELETE FROM user_universes WHERE user_id = $1`,
      [userId]
    );
  } catch (error: any) {
    console.error('[UserUniverse] Failed to clear universe:', error.message);
  }
}

// Export for use in agents
export { AGENT_IDS };
export type { AgentId, AgentMemory, TradeRecord, UserPreferences, UserUniverse };
