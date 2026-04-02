-- Ensure per-user universe has durable memory/trade payload columns.
-- Required by lib/agents/user-universe-db.ts.

ALTER TABLE user_universes
  ADD COLUMN IF NOT EXISTS agent_memories jsonb,
  ADD COLUMN IF NOT EXISTS trade_history jsonb;

UPDATE user_universes
SET
  agent_memories = COALESCE(agent_memories, '{}'::jsonb),
  trade_history = COALESCE(trade_history, '[]'::jsonb)
WHERE agent_memories IS NULL
   OR trade_history IS NULL;

ALTER TABLE user_universes
  ALTER COLUMN agent_memories SET DEFAULT '{}'::jsonb,
  ALTER COLUMN trade_history SET DEFAULT '[]'::jsonb,
  ALTER COLUMN agent_memories SET NOT NULL,
  ALTER COLUMN trade_history SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_universes_updated_at ON user_universes(updated_at DESC);
