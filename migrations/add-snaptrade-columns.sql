-- Add SnapTrade columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS snaptrade_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS snaptrade_user_secret VARCHAR(255);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_users_snaptrade ON users(snaptrade_user_id) WHERE snaptrade_user_id IS NOT NULL;

-- Trade log table (if not exists)
CREATE TABLE IF NOT EXISTS trade_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  limit_price DECIMAL(15,4),
  stop_price DECIMAL(15,4),
  status VARCHAR(20) DEFAULT 'submitted',
  broker_order_id VARCHAR(255),
  fill_price DECIMAL(15,4),
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_log_user ON trade_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_log_created ON trade_log(created_at DESC);
