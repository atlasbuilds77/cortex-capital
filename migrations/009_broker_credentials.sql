-- BROKER CREDENTIALS TABLE
-- Stores encrypted API keys for user's connected brokers

CREATE TABLE IF NOT EXISTS broker_credentials (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Broker details
  broker_type TEXT NOT NULL CHECK (broker_type IN ('alpaca', 'tradier', 'robinhood')),
  
  -- Encrypted credentials (AES-256-GCM)
  encrypted_api_key TEXT NOT NULL,
  encrypted_api_secret TEXT,
  encryption_iv TEXT NOT NULL,
  
  -- Optional fields
  account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broker_credentials_user ON broker_credentials(user_id);
CREATE INDEX idx_broker_credentials_active ON broker_credentials(user_id, is_active) WHERE is_active = true;

COMMENT ON TABLE broker_credentials IS 'Encrypted broker API credentials per user';
