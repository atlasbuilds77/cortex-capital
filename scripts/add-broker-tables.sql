-- Broker credentials storage (encrypted)
CREATE TABLE IF NOT EXISTS broker_credentials (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  broker VARCHAR(50) NOT NULL,
  encrypted_username TEXT NOT NULL,
  username_iv VARCHAR(64) NOT NULL,
  username_tag VARCHAR(64) NOT NULL,
  encrypted_password TEXT NOT NULL,
  password_iv VARCHAR(64) NOT NULL,
  password_tag VARCHAR(64) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, broker)
);

-- Trade execution logs
CREATE TABLE IF NOT EXISTS trade_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  broker VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  limit_price DECIMAL(18, 8),
  stop_price DECIMAL(18, 8),
  status VARCHAR(50) NOT NULL,
  order_id VARCHAR(255),
  filled_price DECIMAL(18, 8),
  filled_quantity DECIMAL(18, 8),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broker_credentials_user ON broker_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_logs_user ON trade_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_logs_created ON trade_logs(created_at);
