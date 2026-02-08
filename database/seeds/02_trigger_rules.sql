-- Seed: Trigger Rules (12 triggers: 6 reactive + 6 proactive)
-- Created: Feb 7, 2026

-- ==================== REACTIVE TRIGGERS (respond to events) ====================

-- 1. trade_big_win
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'trade_big_win',
    'trade_closed',
    '{
        "pnl_percent": { "$gt": 0.50 },
        "outcome_type": "win"
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "growth",
        "step_kind": "analyze",
        "title_template": "Analyze big win: {{trade_id}}",
        "payload_template": {
            "analysis_type": "success_pattern",
            "trade_id": "{{trade_id}}",
            "focus": "why_it_worked"
        }
    }'::jsonb,
    60,
    'When trade closes with PnL > +50%, GROWTH analyzes why it worked'
);

-- 2. trade_big_loss
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'trade_big_loss',
    'trade_closed',
    '{
        "pnl_percent": { "$lt": -0.30 },
        "outcome_type": "loss"
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "sage",
        "step_kind": "analyze",
        "title_template": "Diagnose big loss: {{trade_id}}",
        "payload_template": {
            "analysis_type": "failure_analysis",
            "trade_id": "{{trade_id}}",
            "focus": "what_went_wrong"
        }
    }'::jsonb,
    60,
    'When trade closes with PnL < -30%, SAGE diagnoses what went wrong'
);

-- 3. position_at_risk
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'position_at_risk',
    'position_updated',
    '{
        "unrealized_pnl_percent": { "$lt": -0.20 },
        "status": "open"
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "atlas",
        "step_kind": "roundtable_conversation",
        "title_template": "Review at-risk position: {{token}}",
        "payload_template": {
            "format": "position_review",
            "participants": ["atlas", "sage", "scout"],
            "topic": "Position at -20%: hold or cut?",
            "position_id": "{{position_id}}"
        }
    }'::jsonb,
    30,
    'When open position down -20%, ATLAS reviews position, decides hold/cut'
);

-- 4. signal_high_confidence
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'signal_high_confidence',
    'signal_created',
    '{
        "confidence": { "$gt": 0.80 },
        "processed": false
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "scout",
        "step_kind": "analyze",
        "title_template": "Prepare execution for high-confidence signal: {{token}}",
        "payload_template": {
            "signal_id": "{{signal_id}}",
            "action": "prepare_execution_plan",
            "urgency": "high"
        }
    }'::jsonb,
    15,
    'When signal confidence > 80%, SCOUT prepares execution plan'
);

-- 5. max_positions_reached
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'max_positions_reached',
    'position_opened',
    '{
        "open_position_count": { "$gte": 3 }
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "observer",
        "step_kind": "analyze",
        "title_template": "Flag max positions reached ({{count}} open)",
        "payload_template": {
            "analysis_type": "exposure_warning",
            "current_count": "{{open_position_count}}",
            "max_allowed": 3,
            "next_action": "notify_sage"
        }
    }'::jsonb,
    60,
    'When 3+ open positions, OBSERVER flags exposure, SAGE reviews'
);

-- 6. stop_loss_hit
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'stop_loss_hit',
    'position_closed',
    '{
        "close_reason": "stop_loss",
        "outcome_type": "loss"
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "growth",
        "step_kind": "analyze",
        "title_template": "Analyze stop loss hit: {{token}}",
        "payload_template": {
            "analysis_type": "entry_timing",
            "position_id": "{{position_id}}",
            "focus": "why_stop_loss_triggered"
        }
    }'::jsonb,
    30,
    'When position hits stop loss, GROWTH analyzes entry timing'
);

-- ==================== PROACTIVE TRIGGERS (scheduled) ====================

-- 7. proactive_scan_signals
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_scan_signals',
    'scheduled_scan',
    '{
        "schedule_type": "interval",
        "interval_minutes": 30
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "intel",
        "step_kind": "analyze",
        "title_template": "Proactive signal scan",
        "payload_template": {
            "scan_type": "opportunity_scan",
            "topics": ["top_gainers", "KOL_activity", "volume_spikes"],
            "depth": "quick"
        }
    }'::jsonb,
    30,
    'Every 30 minutes: INTEL scans for new opportunities'
);

-- 8. proactive_review_positions
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_review_positions',
    'scheduled_review',
    '{
        "schedule_type": "interval",
        "interval_hours": 2
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "atlas",
        "step_kind": "roundtable_conversation",
        "title_template": "Proactive position review",
        "payload_template": {
            "format": "position_review",
            "participants": ["atlas", "sage", "scout", "growth"],
            "topic": "Scheduled position review",
            "review_type": "comprehensive"
        }
    }'::jsonb,
    120,
    'Every 2 hours: ATLAS reviews all open positions'
);

-- 9. proactive_risk_analysis
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_risk_analysis',
    'scheduled_analysis',
    '{
        "schedule_type": "interval",
        "interval_hours": 4
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "sage",
        "step_kind": "calculate_risk",
        "title_template": "Proactive risk analysis",
        "payload_template": {
            "analysis_type": "portfolio_risk",
            "topics": ["exposure", "correlation", "drawdown"],
            "depth": "comprehensive"
        }
    }'::jsonb,
    240,
    'Every 4 hours: SAGE performs portfolio risk assessment'
);

-- 10. proactive_performance_review
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_performance_review',
    'scheduled_review',
    '{
        "schedule_type": "interval",
        "interval_hours": 6
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "growth",
        "step_kind": "analyze",
        "title_template": "Proactive performance review",
        "payload_template": {
            "analysis_type": "trade_performance",
            "topics": ["win_rate", "avg_winner", "avg_loser"],
            "timeframe": "recent_24h"
        }
    }'::jsonb,
    360,
    'Every 6 hours: GROWTH analyzes recent trade performance'
);

-- 11. proactive_market_research
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_market_research',
    'scheduled_research',
    '{
        "schedule_type": "interval",
        "interval_hours": 3
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "intel",
        "step_kind": "analyze",
        "title_template": "Proactive market research",
        "payload_template": {
            "research_type": "deep_dive",
            "topics": ["fundamentals", "social_sentiment", "technicals"],
            "target": "trending_tokens"
        }
    }'::jsonb,
    180,
    'Every 3 hours: INTEL deep dive on trending tokens'
);

-- 12. proactive_system_health
INSERT INTO ops_trigger_rules (name, trigger_event, conditions, action_config, cooldown_minutes, description) VALUES (
    'proactive_system_health',
    'scheduled_check',
    '{
        "schedule_type": "interval",
        "interval_hours": 8
    }'::jsonb,
    '{
        "action": "create_proposal",
        "target_agent": "observer",
        "step_kind": "monitor",
        "title_template": "Proactive system health check",
        "payload_template": {
            "check_type": "system_operations",
            "topics": ["error_rate", "execution_quality", "rule_compliance"],
            "depth": "comprehensive"
        }
    }'::jsonb,
    480,
    'Every 8 hours: OBSERVER checks system operations'
);

-- Verify the insertions
SELECT name, trigger_event, cooldown_minutes, enabled FROM ops_trigger_rules ORDER BY name;