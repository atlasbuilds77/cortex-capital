-- AGENT DISCUSSIONS TABLE
-- Stores portfolio discussions for each user

CREATE TABLE IF NOT EXISTS agent_discussions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discussion_type TEXT NOT NULL CHECK (discussion_type IN ('review', 'risk_assessment', 'opportunities', 'morning_briefing')),
  
  -- Discussion content
  messages JSONB NOT NULL,
  decisions JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT agent_discussions_user_idx UNIQUE (user_id, id)
);

CREATE INDEX idx_agent_discussions_user ON agent_discussions(user_id);
CREATE INDEX idx_agent_discussions_type ON agent_discussions(discussion_type);
CREATE INDEX idx_agent_discussions_started_at ON agent_discussions(started_at DESC);

COMMENT ON TABLE agent_discussions IS 'Portfolio discussions between AI agents for each user';
