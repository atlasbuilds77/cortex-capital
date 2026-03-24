-- Authentication & Sessions Tables
-- Adds support for JWT sessions, password resets, and audit logs
-- Version: 6.0
-- Date: 2026-03-21

-- Sessions table for refresh token management
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45), -- IPv6 max length
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Audit log for security events
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'password_change', 'account_created', etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Update user preferences to include new fields
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS day_trading_allocation DECIMAL(3,2) DEFAULT 0.0 CHECK (day_trading_allocation BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS options_allocation DECIMAL(3,2) DEFAULT 0.0 CHECK (options_allocation BETWEEN 0 AND 1);

-- Add email_verified column to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Auth tables migration completed successfully.';
    RAISE NOTICE 'Added:';
    RAISE NOTICE '- sessions table for JWT refresh tokens';
    RAISE NOTICE '- password_reset_tokens table';
    RAISE NOTICE '- audit_log table for security events';
    RAISE NOTICE '- day_trading_allocation and options_allocation to user_preferences';
    RAISE NOTICE '- email_verified to users';
END $$;
