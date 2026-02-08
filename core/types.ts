// Core types for the Autonomous Trading Company

export type AgentId = 'atlas' | 'sage' | 'scout' | 'growth' | 'intel' | 'observer';

export type StepKind = 
  | 'execute_trade'
  | 'close_position'
  | 'scale_position'
  | 'analyze_signal'
  | 'calculate_risk'
  | 'monitor_position'
  | 'roundtable_conversation';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'auto_approved';

export type MissionStatus = 'approved' | 'running' | 'succeeded' | 'failed';

export type StepStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface Proposal {
  id?: string;
  agent_id: AgentId;
  title: string;
  signal_type?: string;
  entry_price?: number;
  target?: number;
  stop_loss?: number;
  status: ProposalStatus;
  proposed_steps: StepKind[];
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface Mission {
  id?: string;
  title: string;
  status: MissionStatus;
  created_by: AgentId;
  mission_type: 'entry' | 'exit' | 'scale' | 'hedge' | 'analysis' | 'conversation';
  proposal_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface MissionStep {
  id?: string;
  mission_id: string;
  kind: StepKind;
  status: StepStatus;
  payload: Record<string, any>;
  claimed_by?: string;
  claimed_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  error?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Policy {
  key: string;
  value: any;
  updated_at?: Date;
}

export interface AgentEvent {
  id?: string;
  agent_id: AgentId;
  kind: string;
  title: string;
  summary: string;
  tags: string[];
  trade_id?: string;
  pnl?: number;
  created_at?: Date;
}

export interface Position {
  id?: string;
  token: string;
  entry_price: number;
  size: number;
  current_price?: number;
  unrealized_pnl?: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'open' | 'closed';
  created_at?: Date;
  updated_at?: Date;
}

export interface TradeOutcome {
  id?: string;
  trade_id: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  hold_time: number;
  outcome_type: 'win' | 'loss' | 'breakeven';
  lessons_learned: string[];
  created_at?: Date;
}

export interface Signal {
  id?: string;
  source: 'KOL' | 'pattern' | 'indicator';
  token: string;
  signal_type: 'buy' | 'sell' | 'scale';
  confidence: number;
  metadata: Record<string, any>;
  created_at?: Date;
}

export interface CapGateResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

export interface CreateProposalResult {
  success: boolean;
  proposal?: Proposal;
  mission?: Mission;
  steps?: MissionStep[];
  error?: string;
  auto_approved?: boolean;
}