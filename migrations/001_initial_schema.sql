-- Cortex Capital - Initial Database Schema
-- Version: 1.0
-- Date: 2026-03-17

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('scout', 'operator', 'partner')),
  risk_profile VARCHAR(20) NOT NULL CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Brokerage connections
CREATE TABLE IF NOT EXISTS brokerage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  broker VARCHAR(50) NOT NULL CHECK (broker IN ('tradier', 'webull')),
  credentials_encrypted TEXT NOT NULL,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync TIMESTAMP
);

-- Portfolio snapshots
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP DEFAULT NOW(),
  total_value DECIMAL(15,2),
  positions JSONB,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rebalancing plans
CREATE TABLE IF NOT EXISTS rebalancing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  trades JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  executed_at TIMESTAMP
);

-- Trade history
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES rebalancing_plans(id) ON DELETE SET NULL,
  ticker VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity DECIMAL(15,4),
  price DECIMAL(15,2),
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_brokerage_connections_user_id ON brokerage_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_rebalancing_plans_user_id ON rebalancing_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_plans_status ON rebalancing_plans(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);

-- Trigger to update `updated_at` on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
