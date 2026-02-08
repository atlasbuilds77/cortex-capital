-- Migration: 001_initial_schema
-- Description: Initial database schema for Autonomous Trading Company
-- Created: Feb 7, 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== CORE LOOP TABLES ====================

CREATE TABLE ops_trading_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    entry_price DECIMAL(20, 8),
    target_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    proposed_steps JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT
);

CREATE TABLE ops_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'running', 'succeeded', 'failed', 'cancelled')),
    created_by VARCHAR(50) NOT NULL,
    mission_type VARCHAR(50) NOT NULL CHECK (mission_type IN ('entry', 'exit', 'scale', 'hedge', 'analysis', 'monitor')),
    proposal_id UUID REFERENCES ops_trading_proposals(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 5,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_mission_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES ops_missions(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('analyze', 'execute_trade', 'monitor', 'close', 'calculate_risk', 'roundtable_conversation')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error TEXT,
    assigned_to VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    timeout_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes')
);

CREATE TABLE ops_agent_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL,
    kind VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    trade_id UUID,
    pnl DECIMAL(20, 8),
    pnl_percent DECIMAL(10, 4),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== POLICY & CONFIG TABLES ====================

CREATE TABLE ops_policy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_trigger_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    trigger_event VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    action_config JSONB NOT NULL,
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    fire_count INTEGER DEFAULT 0,
    last_fired_at TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_agent_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_agent VARCHAR(50) NOT NULL,
    target_agent VARCHAR(50) NOT NULL,
    reaction_type VARCHAR(50) NOT NULL,
    trigger_event_id UUID REFERENCES ops_agent_events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'processed', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ==================== MEMORY & LEARNING TABLES ====================

CREATE TABLE ops_agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('insight', 'pattern', 'strategy', 'preference', 'lesson')),
    content TEXT NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    tags TEXT[] NOT NULL DEFAULT '{}',
    source_trace_id UUID,
    promoted BOOLEAN DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_trade_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL UNIQUE,
    entry_price DECIMAL(20, 8) NOT NULL,
    exit_price DECIMAL(20, 8) NOT NULL,
    pnl DECIMAL(20, 8) NOT NULL,
    pnl_percent DECIMAL(10, 4) NOT NULL,
    hold_time_seconds INTEGER,
    outcome_type VARCHAR(20) NOT NULL CHECK (outcome_type IN ('win', 'loss', 'breakeven')),
    lessons_learned TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_portfolio_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_value DECIMAL(20, 8) NOT NULL,
    pnl_24h DECIMAL(20, 8),
    pnl_24h_percent DECIMAL(10, 4),
    open_positions INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 4),
    sharpe_ratio DECIMAL(10, 4),
    max_drawdown DECIMAL(10, 4),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CONVERSATIONS TABLES ====================

CREATE TABLE ops_roundtable_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    format VARCHAR(50) NOT NULL CHECK (format IN ('morning_standup', 'position_review', 'post_mortem', 'debate', 'strategy_session', 'watercooler')),
    participants VARCHAR(50)[] NOT NULL,
    topic VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')),
    conversation_history JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_agent_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_a VARCHAR(50) NOT NULL,
    agent_b VARCHAR(50) NOT NULL,
    affinity DECIMAL(3, 2) NOT NULL CHECK (affinity >= 0.10 AND affinity <= 0.95),
    total_interactions INTEGER DEFAULT 0,
    drift_log JSONB NOT NULL DEFAULT '[]',
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_a, agent_b),
    CHECK (agent_a < agent_b)
);

-- ==================== TRADING SPECIFIC TABLES ====================

CREATE TABLE ops_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('KOL', 'pattern', 'indicator', 'social', 'volume', 'price_action')),
    token VARCHAR(50) NOT NULL,
    signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('buy', 'sell', 'scale_in', 'scale_out', 'hold')),
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ops_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(50) NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    size DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8),
    unrealized_pnl DECIMAL(20, 8),
    unrealized_pnl_percent DECIMAL(10, 4),
    stop_loss DECIMAL(20, 8),
    take_profit DECIMAL(20, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidating')),
    metadata JSONB NOT NULL DEFAULT '{}',
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ops_action_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('heartbeat', 'trigger_eval', 'worker', 'roundtable', 'memory_promotion', 'learning')),
    duration_ms INTEGER NOT NULL,
    errors TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial_failure', 'complete_failure')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================

