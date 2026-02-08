// Event and Reaction interfaces for the autonomous trading company

export interface Event {
  id?: string;
  agent_id: string;
  kind: string;
  title: string;
  summary: string;
  tags: string[];
  metadata?: Record<string, any>;
  trade_id?: string;
  pnl?: number;
  created_at?: Date;
}

export interface ReactionPattern {
  source: string; // "*" for wildcard
  tags: string[];
  target: string;
  type: string;
  probability: number; // 0.0 to 1.0
  cooldown: number; // minutes
}

export interface ReactionMatrix {
  patterns: ReactionPattern[];
}

export interface QueuedReaction {
  id?: string;
  source_agent: string;
  target_agent: string;
  reaction_type: string;
  trigger_event_id: string;
  status: 'queued' | 'processed' | 'failed';
  created_at?: Date;
  processed_at?: Date;
}

export interface CooldownKey {
  source: string;
  target: string;
  type: string;
}

export interface CooldownRecord {
  key: CooldownKey;
  last_triggered: Date;
  expires_at: Date;
}