/**
 * RELATIONSHIP TRACKER
 * Records agent interactions and updates relationship scores
 * VoxYZ-style: Allies, Partners, Cordial, Rivals
 */

import { query } from '../db';

export type RelationshipType = 'allies' | 'partners' | 'cordial' | 'rivals';
export type InteractionType = 
  | 'collaboration'      // Working together successfully
  | 'handoff'           // Passing work to another agent
  | 'agreement'         // Agreeing on a decision
  | 'disagreement'      // Disagreeing on approach
  | 'override'          // One agent overriding another
  | 'support'           // One agent backing another's idea
  | 'challenge'         // Challenging another's recommendation
  | 'resolution';       // Resolving a prior disagreement

// Score deltas for each interaction type
const SCORE_DELTAS: Record<InteractionType, number> = {
  collaboration: 0.02,
  handoff: 0.01,
  agreement: 0.02,
  disagreement: -0.01,
  override: -0.03,
  support: 0.02,
  challenge: -0.02,
  resolution: 0.03,  // Bonus for working through conflict
};

export interface RelationshipData {
  agentA: string;
  agentB: string;
  score: number;
  relationshipType: RelationshipType;
  interactionCount: number;
  lastInteraction: Date | null;
}

export interface InteractionRecord {
  agentA: string;
  agentB: string;
  type: InteractionType;
  context: string;
  scoreDelta: number;
  timestamp: Date;
}

/**
 * Record an interaction between two agents
 */
export async function recordInteraction(
  userId: string,
  agentA: string,
  agentB: string,
  interactionType: InteractionType,
  context: string
): Promise<void> {
  const scoreDelta = SCORE_DELTAS[interactionType];
  
  try {
    // Log the interaction
    await query(`
      INSERT INTO agent_interactions (user_id, agent_a, agent_b, interaction_type, score_delta, context)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, agentA, agentB, interactionType, scoreDelta, context]);

    // Update or create relationship (both directions)
    await updateRelationship(userId, agentA, agentB, scoreDelta);
    await updateRelationship(userId, agentB, agentA, scoreDelta);
    
    console.log(`[Relationship] ${agentA} ↔ ${agentB}: ${interactionType} (${scoreDelta > 0 ? '+' : ''}${scoreDelta})`);
  } catch (error) {
    console.error('[Relationship] Failed to record interaction:', error);
  }
}

/**
 * Update relationship score between two agents
 */
async function updateRelationship(
  userId: string,
  agentA: string,
  agentB: string,
  scoreDelta: number
): Promise<void> {
  // Upsert relationship
  await query(`
    INSERT INTO agent_relationships (user_id, agent_a, agent_b, score, interaction_count)
    VALUES ($1, $2, $3, 0.5 + $4, 1)
    ON CONFLICT (user_id, agent_a, agent_b)
    DO UPDATE SET 
      score = LEAST(1.0, GREATEST(0.0, agent_relationships.score + $4)),
      interaction_count = agent_relationships.interaction_count + 1
  `, [userId, agentA, agentB, scoreDelta]);
}

/**
 * Get relationship between two specific agents
 */
export async function getRelationship(
  userId: string,
  agentA: string,
  agentB: string
): Promise<RelationshipData | null> {
  try {
    const result = await query(`
      SELECT agent_a, agent_b, score, relationship_type, interaction_count, last_interaction
      FROM agent_relationships
      WHERE user_id = $1 AND agent_a = $2 AND agent_b = $3
    `, [userId, agentA, agentB]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      agentA: row.agent_a,
      agentB: row.agent_b,
      score: parseFloat(row.score),
      relationshipType: row.relationship_type,
      interactionCount: row.interaction_count,
      lastInteraction: row.last_interaction,
    };
  } catch (error) {
    console.error('[Relationship] Failed to get relationship:', error);
    return null;
  }
}

/**
 * Get all relationships for a user (the relationship matrix)
 */
export async function getRelationshipMatrix(userId: string): Promise<RelationshipData[]> {
  try {
    const result = await query(`
      SELECT agent_a, agent_b, score, relationship_type, interaction_count, last_interaction
      FROM agent_relationships
      WHERE user_id = $1
      ORDER BY agent_a, agent_b
    `, [userId]);

    return result.rows.map((row: any) => ({
      agentA: row.agent_a,
      agentB: row.agent_b,
      score: parseFloat(row.score),
      relationshipType: row.relationship_type,
      interactionCount: row.interaction_count,
      lastInteraction: row.last_interaction,
    }));
  } catch (error) {
    console.error('[Relationship] Failed to get matrix:', error);
    return [];
  }
}

/**
 * Get recent relationship shifts (for "Recent Shifts" UI like VoxYZ)
 */
export async function getRecentShifts(userId: string, limit: number = 5): Promise<InteractionRecord[]> {
  try {
    const result = await query(`
      SELECT agent_a, agent_b, interaction_type, score_delta, context, created_at
      FROM agent_interactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows.map((row: any) => ({
      agentA: row.agent_a,
      agentB: row.agent_b,
      type: row.interaction_type,
      context: row.context,
      scoreDelta: parseFloat(row.score_delta),
      timestamp: row.created_at,
    }));
  } catch (error) {
    console.error('[Relationship] Failed to get shifts:', error);
    return [];
  }
}

/**
 * Initialize default relationships for a new user
 * All agents start as 'cordial' (0.5) with each other
 */
export async function initializeRelationships(userId: string): Promise<void> {
  const agents = [
    'ANALYST', 'STRATEGIST', 'DAY_TRADER', 'MOMENTUM',
    'OPTIONS_STRATEGIST', 'RISK', 'EXECUTOR', 'GROWTH', 'VALUE'
  ];

  for (const agentA of agents) {
    for (const agentB of agents) {
      if (agentA !== agentB) {
        try {
          await query(`
            INSERT INTO agent_relationships (user_id, agent_a, agent_b, score, relationship_type, interaction_count)
            VALUES ($1, $2, $3, 0.5, 'cordial', 0)
            ON CONFLICT (user_id, agent_a, agent_b) DO NOTHING
          `, [userId, agentA, agentB]);
        } catch (error) {
          // Ignore duplicates
        }
      }
    }
  }
  console.log(`[Relationship] Initialized relationships for user ${userId}`);
}
