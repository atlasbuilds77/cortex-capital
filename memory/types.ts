/**
 * Memory System Types
 * 
 * 5 memory types with different sources and confidence ranges:
 * 1. INSIGHT (Discovery) - 0.65-0.85
 * 2. PATTERN (Recurring behavior) - 0.70-0.90
 * 3. STRATEGY (High-level approach) - 0.75-0.90
 * 4. PREFERENCE (Operational choice) - 0.60-0.80
 * 5. LESSON (Learned from failure) - 0.55-0.75
 */

export type MemoryType = 'insight' | 'pattern' | 'strategy' | 'preference' | 'lesson';

export interface Memory {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  confidence: number; // 0.0-1.0
  tags: string[];
  sourceTraceId: string; // For idempotent dedup (e.g., conversation_id, trade_id)
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  promoted: boolean; // Whether promoted to permanent storage
  lastAccessedAt: Date;
}

export interface ConversationHistory {
  id: string;
  participants: string[];
  turns: ConversationTurn[];
  format: string;
  topic?: string;
  timestamp: Date;
}

export interface ConversationTurn {
  agentId: string;
  content: string;
  timestamp: Date;
}

export interface TradeOutcome {
  tradeId: string;
  agentId: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  holdTime: number; // in minutes
  outcomeType: 'win' | 'loss' | 'breakeven';
  engagementScore: number; // 0-1, measures how actively monitored/managed
  timestamp: Date;
}

export interface MemoryQueryOptions {
  types?: MemoryType[];
  minConfidence?: number;
  maxConfidence?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'confidence' | 'recency' | 'relevance';
  promotedOnly?: boolean;
}

export interface MemoryCache {
  [agentId: string]: {
    memories: Memory[];
    lastQueryTime: number;
    queryHash: string;
  };
}

export interface DistilledMemory {
  content: string;
  type: MemoryType;
  confidence: number;
  tags: string[];
  reasoning?: string;
}

export interface LessonFromOutcome {
  content: string;
  confidence: number;
  tags: string[];
  sourceTradeId: string;
  outcomeType: 'strong' | 'weak'; // strong performer (>2x median) or weak (<0.3x median)
}

export interface InsightPromotionCandidate {
  memory: Memory;
  promotionScore: number;
  reasons: string[];
}