-- Cortex Capital - Phase 3: Risk Profiles & Options Integration
-- Adds support for 3 risk profiles with LEAPS, spreads, covered calls, and day trading
-- Version: 3.0
-- Date: 2026-03-17

-- Update users table risk_profile enum to include ultra_aggressive
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_risk_profile_check;

ALTER TABLE users 
ADD CONSTRAINT users_risk_profile_check 
CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive', 'ultra_aggressive'));

-- Update user_preferences table risk_profile enum
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_risk_profile_check;

ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_risk_profile_check 
CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive', 'ultra_aggressive'));

-- Create options_positions table
CREATE TABLE IF NOT EXISTS options_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('LEAP', 'covered_call', 'bull_call_spread', 'bear_call_spread', 'iron_condor')),
  long_strike DECIMAL(10,2),
  short_strike DECIMAL(10,2),  -- NULL for LEAPS/covered calls
  expiry DATE NOT NULL,
  delta DECIMAL(5,3),
  theta DECIMAL(10,4),
  gamma DECIMAL(10,4),
  vega DECIMAL(10,4),
  premium_paid DECIMAL(10,2),
  premium_received DECIMAL(10,2),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed', 'expired', 'assigned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  notes TEXT
);

-- Create day_trades table
CREATE TABLE IF NOT EXISTS day_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  entry_price DECIMAL(10,2) NOT NULL,
  exit_price DECIMAL(10,2),
  shares INTEGER NOT NULL,
  pnl DECIMAL(10,2),
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  setup_type VARCHAR(50), -- 'breakout', 'momentum', 'news', 'reversal'
  exit_reason VARCHAR(50), -- 'target', 'stop_loss', 'time', 'manual'
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed', 'stopped')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create weekly_rotation table for momentum agent
CREATE TABLE IF NOT EXISTS weekly_rotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  sectors JSONB NOT NULL, -- {top: ['tech', 'healthcare'], bottom: ['energy', 'finance']}
  rotation_plan JSONB NOT NULL, -- {buys: [], sells: []}
  executed BOOLEAN DEFAULT FALSE,
  execution_date DATE,
  pnl DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Add options allocation to rebalancing_plans
ALTER TABLE rebalancing_plans 
ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20) CHECK (profile_type IN ('conservative', 'moderate', 'ultra_aggressive')),
ADD COLUMN IF NOT EXISTS options_allocation JSONB; -- {leaps: 0.20, spreads: 0.10, covered_calls: 0.15}

-- Add day_trading_allocation to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS day_trading_allocation DECIMAL(5,3) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS options_allocation JSONB DEFAULT '{"leaps": 0.0, "spreads": 0.0, "covered_calls": 0.0}'::JSONB;

-- Create options_chain_cache table for efficient options data retrieval
CREATE TABLE IF NOT EXISTS options_chain_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  expiry DATE NOT NULL,
  chain_data JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, expiry)
);

-- Create greeks_history table for tracking option Greeks over time
CREATE TABLE IF NOT EXISTS greeks_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_position_id UUID REFERENCES options_positions(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP DEFAULT NOW(),
  delta DECIMAL(5,3),
  theta DECIMAL(10,4),
  gamma DECIMAL(10,4),
  vega DECIMAL(10,4),
  implied_volatility DECIMAL(5,3),
  underlying_price DECIMAL(10,2)
);

-- Create risk_profile_configs table for storing profile-specific settings
CREATE TABLE IF NOT EXISTS risk_profile_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name VARCHAR(20) NOT NULL CHECK (profile_name IN ('conservative', 'moderate', 'ultra_aggressive')),
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_name)
);

-- Insert default risk profile configurations
INSERT INTO risk_profile_configs (profile_name, config) VALUES
('conservative', '{
  "rebalance": "quarterly",
  "threshold": 0.10,
  "instruments": ["ETFs only"],
  "tax_optimize": "maximize",
  "sectors": ["defensive"],
  "max_trades": 5,
  "execution_window": "10:00-14:00",
  "order_type": "limit"
}'::JSONB),
('moderate', '{
  "rebalance": "monthly",
  "threshold": 0.05,
  "instruments": ["stocks", "ETFs", "LEAPS"],
  "leaps": {
    "max_allocation": 0.20,
    "delta_range": [0.70, 0.80],
    "min_dte": 365
  },
  "tax_optimize": "balanced",
  "sectors": ["rotation allowed"],
  "max_trades": 15,
  "execution_window": "market_open",
  "order_type": "prefer_limit"
}'::JSONB),
('ultra_aggressive', '{
  "rebalance": "weekly",
  "threshold": 0.03,
  "instruments": ["stocks", "LEAPS", "spreads", "covered_calls"],
  "leaps": {
    "max_allocation": 0.30,
    "delta_range": [0.70, 0.80],
    "min_dte": 365
  },
  "spreads": {
    "max_allocation": 0.20,
    "max_risk_per_spread": 1000
  },
  "covered_calls": {
    "otm_range": [0.10, 0.15],
    "dte_range": [30, 45]
  },
  "day_trading": {
    "allocation": 0.20,
    "max_risk_per_trade": 0.05
  },
  "max_trades": "unlimited",
  "execution_window": "24/7",
  "order_type": "market"
}'::JSONB)
ON CONFLICT (profile_name) DO UPDATE SET config = EXCLUDED.config;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_options_positions_user_id ON options_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_options_positions_symbol ON options_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_options_positions_expiry ON options_positions(expiry);
CREATE INDEX IF NOT EXISTS idx_options_positions_status ON options_positions(status);
CREATE INDEX IF NOT EXISTS idx_day_trades_user_id ON day_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_day_trades_entry_time ON day_trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_day_trades_status ON day_trades(status);
CREATE INDEX IF NOT EXISTS idx_weekly_rotation_user_id ON weekly_rotation(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_rotation_week_start ON weekly_rotation(week_start);
CREATE INDEX IF NOT EXISTS idx_options_chain_cache_symbol ON options_chain_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_options_chain_cache_expiry ON options_chain_cache(expiry);
CREATE INDEX IF NOT EXISTS idx_greeks_history_option_position_id ON greeks_history(option_position_id);
CREATE INDEX IF NOT EXISTS idx_greeks_history_recorded_at ON greeks_history(recorded_at);

-- Update triggers for new tables
CREATE TRIGGER update_options_positions_updated_at BEFORE UPDATE ON options_positions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_options_chain_cache_updated_at BEFORE UPDATE ON options_chain_cache
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_profile_configs_updated_at BEFORE UPDATE ON risk_profile_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Phase 3 migration completed successfully.';
    RAISE NOTICE 'Added support for:';
    RAISE NOTICE '- 3 Risk Profiles: conservative, moderate, ultra_aggressive';
    RAISE NOTICE '- Options Trading: options_positions table';
    RAISE NOTICE '- Day Trading: day_trades table';
    RAISE NOTICE '- Momentum Rotation: weekly_rotation table';
    RAISE NOTICE '- Options Data: options_chain_cache, greeks_history';
    RAISE NOTICE '- Profile Configs: risk_profile_configs table';
END $$;