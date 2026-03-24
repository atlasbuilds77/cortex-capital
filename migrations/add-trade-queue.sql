-- TRADE QUEUE TABLE
-- Stores pending/approved/rejected trades from agent discussions

CREATE TABLE IF NOT EXISTS trade_queue (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'recovery', 'scout', 'operator', 'partner')),
  
  -- Trade decision data (JSON)
  decision_data JSONB NOT NULL,
  
  -- Approval workflow
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  approval_required BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Execution result
  execution_result JSONB,
  executed_at TIMESTAMPTZ,
  
  -- Timestamps
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT trade_queue_user_idx UNIQUE (user_id, id)
);

CREATE INDEX idx_trade_queue_user ON trade_queue(user_id);
CREATE INDEX idx_trade_queue_status ON trade_queue(status);
CREATE INDEX idx_trade_queue_queued_at ON trade_queue(queued_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_trade_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trade_queue_updated_at 
  BEFORE UPDATE ON trade_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_queue_updated_at();

COMMENT ON TABLE trade_queue IS 'Pending/approved/executed trades from agent discussions';
