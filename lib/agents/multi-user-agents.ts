/**
 * MULTI-USER AGENT MANAGER
 * 
 * Wraps all agent systems (relationships, memory, phone booth, trade pipeline)
 * with per-user scoping. Each user gets their own universe.
 * 
 * Uses the DB tables from migration 011 when available,
 * falls back to JSON files for development.
 */

import { getPool } from '../db';
import { getUserUniverse, saveUserUniverse, addAgentMemory, getUserAgentContext } from './user-universe-db';

const AGENTS = ['ANALYST', 'STRATEGIST', 'DAY_TRADER', 'MOMENTUM', 'RISK', 'EXECUTOR', 'REPORTER'];

// ============================================
// PER-USER RELATIONSHIPS (DB-backed)
// ============================================

export async function getUserRelationships(userId: string) {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT agent_a, agent_b, score, interactions, updated_at 
       FROM agent_relationships WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize relationships for new user
      await initUserRelationships(userId);
      return getDefaultMatrix();
    }

    return result.rows;
  } catch {
    // Fallback to default if DB not available
    return getDefaultMatrix();
  }
}

export async function initUserRelationships(userId: string) {
  try {
    const db = getPool();
    const pairs: { a: string; b: string }[] = [];
    
    for (let i = 0; i < AGENTS.length; i++) {
      for (let j = i + 1; j < AGENTS.length; j++) {
        pairs.push({ a: AGENTS[i], b: AGENTS[j] });
      }
    }

    // Batch insert
    const values = pairs.map((p, i) => 
      `($1, $${i * 2 + 2}, $${i * 2 + 3}, 50, 0)`
    ).join(', ');
    
    const params: any[] = [userId];
    pairs.forEach(p => { params.push(p.a, p.b); });

    // Use individual inserts for simplicity
    for (const pair of pairs) {
      await db.query(
        `INSERT INTO agent_relationships (user_id, agent_a, agent_b, score, interactions)
         VALUES ($1, $2, $3, 50, 0)
         ON CONFLICT DO NOTHING`,
        [userId, pair.a, pair.b]
      );
    }
  } catch (error: any) {
    console.error('Failed to init user relationships:', error.message);
  }
}

export async function updateUserRelationship(
  userId: string,
  agentA: string,
  agentB: string,
  delta: number,
  reason: string
) {
  try {
    const db = getPool();
    
    // Get current score
    const current = await db.query(
      `SELECT score FROM agent_relationships 
       WHERE user_id = $1 AND 
       ((agent_a = $2 AND agent_b = $3) OR (agent_a = $3 AND agent_b = $2))`,
      [userId, agentA, agentB]
    );

    const oldScore = current.rows[0]?.score ?? 50;
    const newScore = Math.max(0, Math.min(100, oldScore + delta));

    // Update relationship
    await db.query(
      `UPDATE agent_relationships 
       SET score = $4, interactions = interactions + 1, updated_at = NOW()
       WHERE user_id = $1 AND 
       ((agent_a = $2 AND agent_b = $3) OR (agent_a = $3 AND agent_b = $2))`,
      [userId, agentA, agentB, newScore]
    );

    // Log the shift
    await db.query(
      `INSERT INTO agent_relationship_shifts (user_id, agent_a, agent_b, delta, reason, score_before, score_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, agentA, agentB, delta, reason, oldScore, newScore]
    );

    return { oldScore, newScore, label: getLabel(newScore) };
  } catch (error: any) {
    console.error('Failed to update relationship:', error.message);
    return null;
  }
}

export async function getUserRecentShifts(userId: string, limit: number = 10) {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT agent_a, agent_b, delta, reason, score_before, score_after, created_at
       FROM agent_relationship_shifts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================
// PER-USER AGENT MEMORY (DB-backed)
// ============================================

export async function saveAgentMemory(
  userId: string,
  agentName: string,
  memoryType: string,
  content: any
) {
  try {
    const db = getPool();
    await db.query(
      `INSERT INTO agent_memories (agent_name, user_id, memory_type, content)
       VALUES ($1, $2, $3, $4)`,
      [agentName, userId, memoryType, JSON.stringify(content)]
    );
  } catch (error: any) {
    console.error('Failed to save agent memory:', error.message);
    // Fallback to file-based
    await addAgentMemory(userId, agentName, { type: memoryType, content: JSON.stringify(content) });
  }
}

export async function getAgentMemories(
  userId: string,
  agentName: string,
  limit: number = 10
) {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT memory_type, content, created_at
       FROM agent_memories
       WHERE agent_name = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [agentName, userId, limit]
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================
// PER-USER PHONE BOOTH SESSIONS (DB-backed)
// ============================================

export async function savePhoneBoothSession(
  userId: string,
  agentId: string,
  messages: any[]
) {
  try {
    const db = getPool();
    await db.query(
      `INSERT INTO phone_booth_sessions (user_id, agent_id, messages)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, agent_id)
       DO UPDATE SET messages = $3, updated_at = NOW()`,
      [userId, agentId, JSON.stringify(messages)]
    );
  } catch (error: any) {
    console.error('Failed to save phone booth session:', error.message);
  }
}

export async function getPhoneBoothHistory(userId: string, agentId: string) {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT messages, updated_at
       FROM phone_booth_sessions
       WHERE user_id = $1 AND agent_id = $2`,
      [userId, agentId]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

function getLabel(score: number): string {
  if (score <= 20) return 'Rivals';
  if (score <= 40) return 'Tense';
  if (score <= 60) return 'Cordial';
  if (score <= 80) return 'Allies';
  return 'Partners';
}

function getDefaultMatrix() {
  const matrix: any[] = [];
  for (let i = 0; i < AGENTS.length; i++) {
    for (let j = i + 1; j < AGENTS.length; j++) {
      matrix.push({
        agent_a: AGENTS[i],
        agent_b: AGENTS[j],
        score: 50,
        interactions: 0,
        label: 'Cordial',
      });
    }
  }
  return matrix;
}

/**
 * Get full agent context for a user (combines universe + DB memories)
 */
export async function getFullAgentContext(userId: string, agentId: string): Promise<string> {
  // File-based context
  const fileContext = await getUserAgentContext(userId, agentId);
  
  // DB-based memories
  const memories = await getAgentMemories(userId, agentId, 5);
  let dbContext = '';
  if (memories.length > 0) {
    dbContext = '\nRecent memories:\n' + memories.map(m => 
      `- [${m.memory_type}] ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
    ).join('\n');
  }

  return fileContext + dbContext;
}
