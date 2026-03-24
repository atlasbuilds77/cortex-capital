-- TRADE HISTORY TABLE
-- Logs all executed trades for each user

CREATE TABLE IF NOT EXISTS trade_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Trade details
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  fill_price DECIMAL(10, 2),
  
  -- Broker details
  order_id TEXT,
  broker_type TEXT,
  
  -- Link to decision
  decision_id TEXT,
  
  -- Timestamps
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_history_user ON trade_history(user_id);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX idx_trade_history_executed_at ON trade_history(executed_at DESC);

COMMENT ON TABLE trade_history IS 'Historical log of all executed trades per user';
