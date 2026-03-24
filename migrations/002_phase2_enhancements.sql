-- Cortex Capital - Phase 2 Enhancements
-- Adds tables and columns for STRATEGIST, EXECUTOR, REPORTER agents
-- Version: 2.0
-- Date: 2026-03-17

-- Add columns to rebalancing_plans table for STRATEGIST
ALTER TABLE rebalancing_plans 
ADD COLUMN IF NOT EXISTS target_allocation JSONB,
ADD COLUMN IF NOT EXISTS reasoning JSONB,
ADD COLUMN IF NOT EXISTS estimated_execution_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS estimated_tax_impact DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS plan_data JSONB; -- Store full plan JSON for reference

-- Add columns to trades table for EXECUTOR
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS slippage DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('pending', 'filled', 'partial', 'rejected', 'cancelled')),
ADD COLUMN IF NOT EXISTS order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS execution_report JSONB;

-- Create email preferences table for REPORTER
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_frequency VARCHAR(20) NOT NULL CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),
  notification_types JSONB NOT NULL, -- Array of notification types
  last_sent TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create email history table
CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB
);

-- Create market data cache table for REPORTER market updates
CREATE TABLE IF NOT EXISTS market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(50) NOT NULL, -- 'daily_update', 'sector_performance', 'volatility'
  period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  data_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_type, period, data_date)
);

-- Create user preferences table for STRATEGIST
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  risk_profile VARCHAR(20) NOT NULL CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  investment_horizon VARCHAR(20) NOT NULL CHECK (investment_horizon IN ('short', 'medium', 'long')),
  constraints JSONB NOT NULL, -- {never_sell: [], max_position_size: 25, max_sector_exposure: 40}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create execution history table for EXECUTOR
CREATE TABLE IF NOT EXISTS execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id VARCHAR(100) NOT NULL,
  plan_id UUID REFERENCES rebalancing_plans(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(50) NOT NULL,
  config JSONB NOT NULL, -- Execution configuration used
  report JSONB NOT NULL, -- Full execution report
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(execution_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_data_date ON market_data_cache(data_date);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_user_id ON execution_history(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_created_at ON execution_history(created_at);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_order_id ON trades(order_id);

-- Update trigger for email_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON email_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_data_cache_updated_at BEFORE UPDATE ON market_data_cache
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email preferences for existing users
INSERT INTO email_preferences (user_id, report_frequency, notification_types)
SELECT id, 'weekly', '["trade_execution", "portfolio_alert", "market_update"]'::JSONB
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Insert default user preferences for existing users
INSERT INTO user_preferences (user_id, risk_profile, investment_horizon, constraints)
SELECT id, 'moderate', 'medium', '{"never_sell": [], "max_position_size": 25, "max_sector_exposure": 40}'::JSONB
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 migration completed successfully.';
    RAISE NOTICE 'Added support for:';
    RAISE NOTICE '- STRATEGIST: Enhanced rebalancing_plans, added user_preferences';
    RAISE NOTICE '- EXECUTOR: Enhanced trades table, added execution_history';
    RAISE NOTICE '- REPORTER: Added email_preferences, email_history, market_data_cache';
END $$;