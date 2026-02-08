-- Seed: Initial Policies (7 policy keys)
-- Created: Feb 7, 2026

-- 1. auto_approve
INSERT INTO ops_policy (key, value, description) VALUES (
    'auto_approve',
    '{
        "enabled": true,
        "allowed_step_kinds": [
            "analyze_signal",
            "monitor_position",
            "calculate_risk"
        ],
        "requires_roundtable": [
            "execute_trade",
            "close_position",
            "scale_position"
        ]
    }'::jsonb,
    'Controls which step kinds can be auto-approved vs require roundtable discussion'
);

-- 2. trade_limits
INSERT INTO ops_policy (key, value, description) VALUES (
    'trade_limits',
    '{
        "max_daily_trades": 8,
        "max_open_positions": 3,
        "max_position_size_usd": 60,
        "min_confidence": 0.60
    }'::jsonb,
    'Daily trading limits and position constraints'
);

-- 3. risk_controls
INSERT INTO ops_policy (key, value, description) VALUES (
    'risk_controls',
    '{
        "max_portfolio_risk": 0.05,
        "max_single_position_risk": 0.02,
        "stop_loss_required": true,
        "default_stop_loss_pct": -0.30
    }'::jsonb,
    'Risk management controls for portfolio and individual positions'
);

-- 4. roundtable_policy
INSERT INTO ops_policy (key, value, description) VALUES (
    'roundtable_policy',
    '{
        "enabled": true,
        "max_daily_conversations": 8,
        "require_for_large_trades": true,
        "large_trade_threshold_usd": 40
    }'::jsonb,
    'Rules for roundtable conversations and when they are required'
);

-- 5. memory_influence_policy
INSERT INTO ops_policy (key, value, description) VALUES (
    'memory_influence_policy',
    '{
        "enabled": true,
        "probability": 0.30,
        "min_confidence": 0.60,
        "types_used": ["strategy", "lesson", "pattern"]
    }'::jsonb,
    'Controls how agent memories influence decision making'
);

-- 6. relationship_drift_policy
INSERT INTO ops_policy (key, value, description) VALUES (
    'relationship_drift_policy',
    '{
        "enabled": true,
        "max_drift_per_conversation": 0.03,
        "min_affinity": 0.10,
        "max_affinity": 0.95
    }'::jsonb,
    'Controls how agent relationships evolve over interactions'
);

-- 7. initiative_policy
INSERT INTO ops_policy (key, value, description) VALUES (
    'initiative_policy',
    '{
        "enabled": false,
        "min_memories_required": 5,
        "max_proposals_per_day": 3,
        "cooldown_hours": 4
    }'::jsonb,
    'Controls when agents can take initiative and propose work on their own'
);

-- Verify the insertions
SELECT key, description FROM ops_policy ORDER BY key;