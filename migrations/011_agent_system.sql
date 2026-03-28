-- Migration 011: Agent System Tables
-- Created: 2026-03-26
-- Purpose: Migrate agent data from JSON to PostgreSQL

-- 1. Agent Relationships Table
CREATE TABLE IF NOT EXISTS agent_relationships (
    id SERIAL PRIMARY KEY,
    agent_a TEXT NOT NULL,
    agent_b TEXT NOT NULL,
    score INTEGER DEFAULT 50,
    interactions INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_agent_pair UNIQUE (agent_a, agent_b)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_relationships_agent_a ON agent_relationships(agent_a);
CREATE INDEX IF NOT EXISTS idx_agent_relationships_agent_b ON agent_relationships(agent_b);

-- 2. Agent Relationship Shifts Table (Audit Log)
CREATE TABLE IF NOT EXISTS agent_relationship_shifts (
    id SERIAL PRIMARY KEY,
    agent_a TEXT NOT NULL,
    agent_b TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    score_before INTEGER,
    score_after INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying history by agent pair
CREATE INDEX IF NOT EXISTS idx_relationship_shifts_agents ON agent_relationship_shifts(agent_a, agent_b);
CREATE INDEX IF NOT EXISTS idx_relationship_shifts_created ON agent_relationship_shifts(created_at DESC);

-- 3. Agent Memories Table
CREATE TABLE IF NOT EXISTS agent_memories (
    id SERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL,
    user_id TEXT DEFAULT 'system',
    memory_type TEXT NOT NULL CHECK (memory_type IN ('trade_call', 'insight', 'discussion')),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON agent_memories(created_at DESC);

-- 4. User Universes Table
CREATE TABLE IF NOT EXISTS user_universes (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    tier TEXT DEFAULT 'free',
    preferences JSONB DEFAULT '{}',
    personality_overrides JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_universes_user_id ON user_universes(user_id);

-- 5. Phone Booth Sessions Table
CREATE TABLE IF NOT EXISTS phone_booth_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_phone_booth_user ON phone_booth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_booth_agent ON phone_booth_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_booth_user_agent ON phone_booth_sessions(user_id, agent_id);

-- Trigger to auto-update updated_at on user_universes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_universes_updated_at ON user_universes;
CREATE TRIGGER update_user_universes_updated_at
    BEFORE UPDATE ON user_universes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phone_booth_sessions_updated_at ON phone_booth_sessions;
CREATE TRIGGER update_phone_booth_sessions_updated_at
    BEFORE UPDATE ON phone_booth_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on agent_relationships
DROP TRIGGER IF EXISTS update_agent_relationships_updated_at ON agent_relationships;
CREATE TRIGGER update_agent_relationships_updated_at
    BEFORE UPDATE ON agent_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
