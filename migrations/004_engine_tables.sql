-- Migration 004: Portfolio Engine Tables
-- Adds tables for analysis results and reports

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('hold', 'rebalance', 'urgent_action')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT NOT NULL,
  metrics JSONB,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_user_date ON analysis_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_type ON reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- Comments
COMMENT ON TABLE analysis_results IS 'Portfolio analysis results from ANALYST agent';
COMMENT ON TABLE reports IS 'Generated reports from REPORTER agent';
COMMENT ON COLUMN analysis_results.action IS 'Recommended action: hold, rebalance, or urgent_action';
COMMENT ON COLUMN analysis_results.confidence IS 'Confidence score 0-100';
COMMENT ON COLUMN reports.report_type IS 'Report frequency: daily, weekly, or monthly';
