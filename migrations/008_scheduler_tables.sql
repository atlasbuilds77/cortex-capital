-- Cortex Capital - Scheduler Tables
-- Adds tables for tracking scheduler runs and job history
-- Version: 8.0
-- Date: 2026-03-24

-- Scheduler runs table
CREATE TABLE IF NOT EXISTS scheduler_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  run_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed', 'running')),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_job_name ON scheduler_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_run_at ON scheduler_runs(run_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_status ON scheduler_runs(status);

-- Job history table (for more detailed tracking)
CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  run_id UUID REFERENCES scheduler_runs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB
);

-- Indexes for job history
CREATE INDEX IF NOT EXISTS idx_job_history_job_name ON job_history(job_name);
CREATE INDEX IF NOT EXISTS idx_job_history_run_id ON job_history(run_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_status ON job_history(status);
CREATE INDEX IF NOT EXISTS idx_job_history_started_at ON job_history(started_at);

-- Add is_active column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;
END $$;

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Scheduler tables migration completed successfully.';
    RAISE NOTICE 'Added:';
    RAISE NOTICE '- scheduler_runs table for tracking job executions';
    RAISE NOTICE '- job_history table for detailed per-user job tracking';
    RAISE NOTICE '- is_active column to users table (default: true)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update scheduler to use is_active column in user queries';
    RAISE NOTICE '2. Run scheduler to test daily discussions';
    RAISE NOTICE '3. Monitor scheduler_runs table for job execution';
END $$;