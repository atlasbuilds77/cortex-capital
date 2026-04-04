-- Helios Auto-Execution Migration
-- Adds Helios support to users table and creates signal/execution tracking tables

-- 1. Add Helios columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS helios_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS helios_position_size DECIMAL(5,2) NOT NULL DEFAULT 1.00;

-- 2. Create helios_signals table (incoming signals from Helios algo)
CREATE TABLE IF NOT EXISTS helios_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id     TEXT NOT NULL UNIQUE,          -- External signal ID from Helios
  ticker        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('long', 'short', 'call', 'put')),
  contract_symbol TEXT,                         -- Options contract symbol
  strike        DECIMAL(12,2),
  expiry        DATE,
  entry_price   DECIMAL(12,4),
  status        TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'executed', 'failed', 'skipped')),
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at   TIMESTAMPTZ,
  raw_payload   JSONB                           -- Full original payload for audit
);

CREATE INDEX IF NOT EXISTS idx_helios_signals_signal_id ON helios_signals(signal_id);
CREATE INDEX IF NOT EXISTS idx_helios_signals_received_at ON helios_signals(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_helios_signals_ticker ON helios_signals(ticker);

-- 3. Create helios_executions table (links a signal to a per-user trade)
CREATE TABLE IF NOT EXISTS helios_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id       UUID NOT NULL REFERENCES helios_signals(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,                -- References users.id
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'filled', 'failed', 'skipped')),
  broker_order_id TEXT,                         -- Returned by broker after submission
  quantity        DECIMAL(12,4),
  position_size_pct DECIMAL(5,2),              -- % of portfolio used at time of execution
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helios_executions_user_id ON helios_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_helios_executions_signal_id ON helios_executions(signal_id);
CREATE INDEX IF NOT EXISTS idx_helios_executions_status ON helios_executions(status);
CREATE INDEX IF NOT EXISTS idx_helios_executions_created_at ON helios_executions(created_at DESC);
