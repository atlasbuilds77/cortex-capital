/**
 * AGENT LEARNING SYSTEM
 * 
 * Agents get smarter over time by:
 * 1. Tracking trade outcomes (what worked, what didn't)
 * 2. Learning user preferences (what they like, what they reject)
 * 3. Recording market patterns (what setups perform best)
 * 4. Storing successful analysis frameworks
 * 
 * Memory types:
 * - TRADE_OUTCOME: Result of a trade recommendation
 * - USER_FEEDBACK: User accepted/rejected/modified recommendation
 * - MARKET_PATTERN: Observed pattern that worked/failed
 * - AGENT_INSIGHT: Learned behavior or adjustment
 */

import { query } from '../../db';

interface Memory {
  id: string;
  agentId: string;
  memoryType: 'TRADE_OUTCOME' | 'USER_FEEDBACK' | 'MARKET_PATTERN' | 'AGENT_INSIGHT';
  content: string;
  metadata: Record<string, any>;
  importance: number; // 1-10, higher = more important to recall
  createdAt: string;
}

interface TradeOutcome {
  symbol: string;
  action: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  returnPct?: number;
  thesis: string;
  wasCorrect?: boolean;
  lessonLearned?: string;
}

interface UserFeedback {
  recommendationType: string;
  userAction: 'accepted' | 'rejected' | 'modified';
  userReason?: string;
}

/**
 * Store a memory for an agent
 */
export async function storeMemory(
  agentId: string,
  memoryType: Memory['memoryType'],
  content: string,
  metadata: Record<string, any> = {},
  importance: number = 5
): Promise<void> {
  try {
    await query(`
      INSERT INTO agent_memories (agent_id, memory_type, content, metadata, importance, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [agentId, memoryType, content, JSON.stringify(metadata), importance]);
  } catch (error) {
    console.error('[AgentMemory] Failed to store memory:', error);
  }
}

/**
 * Record a trade outcome for learning
 */
export async function recordTradeOutcome(
  agentId: string,
  outcome: TradeOutcome
): Promise<void> {
  const wasWin = outcome.returnPct && outcome.returnPct > 0;
  const content = `${outcome.action.toUpperCase()} ${outcome.symbol}: ${wasWin ? 'WIN' : 'LOSS'} ${outcome.returnPct?.toFixed(1)}%. Thesis: ${outcome.thesis}. ${outcome.lessonLearned || ''}`;
  
  await storeMemory(
    agentId,
    'TRADE_OUTCOME',
    content,
    outcome,
    wasWin ? 6 : 8 // Losses are more important to remember
  );
}

/**
 * Record user feedback for learning
 */
export async function recordUserFeedback(
  agentId: string,
  feedback: UserFeedback
): Promise<void> {
  const content = `User ${feedback.userAction} ${feedback.recommendationType}. ${feedback.userReason || ''}`;
  
  await storeMemory(
    agentId,
    'USER_FEEDBACK',
    content,
    feedback,
    feedback.userAction === 'rejected' ? 7 : 5
  );
}

/**
 * Retrieve relevant memories for context
 */
export async function recallMemories(
  agentId: string,
  context: string,
  limit: number = 10
): Promise<Memory[]> {
  try {
    // For now, simple recency + importance ranking
    // TODO: Add vector similarity search for better recall
    const result = await query(`
      SELECT id, agent_id as "agentId", memory_type as "memoryType", 
             content, metadata, importance, created_at as "createdAt"
      FROM agent_memories
      WHERE agent_id = $1
      ORDER BY importance DESC, created_at DESC
      LIMIT $2
    `, [agentId, limit]);
    
    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));
  } catch (error) {
    console.error('[AgentMemory] Failed to recall memories:', error);
    return [];
  }
}

/**
 * Recall memories related to a specific symbol
 */
export async function recallSymbolMemories(
  agentId: string,
  symbol: string,
  limit: number = 5
): Promise<Memory[]> {
  try {
    const result = await query(`
      SELECT id, agent_id as "agentId", memory_type as "memoryType",
             content, metadata, importance, created_at as "createdAt"
      FROM agent_memories
      WHERE agent_id = $1 
        AND (content ILIKE $2 OR metadata::text ILIKE $2)
      ORDER BY importance DESC, created_at DESC
      LIMIT $3
    `, [agentId, `%${symbol}%`, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('[AgentMemory] Failed to recall symbol memories:', error);
    return [];
  }
}

/**
 * Get agent's win rate from trade outcomes
 */
export async function getAgentWinRate(agentId: string): Promise<{
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}> {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (metadata->>'returnPct')::float > 0) as wins,
        COUNT(*) FILTER (WHERE (metadata->>'returnPct')::float <= 0) as losses,
        AVG((metadata->>'returnPct')::float) FILTER (WHERE (metadata->>'returnPct')::float > 0) as avg_win,
        AVG((metadata->>'returnPct')::float) FILTER (WHERE (metadata->>'returnPct')::float <= 0) as avg_loss
      FROM agent_memories
      WHERE agent_id = $1 AND memory_type = 'TRADE_OUTCOME'
    `, [agentId]);
    
    const row = result.rows[0];
    return {
      totalTrades: parseInt(row.total) || 0,
      wins: parseInt(row.wins) || 0,
      losses: parseInt(row.losses) || 0,
      winRate: row.total > 0 ? (row.wins / row.total) * 100 : 0,
      avgWin: parseFloat(row.avg_win) || 0,
      avgLoss: parseFloat(row.avg_loss) || 0,
    };
  } catch (error) {
    console.error('[AgentMemory] Failed to get win rate:', error);
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, avgWin: 0, avgLoss: 0 };
  }
}

/**
 * Generate a learning summary for an agent
 */
export async function generateLearningSummary(agentId: string): Promise<string> {
  const stats = await getAgentWinRate(agentId);
  const recentMemories = await recallMemories(agentId, '', 5);
  
  let summary = `AGENT LEARNING STATUS:\n`;
  summary += `- Total trades analyzed: ${stats.totalTrades}\n`;
  summary += `- Win rate: ${stats.winRate.toFixed(1)}%\n`;
  summary += `- Avg win: +${stats.avgWin.toFixed(1)}% | Avg loss: ${stats.avgLoss.toFixed(1)}%\n\n`;
  
  if (recentMemories.length > 0) {
    summary += `RECENT LEARNINGS:\n`;
    recentMemories.forEach(m => {
      summary += `- ${m.content}\n`;
    });
  }
  
  return summary;
}

/**
 * Initialize the agent memories table
 */
export async function initializeMemoryTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id SERIAL PRIMARY KEY,
      agent_id VARCHAR(50) NOT NULL,
      memory_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      importance INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT NOW(),
      
      INDEX idx_agent_memories_agent (agent_id),
      INDEX idx_agent_memories_type (memory_type),
      INDEX idx_agent_memories_importance (importance DESC)
    )
  `);
}

export default {
  storeMemory,
  recordTradeOutcome,
  recordUserFeedback,
  recallMemories,
  recallSymbolMemories,
  getAgentWinRate,
  generateLearningSummary,
};
