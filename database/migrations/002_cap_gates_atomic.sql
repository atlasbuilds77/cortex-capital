-- Migration: Atomic Cap Gates
-- Prevents race conditions in daily/hourly trade limits

-- Daily counters table
CREATE TABLE IF NOT EXISTS ops_daily_counters (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  trade_count INTEGER DEFAULT 0,
  analysis_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hourly counters table
CREATE TABLE IF NOT EXISTS ops_hourly_counters (
  hour_key TIMESTAMP PRIMARY KEY, -- Truncated to hour
  trade_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Atomic increment functions
CREATE OR REPLACE FUNCTION increment_daily_trade_count(max_count INTEGER)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER) AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Ensure today's record exists
  INSERT INTO ops_daily_counters (date, trade_count)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (date) DO NOTHING;
  
  -- Try to increment if under limit
  UPDATE ops_daily_counters
  SET trade_count = trade_count + 1, updated_at = CURRENT_TIMESTAMP
  WHERE date = CURRENT_DATE AND trade_count < max_count
  RETURNING trade_count INTO new_count;
  
  -- Return result
  IF new_count IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, new_count;
  ELSE
    -- Already at limit, return current count
    SELECT trade_count INTO new_count 
    FROM ops_daily_counters 
    WHERE date = CURRENT_DATE;
    RETURN QUERY SELECT FALSE, COALESCE(new_count, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_hourly_trade_count(max_count INTEGER)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER) AS $$
DECLARE
  current_hour TIMESTAMP;
  new_count INTEGER;
BEGIN
  current_hour := date_trunc('hour', CURRENT_TIMESTAMP);
  
  -- Ensure current hour's record exists
  INSERT INTO ops_hourly_counters (hour_key, trade_count)
  VALUES (current_hour, 0)
  ON CONFLICT (hour_key) DO NOTHING;
  
  -- Try to increment if under limit
  UPDATE ops_hourly_counters
  SET trade_count = trade_count + 1, updated_at = CURRENT_TIMESTAMP
  WHERE hour_key = current_hour AND trade_count < max_count
  RETURNING trade_count INTO new_count;
  
  -- Return result
  IF new_count IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, new_count;
  ELSE
    -- Already at limit
    SELECT trade_count INTO new_count 
    FROM ops_hourly_counters 
    WHERE hour_key = current_hour;
    RETURN QUERY SELECT FALSE, COALESCE(new_count, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Decrement functions (for rollback on failed trades)
CREATE OR REPLACE FUNCTION decrement_daily_trade_count()
RETURNS VOID AS $$
BEGIN
  UPDATE ops_daily_counters
  SET trade_count = GREATEST(0, trade_count - 1), updated_at = CURRENT_TIMESTAMP
  WHERE date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_hourly_trade_count()
RETURNS VOID AS $$
BEGIN
  UPDATE ops_hourly_counters
  SET trade_count = GREATEST(0, trade_count - 1), updated_at = CURRENT_TIMESTAMP
  WHERE hour_key = date_trunc('hour', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Cleanup old counters (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_counters()
RETURNS VOID AS $$
BEGIN
  DELETE FROM ops_hourly_counters 
  WHERE hour_key < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_counters_date ON ops_daily_counters(date);
CREATE INDEX IF NOT EXISTS idx_hourly_counters_hour ON ops_hourly_counters(hour_key);
