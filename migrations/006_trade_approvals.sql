-- Migration: Trade Approvals System
-- Created: 2026-04-03
-- Description: Adds trade approval queue and user approval settings

-- Table: trade_approvals
-- Stores pending trades awaiting user approval
CREATE TABLE IF NOT EXISTS trade_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_data JSONB NOT NULL,
  reason_required TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'auto_executed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response_method TEXT CHECK (response_method IN ('dashboard', 'email', 'auto', 'timeout', 'error'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_trade_approvals_user_id ON trade_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_approvals_status ON trade_approvals(status);
CREATE INDEX IF NOT EXISTS idx_trade_approvals_expires ON trade_approvals(expires_at) WHERE status = 'pending';

-- Add approval_settings to user_trading_settings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_trading_settings' AND column_name = 'approval_settings'
  ) THEN
    ALTER TABLE user_trading_settings ADD COLUMN approval_settings JSONB DEFAULT '{
      "requireOptions": false,
      "requireLargePositions": false,
      "largePositionThresholdPct": 10,
      "requireNewSymbols": false,
      "requireDayTrades": false,
      "requireShorts": false,
      "autoExecuteTimeoutHours": 4,
      "notifyOnAutoExecute": true
    }';
  END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE trade_approvals IS 'Queue for trades requiring user approval before execution';
COMMENT ON COLUMN trade_approvals.trade_data IS 'JSON containing symbol, action, quantity, isOption, etc.';
COMMENT ON COLUMN trade_approvals.reason_required IS 'Why approval is required: options_trade, large_position, new_symbol, day_trade, short_position';
COMMENT ON COLUMN trade_approvals.expires_at IS 'When the approval expires and auto-executes (default 4 hours)';
COMMENT ON COLUMN trade_approvals.response_method IS 'How user responded: dashboard, email, auto (timeout), error (failed)';
