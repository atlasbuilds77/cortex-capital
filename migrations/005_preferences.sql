-- Cortex Capital - Phase 4: Personalized Onboarding System
-- Adds comprehensive preference tracking and onboarding flow
-- Version: 4.0
-- Date: 2026-03-21

-- Enhance user_preferences table with detailed preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS goal VARCHAR(50) CHECK (goal IN ('retirement', 'wealth_building', 'short_term', 'income', 'speculation')),
ADD COLUMN IF NOT EXISTS time_horizon VARCHAR(20) CHECK (time_horizon IN ('1-3 years', '3-5 years', '5-10 years', '10+ years')),
ADD COLUMN IF NOT EXISTS sectors JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS themes JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS must_have_stocks JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS excluded_stocks JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS excluded_sectors JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS dividend_preference VARCHAR(20) CHECK (dividend_preference IN ('none', 'some', 'focus')),
ADD COLUMN IF NOT EXISTS covered_calls_interest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS options_comfort VARCHAR(20) CHECK (options_comfort IN ('none', 'leaps_only', 'full_options')),
ADD COLUMN IF NOT EXISTS max_options_allocation DECIMAL(5,2) DEFAULT 0.0 CHECK (max_options_allocation >= 0 AND max_options_allocation <= 40),
ADD COLUMN IF NOT EXISTS day_trading_interest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_daily_risk DECIMAL(5,2) DEFAULT 0.0 CHECK (max_daily_risk >= 0 AND max_daily_risk <= 5);

-- Create user_custom_stocks table (tracks analysis of user picks)
CREATE TABLE IF NOT EXISTS user_custom_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  
  -- Analysis results
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  investable BOOLEAN NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'in_portfolio')),
  added_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  
  -- Analysis details (stored as JSONB)
  analysis_data JSONB,
  
  -- Notes
  user_notes TEXT,
  system_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, symbol)
);

-- Create user_exclusions table (ESG preferences)
CREATE TABLE IF NOT EXISTS user_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exclusion_type VARCHAR(50) NOT NULL, -- 'sector', 'stock', 'esg_category'
  exclusion_value VARCHAR(100) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, exclusion_type, exclusion_value)
);

-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 13,
  completed_steps JSONB DEFAULT '[]'::JSONB,
  
  -- Step-by-step data collection
  step_data JSONB DEFAULT '{}'::JSONB,
  
  -- Generated preview portfolios
  preview_data JSONB,
  
  -- Recommended tier based on preferences
  recommended_tier VARCHAR(20) CHECK (recommended_tier IN ('scout', 'operator', 'partner')),
  
  -- Completion tracking
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create stock_analysis_cache table (cache API results)
CREATE TABLE IF NOT EXISTS stock_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  
  -- Analysis results
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  investable BOOLEAN NOT NULL,
  
  -- Detailed metrics
  market_cap BIGINT,
  pe_ratio DECIMAL(10,2),
  revenue_growth DECIMAL(5,2),
  debt_to_equity DECIMAL(5,2),
  avg_volume BIGINT,
  bid_ask_spread DECIMAL(10,4),
  
  -- Options availability
  has_options BOOLEAN DEFAULT FALSE,
  has_weeklies BOOLEAN DEFAULT FALSE,
  has_leaps BOOLEAN DEFAULT FALSE,
  options_open_interest INTEGER,
  
  -- Warnings and alternatives
  warnings JSONB DEFAULT '[]'::JSONB,
  alternatives JSONB DEFAULT '[]'::JSONB,
  
  -- Full analysis (for reference)
  full_analysis JSONB,
  
  -- Cache metadata
  data_source VARCHAR(50), -- 'tradier', 'polygon', 'alpha_vantage'
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(symbol)
);

-- Create portfolio_templates table (pre-built portfolios)
CREATE TABLE IF NOT EXISTS portfolio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('scout', 'operator', 'partner')),
  risk_profile VARCHAR(20) NOT NULL CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  
  -- Template configuration
  allocations JSONB NOT NULL,
  sectors JSONB DEFAULT '[]'::JSONB,
  themes JSONB DEFAULT '[]'::JSONB,
  
  -- Metrics
  expected_return DECIMAL(5,2),
  expected_volatility DECIMAL(5,2),
  sharpe_ratio DECIMAL(5,3),
  max_drawdown DECIMAL(5,2),
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(name, tier)
);

-- Create preference_change_log table (audit trail)
CREATE TABLE IF NOT EXISTS preference_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'add_stock', 'remove_stock', 'update_risk', etc.
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  changed_by VARCHAR(50) DEFAULT 'user'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_custom_stocks_user_id ON user_custom_stocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_stocks_symbol ON user_custom_stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_user_custom_stocks_status ON user_custom_stocks(status);
CREATE INDEX IF NOT EXISTS idx_user_exclusions_user_id ON user_exclusions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_cache_symbol ON stock_analysis_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_cache_expires_at ON stock_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_tier ON portfolio_templates(tier);
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_risk_profile ON portfolio_templates(risk_profile);
CREATE INDEX IF NOT EXISTS idx_preference_change_log_user_id ON preference_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_change_log_changed_at ON preference_change_log(changed_at);

