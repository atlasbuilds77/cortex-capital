-- Helios Discord Role Gating Migration
-- Adds has_helios_role flag and discord_access_token to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_helios_role BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_access_token TEXT;

-- Index for efficient signal fan-out query (helios_enabled + has_helios_role)
CREATE INDEX IF NOT EXISTS idx_users_helios_enabled_role
  ON users (helios_enabled, has_helios_role)
  WHERE helios_enabled = true AND has_helios_role = true;

COMMENT ON COLUMN users.has_helios_role IS 'True if user holds Discord role 1440026585053794465 (Helios access)';
COMMENT ON COLUMN users.discord_access_token IS 'Discord OAuth access token — used to re-check guild membership';
