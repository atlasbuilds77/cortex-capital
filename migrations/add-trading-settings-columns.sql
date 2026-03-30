-- Add trading settings columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_profile VARCHAR(20) DEFAULT 'moderate';
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_position_size DECIMAL(15,2) DEFAULT 10000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_daily_loss DECIMAL(15,2) DEFAULT 500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_symbols TEXT[] DEFAULT ARRAY['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN'];
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_hours_start VARCHAR(5) DEFAULT '09:30';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_hours_end VARCHAR(5) DEFAULT '16:00';

-- Add index for risk profile
CREATE INDEX IF NOT EXISTS idx_users_risk_profile ON users(risk_profile);

-- Add index for auto_execute_enabled (for cron queries)
CREATE INDEX IF NOT EXISTS idx_users_auto_execute ON users(auto_execute_enabled) WHERE auto_execute_enabled = true;