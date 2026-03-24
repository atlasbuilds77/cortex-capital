-- Add password_hash column to users table
-- Migration: 2026-03-24 15:11 PST

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster email lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