-- Update triggers
CREATE TRIGGER update_user_custom_stocks_updated_at BEFORE UPDATE ON user_custom_stocks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_analysis_cache_updated_at BEFORE UPDATE ON stock_analysis_cache
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_templates_updated_at BEFORE UPDATE ON portfolio_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default portfolio templates
INSERT INTO portfolio_templates (name, description, tier, risk_profile, allocations, sectors, themes, expected_return, expected_volatility, sharpe_ratio, max_drawdown) VALUES
-- Scout templates
('Conservative Growth', 'Broad market ETFs with dividend focus', 'scout', 'conservative', 
 '[{"symbol": "SPY", "allocation": 60}, {"symbol": "SCHD", "allocation": 40}]'::JSONB,
 '["consumer_staples", "healthcare"]'::JSONB,
 '["dividend_aristocrats", "value_investing"]'::JSONB,
 7.5, 12.0, 1.2, -15.0),

('Tech & Healthcare Balance', 'Growth sectors with stability', 'scout', 'moderate',
 '[{"symbol": "SPY", "allocation": 50}, {"symbol": "XLK", "allocation": 30}, {"symbol": "XLV", "allocation": 20}]'::JSONB,
 '["technology", "healthcare"]'::JSONB,
 '["ai_and_ml", "growth_investing"]'::JSONB,
 10.0, 18.0, 1.3, -25.0),

-- Operator templates
('Growth with LEAPS', 'Individual stocks + leveraged options', 'operator', 'moderate',
 '[{"symbol": "SPY", "allocation": 35}, {"symbol": "AAPL", "allocation": 15}, {"symbol": "MSFT", "allocation": 15}, {"symbol": "NVDA", "allocation": 10}, {"symbol": "NVDA_LEAP", "allocation": 15}, {"symbol": "XLK", "allocation": 10}]'::JSONB,
 '["technology", "semiconductors"]'::JSONB,
 '["ai_and_ml", "cloud_computing"]'::JSONB,
 12.0, 23.0, 1.4, -35.0),

-- Partner templates
('Aggressive Options Overlay', 'Full options strategies + day trading', 'partner', 'aggressive',
 '[{"symbol": "SPY", "allocation": 20}, {"symbol": "QQQ", "allocation": 20}, {"symbol": "TSLA", "allocation": 15}, {"symbol": "LEAPS", "allocation": 15}, {"symbol": "SPREADS", "allocation": 10}, {"symbol": "COVERED_CALLS", "allocation": 10}, {"symbol": "DAY_TRADING", "allocation": 10}]'::JSONB,
 '["technology", "ev_batteries"]'::JSONB,
 '["electric_vehicles", "growth_investing"]'::JSONB,
 19.0, 35.0, 1.6, -50.0)

ON CONFLICT (name, tier) DO UPDATE SET
  description = EXCLUDED.description,
  allocations = EXCLUDED.allocations,
  sectors = EXCLUDED.sectors,
  themes = EXCLUDED.themes;

-- Update existing user_preferences with default values
UPDATE user_preferences 
SET 
  goal = 'wealth_building',
  time_horizon = '10+ years',
  sectors = '["technology", "healthcare"]'::JSONB,
  themes = '["ai_and_ml", "growth_investing"]'::JSONB,
  dividend_preference = 'some',
  covered_calls_interest = FALSE,
  options_comfort = 'none',
  max_options_allocation = 0.0,
  day_trading_interest = FALSE,
  max_daily_risk = 0.0
WHERE goal IS NULL;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Phase 4 migration completed successfully.';
    RAISE NOTICE 'Added support for:';
    RAISE NOTICE '- Enhanced user_preferences with detailed preferences';
    RAISE NOTICE '- user_custom_stocks: Track and analyze user stock picks';
    RAISE NOTICE '- user_exclusions: ESG and values-based exclusions';
    RAISE NOTICE '- onboarding_progress: Step-by-step onboarding flow';
    RAISE NOTICE '- stock_analysis_cache: Cache stock quality analysis';
    RAISE NOTICE '- portfolio_templates: Pre-built portfolio configurations';
    RAISE NOTICE '- preference_change_log: Audit trail for changes';
    RAISE NOTICE '';
    RAISE NOTICE 'THE DIFFERENTIATOR:';
    RAISE NOTICE '- We VALIDATE user picks (quality scoring 0-100)';
    RAISE NOTICE '- We WARN about concentration risk';
    RAISE NOTICE '- We SUGGEST alternatives';
    RAISE NOTICE '- We BUILD custom portfolios based on their interests';
    RAISE NOTICE '- Better than Betterment/Wealthfront/M1 ⚡';
END $$;
