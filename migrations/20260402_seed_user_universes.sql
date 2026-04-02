-- Seed per-user universes for existing accounts so agent memory and
-- preference isolation is initialized before the first discussion/trade.

INSERT INTO user_universes (
  user_id,
  tier,
  agent_memories,
  trade_history,
  preferences,
  personality_overrides,
  created_at,
  updated_at
)
SELECT
  u.id::text,
  COALESCE(u.tier, 'free'),
  '{}'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'riskTolerance',
    CASE
      WHEN u.risk_profile = 'conservative' THEN 'conservative'
      WHEN u.risk_profile IN ('aggressive', 'ultra_aggressive') THEN 'aggressive'
      ELSE 'moderate'
    END,
    'sectors',
    COALESCE(u.sector_interests, '[]'::jsonb),
    'tradingStyle',
    COALESCE(NULLIF(u.risk_profile, ''), 'balanced')
  ),
  '{}'::jsonb,
  NOW(),
  NOW()
FROM users u
ON CONFLICT (user_id) DO NOTHING;