CREATE INDEX idx_trading_proposals_status ON ops_trading_proposals(status);
CREATE INDEX idx_trading_proposals_agent_id ON ops_trading_proposals(agent_id);
CREATE INDEX idx_trading_proposals_created_at ON ops_trading_proposals(created_at);

CREATE INDEX idx_missions_status ON ops_missions(status);
CREATE INDEX idx_missions_mission_type ON ops_missions(mission_type);
CREATE INDEX idx_missions_created_by ON ops_missions(created_by);

CREATE INDEX idx_mission_steps_mission_id ON ops_mission_steps(mission_id);
CREATE INDEX idx_mission_steps_status ON ops_mission_steps(status);
CREATE INDEX idx_mission_steps_kind ON ops_mission_steps(kind);
CREATE INDEX idx_mission_steps_assigned_to ON ops_mission_steps(assigned_to);

CREATE INDEX idx_agent_events_agent_id ON ops_agent_events(agent_id);
CREATE INDEX idx_agent_events_kind ON ops_agent_events(kind);
CREATE INDEX idx_agent_events_created_at ON ops_agent_events(created_at);
CREATE INDEX idx_agent_events_tags ON ops_agent_events USING GIN (tags);

CREATE INDEX idx_trigger_rules_enabled ON ops_trigger_rules(enabled);
CREATE INDEX idx_trigger_rules_trigger_event ON ops_trigger_rules(trigger_event);

CREATE INDEX idx_agent_reactions_source_target ON ops_agent_reactions(source_agent, target_agent);
CREATE INDEX idx_agent_reactions_status ON ops_agent_reactions(status);

CREATE INDEX idx_agent_memory_agent_type ON ops_agent_memory(agent_id, type);
CREATE INDEX idx_agent_memory_confidence ON ops_agent_memory(confidence);
CREATE INDEX idx_agent_memory_tags ON ops_agent_memory USING GIN (tags);

CREATE INDEX idx_trade_outcomes_outcome_type ON ops_trade_outcomes(outcome_type);
CREATE INDEX idx_trade_outcomes_pnl_percent ON ops_trade_outcomes(pnl_percent);
CREATE INDEX idx_trade_outcomes_created_at ON ops_trade_outcomes(created_at);

CREATE INDEX idx_portfolio_history_timestamp ON ops_portfolio_history(timestamp);

CREATE INDEX idx_roundtable_queue_status ON ops_roundtable_queue(status);
CREATE INDEX idx_roundtable_queue_format ON ops_roundtable_queue(format);

CREATE INDEX idx_signals_token_confidence ON ops_signals(token, confidence);
CREATE INDEX idx_signals_source ON ops_signals(source);
CREATE INDEX idx_signals_created_at ON ops_signals(created_at);
CREATE INDEX idx_signals_processed ON ops_signals(processed);

CREATE INDEX idx_positions_status ON ops_positions(status);
CREATE INDEX idx_positions_token ON ops_positions(token);
CREATE INDEX idx_positions_opened_at ON ops_positions(opened_at);
CREATE INDEX idx_positions_unrealized_pnl_percent ON ops_positions(unrealized_pnl_percent);

CREATE INDEX idx_action_runs_action_type ON ops_action_runs(action_type);
CREATE INDEX idx_action_runs_status ON ops_action_runs(status);

-- ==================== FUNCTIONS AND TRIGGERS ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trading_proposals_updated_at BEFORE UPDATE ON ops_trading_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON ops_missions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mission_steps_updated_at BEFORE UPDATE ON ops_mission_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policy_updated_at BEFORE UPDATE ON ops_policy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trigger_rules_updated_at BEFORE UPDATE ON ops_trigger_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON ops_agent_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON ops_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roundtable_queue_updated_at BEFORE UPDATE ON ops_roundtable_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_relationships_updated_at BEFORE UPDATE ON ops_agent_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== END OF MIGRATION ====================