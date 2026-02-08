/**
 * Database Adapter
 * Real PostgreSQL/Supabase queries replacing mock functions
 */

import { config, AgentId } from './config';
import type { Pool } from 'pg';

// Types from existing modules
export interface Proposal {
  id?: string;
  agent_id: string;
  title: string;
  signal_type?: string;
  entry_price?: number;
  target?: number;
  stop_loss?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  proposed_steps: string[];
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface Mission {
  id?: string;
  title: string;
  status: 'approved' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  created_by: string;
  mission_type: 'entry' | 'exit' | 'scale' | 'hedge' | 'analysis' | 'monitor';
  proposal_id?: string;
  priority?: number;
  metadata?: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
}

export interface MissionStep {
  id?: string;
  mission_id: string;
  kind: 'analyze' | 'execute_trade' | 'monitor' | 'close' | 'calculate_risk' | 'roundtable_conversation';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  assigned_to?: string;
  started_at?: Date;
  completed_at?: Date;
  timeout_at?: Date;
  created_at?: Date;
}

export interface TradeOutcome {
  id?: string;
  trade_id: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_percent: number;
  hold_time_seconds?: number;
  outcome_type: 'win' | 'loss' | 'breakeven';
  token?: string;
  market?: string;
  lessons_learned?: string[];
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface AgentMemory {
  id?: string;
  agent_id: string;
  type: 'insight' | 'pattern' | 'strategy' | 'preference' | 'lesson';
  content: string;
  confidence: number;
  tags: string[];
  source_trace_id?: string;
  promoted?: boolean;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface AgentEvent {
  id?: string;
  agent_id: string;
  kind: string;
  title: string;
  summary: string;
  tags: string[];
  trade_id?: string;
  pnl?: number;
  pnl_percent?: number;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface Position {
  id?: string;
  token: string;
  entry_price: number;
  size: number;
  current_price: number;
  unrealized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'open' | 'closed';
  market?: string;
  created_at?: Date;
}

export interface AgentReaction {
  id?: string;
  source_agent: string;
  target_agent: string;
  reaction_type: string;
  trigger_event_id?: string;
  status: 'queued' | 'processing' | 'processed' | 'failed';
  metadata?: Record<string, any>;
  created_at?: Date;
}

// Database client abstraction
export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ rowCount: number }>;
}

// In-memory fallback for development
class InMemoryDb implements DbClient {
  private data: Record<string, any[]> = {
    proposals: [],
    missions: [],
    mission_steps: [],
    events: [],
    memory: [],
    outcomes: [],
    positions: [],
    reactions: [],
    policy: [],
  };

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    console.log('[InMemoryDb] Query:', sql.substring(0, 100));
    // Simple mock implementation - returns empty array
    return [] as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(sql: string, params?: any[]): Promise<{ rowCount: number }> {
    console.log('[InMemoryDb] Execute:', sql.substring(0, 100));
    return { rowCount: 1 };
  }
}

// PostgreSQL client (using pg)
class PostgresDb implements DbClient {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor(connectionString: string) {
    // Lazy require to avoid issues if pg not installed
    try {
      const { Pool } = require('pg');
      this.pool = new Pool({
        connectionString,
        min: config.database.poolMin || 2,
        max: config.database.poolMax || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000,
      });
      
      // Test connection on startup
      this.pool.query('SELECT 1')
        .then(() => {
          this.isInitialized = true;
          console.log('[PostgresDb] Connection pool initialized');
        })
        .catch((err: Error) => {
          console.error('[PostgresDb] Failed to connect:', err);
          throw new Error(`Database connection failed: ${err.message}`);
        });
      
      // Handle pool errors
      this.pool.on('error', (err: Error) => {
        console.error('[PostgresDb] Unexpected pool error:', err);
      });
    } catch (error) {
      console.error('pg module not found, falling back to in-memory');
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    try {
      const result = await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      console.error('[PostgresDb] Query failed:', sql.substring(0, 100), error);
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(sql: string, params?: any[]): Promise<{ rowCount: number }> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    try {
      const result = await this.pool.query(sql, params);
      return { rowCount: result.rowCount || 0 };
    } catch (error) {
      console.error('[PostgresDb] Execute failed:', sql.substring(0, 100), error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log('[PostgresDb] Draining connection pool...');
    await this.pool.end();
  }
}

// Singleton database instance
let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    try {
      _db = new PostgresDb(config.database.connectionString);
    } catch (error) {
      console.warn('Using in-memory database (PostgreSQL not available)');
      _db = new InMemoryDb();
    }
  }
  return _db;
}

// ==================== PROPOSAL QUERIES ====================

export async function createProposal(proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>): Promise<Proposal> {
  const db = getDb();
  const result = await db.queryOne<Proposal>(`
    INSERT INTO ops_trading_proposals (agent_id, title, signal_type, entry_price, target_price, stop_loss, status, proposed_steps, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    proposal.agent_id,
    proposal.title,
    proposal.signal_type || 'manual',
    proposal.entry_price,
    proposal.target,
    proposal.stop_loss,
    proposal.status,
    JSON.stringify(proposal.proposed_steps),
    JSON.stringify(proposal.metadata || {}),
  ]);
  
  return result || {
    ...proposal,
    id: `proposal_${Date.now()}`,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function updateProposalStatus(id: string, status: Proposal['status'], reason?: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_trading_proposals 
    SET status = $1, rejected_reason = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [status, reason, id]);
}

export async function getPendingProposals(): Promise<Proposal[]> {
  const db = getDb();
  return db.query<Proposal>(`
    SELECT * FROM ops_trading_proposals 
    WHERE status = 'pending' 
    ORDER BY created_at ASC
  `);
}

// ==================== MISSION QUERIES ====================

export async function createMission(mission: Omit<Mission, 'id' | 'created_at'>): Promise<Mission> {
  const db = getDb();
  const result = await db.queryOne<Mission>(`
    INSERT INTO ops_missions (title, status, created_by, mission_type, proposal_id, priority, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    mission.title,
    mission.status,
    mission.created_by,
    mission.mission_type,
    mission.proposal_id,
    mission.priority || 5,
    JSON.stringify(mission.metadata || {}),
  ]);
  
  return result || {
    ...mission,
    id: `mission_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function updateMissionStatus(id: string, status: Mission['status']): Promise<void> {
  const db = getDb();
  const updates: any = { status };
  if (status === 'running') updates.started_at = new Date();
  if (status === 'succeeded' || status === 'failed') updates.completed_at = new Date();
  
  await db.execute(`
    UPDATE ops_missions 
    SET status = $1, started_at = COALESCE($2, started_at), completed_at = COALESCE($3, completed_at), updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [status, updates.started_at, updates.completed_at, id]);
}

export async function getActiveMissions(): Promise<Mission[]> {
  const db = getDb();
  return db.query<Mission>(`
    SELECT * FROM ops_missions 
    WHERE status IN ('approved', 'running') 
    ORDER BY priority ASC, created_at ASC
  `);
}

// ==================== MISSION STEP QUERIES ====================

export async function createMissionStep(step: Omit<MissionStep, 'id' | 'created_at'>): Promise<MissionStep> {
  const db = getDb();
  const result = await db.queryOne<MissionStep>(`
    INSERT INTO ops_mission_steps (mission_id, kind, status, payload, assigned_to)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    step.mission_id,
    step.kind,
    step.status || 'queued',
    JSON.stringify(step.payload),
    step.assigned_to,
  ]);
  
  return result || {
    ...step,
    id: `step_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function claimStep(stepId: string, workerId: string): Promise<boolean> {
  const db = getDb();
  // Use RETURNING to ensure atomic claim (prevents race condition)
  const result = await db.queryOne<{ id: string }>(`
    UPDATE ops_mission_steps 
    SET status = 'running', 
        assigned_to = $1, 
        started_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'queued'
    RETURNING id
  `, [workerId, stepId]);
  
  return result !== null;
}

export async function completeStep(stepId: string, result: Record<string, any>): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_mission_steps 
    SET status = 'succeeded', result = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [JSON.stringify(result), stepId]);
}

export async function failStep(stepId: string, error: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_mission_steps 
    SET status = 'failed', error = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [error, stepId]);
}

export async function getQueuedSteps(kind?: string): Promise<MissionStep[]> {
  const db = getDb();
  if (kind) {
    return db.query<MissionStep>(`
      SELECT * FROM ops_mission_steps 
      WHERE status = 'queued' AND kind = $1
      ORDER BY created_at ASC
      LIMIT 10
    `, [kind]);
  }
  return db.query<MissionStep>(`
    SELECT * FROM ops_mission_steps 
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 10
  `);
}

export async function getStaleSteps(staleMinutes: number = 30): Promise<MissionStep[]> {
  const db = getDb();
  return db.query<MissionStep>(`
    SELECT * FROM ops_mission_steps 
    WHERE status = 'running' 
    AND started_at < NOW() - INTERVAL '${staleMinutes} minutes'
  `);
}

// ==================== EVENT QUERIES ====================

export async function createEvent(event: Omit<AgentEvent, 'id' | 'created_at'>): Promise<AgentEvent> {
  const db = getDb();
  const result = await db.queryOne<AgentEvent>(`
    INSERT INTO ops_agent_events (agent_id, kind, title, summary, tags, trade_id, pnl, pnl_percent, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    event.agent_id,
    event.kind,
    event.title,
    event.summary,
    event.tags,
    event.trade_id,
    event.pnl,
    event.pnl_percent,
    JSON.stringify(event.metadata || {}),
  ]);
  
  return result || {
    ...event,
    id: `event_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function getRecentEvents(limit: number = 50): Promise<AgentEvent[]> {
  const db = getDb();
  return db.query<AgentEvent>(`
    SELECT * FROM ops_agent_events 
    ORDER BY created_at DESC 
    LIMIT $1
  `, [limit]);
}

export async function getEventsByTags(tags: string[], limit: number = 20): Promise<AgentEvent[]> {
  const db = getDb();
  return db.query<AgentEvent>(`
    SELECT * FROM ops_agent_events 
    WHERE tags && $1
    ORDER BY created_at DESC 
    LIMIT $2
  `, [tags, limit]);
}

// ==================== MEMORY QUERIES ====================

export async function createMemory(memory: Omit<AgentMemory, 'id' | 'created_at'>): Promise<AgentMemory> {
  const db = getDb();
  const result = await db.queryOne<AgentMemory>(`
    INSERT INTO ops_agent_memory (agent_id, type, content, confidence, tags, source_trace_id, promoted, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    memory.agent_id,
    memory.type,
    memory.content,
    memory.confidence,
    memory.tags,
    memory.source_trace_id,
    memory.promoted || false,
    JSON.stringify(memory.metadata || {}),
  ]);
  
  return result || {
    ...memory,
    id: `memory_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function getMemoriesByAgent(agentId: string, types?: string[], limit: number = 20): Promise<AgentMemory[]> {
  const db = getDb();
  if (types && types.length > 0) {
    return db.query<AgentMemory>(`
      SELECT * FROM ops_agent_memory 
      WHERE agent_id = $1 AND type = ANY($2)
      ORDER BY confidence DESC, created_at DESC 
      LIMIT $3
    `, [agentId, types, limit]);
  }
  return db.query<AgentMemory>(`
    SELECT * FROM ops_agent_memory 
    WHERE agent_id = $1
    ORDER BY confidence DESC, created_at DESC 
    LIMIT $2
  `, [agentId, limit]);
}

export async function getHighConfidenceMemories(minConfidence: number = 0.75): Promise<AgentMemory[]> {
  const db = getDb();
  return db.query<AgentMemory>(`
    SELECT * FROM ops_agent_memory 
    WHERE confidence >= $1 AND promoted = false
    ORDER BY confidence DESC
    LIMIT 50
  `, [minConfidence]);
}

export async function promoteMemory(id: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_agent_memory 
    SET promoted = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
}

// ==================== TRADE OUTCOME QUERIES ====================

export async function createTradeOutcome(outcome: Omit<TradeOutcome, 'id' | 'created_at'>): Promise<TradeOutcome> {
  const db = getDb();
  const result = await db.queryOne<TradeOutcome>(`
    INSERT INTO ops_trade_outcomes (trade_id, entry_price, exit_price, pnl, pnl_percent, hold_time_seconds, outcome_type, token, market, lessons_learned, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    outcome.trade_id,
    outcome.entry_price,
    outcome.exit_price,
    outcome.pnl,
    outcome.pnl_percent,
    outcome.hold_time_seconds,
    outcome.outcome_type,
    outcome.token,
    outcome.market,
    outcome.lessons_learned,
    JSON.stringify(outcome.metadata || {}),
  ]);
  
  return result || {
    ...outcome,
    id: `outcome_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function getUnprocessedOutcomes(): Promise<TradeOutcome[]> {
  const db = getDb();
  return db.query<TradeOutcome>(`
    SELECT o.* FROM ops_trade_outcomes o
    LEFT JOIN ops_agent_memory m ON m.source_trace_id = o.id::text
    WHERE m.id IS NULL
    ORDER BY o.created_at DESC
    LIMIT 20
  `);
}

// ==================== POSITION QUERIES ====================

export async function getOpenPositions(): Promise<Position[]> {
  const db = getDb();
  return db.query<Position>(`
    SELECT * FROM ops_positions 
    WHERE status = 'open'
    ORDER BY created_at DESC
  `);
}

export async function updatePositionPrice(id: string, currentPrice: number): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_positions 
    SET current_price = $1, unrealized_pnl = (current_price - entry_price) * size, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [currentPrice, id]);
}

// ==================== REACTION QUERIES ====================

export async function createReaction(reaction: Omit<AgentReaction, 'id' | 'created_at'>): Promise<AgentReaction> {
  const db = getDb();
  const result = await db.queryOne<AgentReaction>(`
    INSERT INTO ops_agent_reactions (source_agent, target_agent, reaction_type, trigger_event_id, status, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    reaction.source_agent,
    reaction.target_agent,
    reaction.reaction_type,
    reaction.trigger_event_id,
    reaction.status || 'queued',
    JSON.stringify(reaction.metadata || {}),
  ]);
  
  return result || {
    ...reaction,
    id: `reaction_${Date.now()}`,
    created_at: new Date(),
  };
}

export async function getQueuedReactions(limit: number = 20): Promise<AgentReaction[]> {
  const db = getDb();
  return db.query<AgentReaction>(`
    SELECT * FROM ops_agent_reactions 
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT $1
  `, [limit]);
}

export async function markReactionProcessed(id: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_agent_reactions 
    SET status = 'processed', processed_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
}

// ==================== POLICY QUERIES ====================

export async function getPolicy(key: string): Promise<any> {
  const db = getDb();
  const result = await db.queryOne<{ value: any }>(`
    SELECT value FROM ops_policy WHERE key = $1
  `, [key]);
  return result?.value || null;
}

export async function setPolicy(key: string, value: any, description?: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    INSERT INTO ops_policy (key, value, description)
    VALUES ($1, $2, $3)
    ON CONFLICT (key) DO UPDATE SET value = $2, version = ops_policy.version + 1, updated_at = CURRENT_TIMESTAMP
  `, [key, JSON.stringify(value), description]);
}

// ==================== STATS QUERIES ====================

export async function getPortfolioStats(): Promise<{
  totalValue: number;
  pnl24h: number;
  winRate: number;
  openPositions: number;
  totalTrades: number;
}> {
  const db = getDb();
  const positions = await db.queryOne<{ total: number; pnl: number }>(`
    SELECT COUNT(*) as total, COALESCE(SUM(unrealized_pnl), 0) as pnl
    FROM ops_positions WHERE status = 'open'
  `);
  
  const outcomes = await db.queryOne<{ total: number; wins: number }>(`
    SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE outcome_type = 'win') as wins
    FROM ops_trade_outcomes
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  
  return {
    totalValue: positions?.pnl || 0,
    pnl24h: 0, // Would need historical data
    winRate: outcomes?.total ? (outcomes.wins / outcomes.total) * 100 : 0,
    openPositions: positions?.total || 0,
    totalTrades: outcomes?.total || 0,
  };
}

// ==================== ROUNDTABLE QUERIES ====================

export async function getStaleRoundtables(staleMinutes: number = 60): Promise<any[]> {
  const db = getDb();
  return db.query(`
    SELECT * FROM ops_roundtable_queue 
    WHERE status = 'running' 
    AND updated_at < NOW() - INTERVAL '${staleMinutes} minutes'
  `);
}

export async function markRoundtableFailed(id: string, error: string): Promise<void> {
  const db = getDb();
  await db.execute(`
    UPDATE ops_roundtable_queue 
    SET status = 'failed', metadata = jsonb_set(metadata, '{error}', to_jsonb($1::text))
    WHERE id = $2
  `, [error, id]);
}

// ==================== ACTION RUNS LOGGING ====================

export async function logActionRun(
  actionType: string,
  durationMs: number,
  status: 'success' | 'error',
  errors?: string[]
): Promise<void> {
  const db = getDb();
  await db.execute(`
    INSERT INTO ops_action_runs (action_type, duration_ms, status, errors)
    VALUES ($1, $2, $3, $4)
  `, [actionType, durationMs, status, errors || []]);
}

// ==================== SHUTDOWN ====================

export async function closeDb(): Promise<void> {
  if (_db && 'close' in _db) {
    await (_db as PostgresDb).close();
  }
}
