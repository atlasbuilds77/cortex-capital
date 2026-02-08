# AUTONOMOUS TRADING COMPANY - Architecture Design
**Built:** Feb 7, 2026 7:48 PM PST
**Based on:** Voxyz multi-agent system architecture
**Purpose:** Self-operating trading company with 6 AI agents

---

## CORE PHILOSOPHY

**From Voxyz:**
> "Agent proposes an idea (Proposal) → Gets approved and becomes a task (Mission) → Breaks down into concrete steps (Step) → Execution fires an event (Event) → Event triggers a new idea → Back to step one."

**Adapted for Trading:**
- Agent identifies opportunity (Signal Analysis)
- System evaluates risk/reward (Proposal)
- Auto-approves or routes to roundtable (Approval)
- Executes trade (Mission)
- Monitors position (Step)
- Trade closes (Event)
- Agent learns from outcome (Memory)
- Triggers new analysis → Loop continues

---

## THE 6 TRADING AGENTS

### 1. ATLAS (Strategy / Coordinator)
**Role:** Overall strategy, final decisions, portfolio management
**Personality:** Direct, data-driven, decisive
**Tone:** "What's the edge here?"
**Quirk:** Always asks about risk-reward ratio
**Voice:** Results-oriented, cuts through noise
**System Directive:** You are the portfolio manager. Make final calls on entries/exits. Balance aggression with protection. You care about edge, not excitement.

### 2. SAGE (Risk Manager / Analyst)
**Role:** Risk analysis, position sizing, exposure monitoring
**Personality:** Cautious, analytical, protective
**Tone:** "What's the max drawdown scenario?"
**Quirk:** Cites probability and exposure metrics constantly
**Voice:** Measured, skeptical, demands evidence
**System Directive:** You are the risk manager. Your job is to protect capital. Push back on risky plays. Demand stop-losses. You're the voice of caution.

### 3. SCOUT (Execution / Market Monitor)
**Role:** Executes trades, monitors fills, tracks positions
**Personality:** Precise, detail-oriented, responsive
**Tone:** "Fill confirmed at $X, watching for slippage"
**Quirk:** Reports exact prices and timestamps
**Voice:** Technical, accurate, no speculation
**System Directive:** You are the executor. Report facts: fills, prices, slippage, position updates. No opinions, just data.

### 4. GROWTH (Performance Analyst)
**Role:** Analyzes wins/losses, finds patterns, optimizes strategy
**Personality:** Curious, pattern-seeking, optimization-focused
**Tone:** "Here's what the data shows..."
**Quirk:** Always looking for edges in past performance
**Voice:** Analytical but action-oriented
**System Directive:** You analyze outcomes. What worked? What didn't? Find the patterns. Turn data into actionable insights.

### 5. INTEL (Research / Signal Scanner)
**Role:** Scans markets, monitors KOLs, identifies opportunities
**Personality:** Alert, proactive, information-hungry
**Tone:** "Seeing accumulation in [TOKEN], 3 whales buying"
**Quirk:** Surfaces opportunities before others notice
**Voice:** Fast-paced, factual, opportunity-focused
**System Directive:** You are the scout. Find opportunities. Monitor signals. Watch for edge. Report what matters, filter noise.

### 6. OBSERVER (Quality Control / System Monitor)
**Role:** Monitors system health, catches errors, enforces rules
**Personality:** Methodical, detail-oriented, quality-focused
**Tone:** "Process deviation detected..."
**Quirk:** Flags when rules aren't followed
**Voice:** Process-oriented, neutral, corrective
**System Directive:** You monitor quality. Check if rules are followed. Flag deviations. Ensure the system operates correctly.

---

## DATABASE SCHEMA (15 Tables)

### CORE LOOP (4 tables)
```sql
1. ops_trading_proposals
   - agent_id, title, signal_type, entry_price, target, stop_loss
   - status (pending/accepted/rejected)
   - proposed_steps (trade execution plan)

2. ops_missions
   - title, status (approved/running/succeeded/failed)
   - created_by, mission_type (entry/exit/scale/hedge)

3. ops_mission_steps
   - mission_id, kind (analyze/execute_trade/monitor/close)
   - status (queued/running/succeeded/failed)
   - payload (trade details)

4. ops_agent_events
   - agent_id, kind, title, summary, tags[]
   - trade_id, pnl (if applicable)
```

### POLICY & CONFIG (3 tables)
```sql
5. ops_policy
   - key (auto_approve, daily_trade_limit, max_position_size, etc.)
   - value (JSONB config)

6. ops_trigger_rules
   - name, trigger_event, conditions, action_config
   - cooldown_minutes, fire_count, last_fired_at

7. ops_agent_reactions
   - source_agent, target_agent, reaction_type
   - trigger_event_id, status (queued/processed)
```

### MEMORY & LEARNING (3 tables)
```sql
8. ops_agent_memory
   - agent_id, type (insight/pattern/strategy/lesson)
   - content, confidence, tags[], source_trace_id

9. ops_trade_outcomes
   - trade_id, entry_price, exit_price, pnl, pnl_pct
   - hold_time, outcome_type (win/loss/breakeven)
   - lessons_learned[]

10. ops_portfolio_history
    - timestamp, total_value, pnl_24h
    - open_positions, win_rate, sharpe_ratio
```

### CONVERSATIONS (2 tables)
```sql
11. ops_roundtable_queue
    - format (standup/debate/post_mortem)
    - participants[], topic, status
    - conversation_history (JSONB)

12. ops_agent_relationships
    - agent_a, agent_b, affinity (0.10-0.95)
    - total_interactions, drift_log[]
```

### TRADING SPECIFIC (3 tables)
```sql
13. ops_signals
    - source (KOL/pattern/indicator)
    - token, signal_type (buy/sell/scale)
    - confidence, metadata (JSONB)

14. ops_positions
    - token, entry_price, size, current_price
    - unrealized_pnl, stop_loss, take_profit
    - status (open/closed)

15. ops_action_runs
    - action_type (heartbeat/trigger_eval/worker)
    - duration_ms, errors[], status
```

---

## TRIGGER RULES

### REACTIVE TRIGGERS (respond to events)

**1. trade_big_win**
- Condition: Trade closes with PnL > +50%
- Action: GROWTH analyzes why it worked
- Target: growth
- Cooldown: 60 minutes

**2. trade_big_loss**
- Condition: Trade closes with PnL < -30%
- Action: SAGE diagnoses what went wrong
- Target: sage
- Cooldown: 60 minutes

**3. position_at_risk**
- Condition: Open position down -20%
- Action: ATLAS reviews position, decides hold/cut
- Target: atlas
- Cooldown: 30 minutes

**4. signal_high_confidence**
- Condition: Signal confidence > 80%
- Action: SCOUT prepares execution plan
- Target: scout
- Cooldown: 15 minutes

**5. max_positions_reached**
- Condition: 3+ open positions
- Action: OBSERVER flags exposure, SAGE reviews
- Target: observer
- Cooldown: 60 minutes

**6. stop_loss_hit**
- Condition: Position hits stop loss
- Action: GROWTH analyzes entry timing
- Target: growth
- Cooldown: 30 minutes

### PROACTIVE TRIGGERS (scheduled)

**7. proactive_scan_signals**
- Agent: INTEL
- Schedule: Every 30 minutes
- Action: Scan for new opportunities
- Topics: [top_gainers, KOL_activity, volume_spikes]

**8. proactive_review_positions**
- Agent: ATLAS
- Schedule: Every 2 hours
- Action: Review all open positions
- Topics: [exit_timing, scale_decisions]

**9. proactive_risk_analysis**
- Agent: SAGE
- Schedule: Every 4 hours
- Action: Portfolio risk assessment
- Topics: [exposure, correlation, drawdown]

**10. proactive_performance_review**
- Agent: GROWTH
- Schedule: Every 6 hours
- Action: Analyze recent trade performance
- Topics: [win_rate, avg_winner, avg_loser]

**11. proactive_market_research**
- Agent: INTEL
- Schedule: Every 3 hours
- Action: Deep dive on trending tokens
- Topics: [fundamentals, social_sentiment, technicals]

**12. proactive_system_health**
- Agent: OBSERVER
- Schedule: Every 8 hours
- Action: Check system operations
- Topics: [error_rate, execution_quality, rule_compliance]

---

## REACTION MATRIX

### Agent-to-Agent Interactions

```json
{
  "patterns": [
    {
      "source": "*",
      "tags": ["trade", "big_loss"],
      "target": "sage",
      "type": "diagnose",
      "probability": 1.0,
      "cooldown": 60
    },
    {
      "source": "intel",
      "tags": ["signal", "high_confidence"],
      "target": "atlas",
      "type": "evaluate",
      "probability": 0.8,
      "cooldown": 30
    },
    {
      "source": "scout",
      "tags": ["trade", "executed"],
      "target": "growth",
      "type": "analyze",
      "probability": 0.3,
      "cooldown": 120
    },
    {
      "source": "sage",
      "tags": ["risk", "warning"],
      "target": "atlas",
      "type": "review",
      "probability": 1.0,
      "cooldown": 15
    },
    {
      "source": "growth",
      "tags": ["insight", "pattern"],
      "target": "atlas",
      "type": "propose_strategy",
      "probability": 0.6,
      "cooldown": 180
    },
    {
      "source": "observer",
      "tags": ["error", "rule_violation"],
      "target": "atlas",
      "type": "alert",
      "probability": 1.0,
      "cooldown": 5
    }
  ]
}
```

---

## MEMORY TYPES (5 types)

### 1. INSIGHT (Discovery)
**Example:** "KOL accumulation → 2-4 hour delay → 30-50% pump"
**Source:** Pattern recognition from multiple trades
**Confidence:** 0.65-0.85

### 2. PATTERN (Recurring behavior)
**Example:** "Weekend volume 60% lower, signals less reliable"
**Source:** Historical data analysis
**Confidence:** 0.70-0.90

### 3. STRATEGY (High-level approach)
**Example:** "Scale in 3 tranches (30/30/40) beats all-in entries"
**Source:** Backtested performance
**Confidence:** 0.75-0.90

### 4. PREFERENCE (Operational choice)
**Example:** "Prefer 1DTE options over 0DTE for overnight holds"
**Source:** Risk-adjusted returns
**Confidence:** 0.60-0.80

### 5. LESSON (Learned from failure)
**Example:** "Don't chase pumps after 50%+ move in <1 hour"
**Source:** Loss post-mortem
**Confidence:** 0.55-0.75

---

## ROUNDTABLE FORMATS (6 formats)

### 1. MORNING_STANDUP
- **Participants:** 4-6 agents (always includes ATLAS, SAGE, INTEL)
- **Turns:** 6-12
- **Temperature:** 0.6 (balanced)
- **Purpose:** Align on day's strategy, surface opportunities
- **Schedule:** Market open (6:30 AM PST)
- **Probability:** 1.0 (always happens)

### 2. POSITION_REVIEW
- **Participants:** 3-4 agents (ATLAS, SAGE, SCOUT, GROWTH)
- **Turns:** 4-8
- **Temperature:** 0.5 (analytical)
- **Purpose:** Review open positions, decide hold/exit/scale
- **Schedule:** Midday (11:00 AM PST)
- **Probability:** 0.8 (if positions open)

### 3. POST_MORTEM
- **Participants:** 4-5 agents (all except OBSERVER)
- **Turns:** 8-15
- **Temperature:** 0.7 (reflective)
- **Purpose:** Analyze day's trades, extract lessons
- **Schedule:** Market close (1:30 PM PST)
- **Probability:** 1.0 (always happens)

### 4. DEBATE
- **Participants:** 2-3 agents (conflicting opinions)
- **Turns:** 6-10
- **Temperature:** 0.8 (creative conflict)
- **Purpose:** Argue different trade perspectives
- **Schedule:** Ad-hoc (when affinity < 0.4)
- **Probability:** 0.6

### 5. STRATEGY_SESSION
- **Participants:** 3-4 agents (ATLAS, SAGE, GROWTH, INTEL)
- **Turns:** 10-16
- **Temperature:** 0.65 (strategic)
- **Purpose:** Deep dive on approach, adjust systems
- **Schedule:** Weekly (Sunday evening)
- **Probability:** 1.0

### 6. WATERCOOLER
- **Participants:** 2-3 agents (random)
- **Turns:** 3-6
- **Temperature:** 0.9 (casual)
- **Purpose:** Informal chat, surprising insights
- **Schedule:** Evening (6:00 PM PST)
- **Probability:** 0.4

---

## POLICY KEYS

### Core Policies (ops_policy table)

**1. auto_approve**
```json
{
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
}
```

**2. trade_limits**
```json
{
  "max_daily_trades": 8,
  "max_open_positions": 3,
  "max_position_size_usd": 60,
  "min_confidence": 0.60
}
```

**3. risk_controls**
```json
{
  "max_portfolio_risk": 0.05,
  "max_single_position_risk": 0.02,
  "stop_loss_required": true,
  "default_stop_loss_pct": -0.30
}
```

**4. roundtable_policy**
```json
{
  "enabled": true,
  "max_daily_conversations": 8,
  "require_for_large_trades": true,
  "large_trade_threshold_usd": 40
}
```

**5. memory_influence_policy**
```json
{
  "enabled": true,
  "probability": 0.30,
  "min_confidence": 0.60,
  "types_used": ["strategy", "lesson", "pattern"]
}
```

**6. relationship_drift_policy**
```json
{
  "enabled": true,
  "max_drift_per_conversation": 0.03,
  "min_affinity": 0.10,
  "max_affinity": 0.95
}
```

**7. initiative_policy**
```json
{
  "enabled": false,
  "min_memories_required": 5,
  "max_proposals_per_day": 3,
  "cooldown_hours": 4
}
```

---

## INITIAL RELATIONSHIPS (15 pairs)

**High Affinity (Natural Collaborators):**
- atlas ↔ sage: 0.80 (strategy partners)
- sage ↔ observer: 0.80 (process alignment)
- scout ↔ intel: 0.75 (data pipeline)
- growth ↔ intel: 0.70 (research collaboration)

**Medium Affinity (Professional):**
- atlas ↔ growth: 0.60 (performance reviews)
- atlas ↔ scout: 0.60 (execution coordination)
- atlas ↔ observer: 0.55 (oversight)
- sage ↔ growth: 0.55 (risk-reward analysis)
- sage ↔ scout: 0.50 (execution precision)
- scout ↔ observer: 0.50 (quality checks)

**Low Affinity (Natural Tension):**
- atlas ↔ intel: 0.35 (caution vs aggression)
- sage ↔ intel: 0.30 (risk-averse vs opportunity-seeking)
- intel ↔ observer: 0.40 (speed vs quality)
- growth ↔ observer: 0.45 (optimization vs compliance)
- scout ↔ growth: 0.50 (executor vs analyst)

**Purpose of low affinity pairs:** Creates healthy debate, prevents groupthink

---

## HEARTBEAT LOOP (Every 5 minutes)

**6 Operations (try-catch isolated):**

1. **evaluateTriggers()**
   - Check reactive triggers (trade outcomes, position status)
   - Check proactive triggers (scheduled scans)
   - Budget: 4000ms
   - Creates proposals via proposal-service

2. **processReactionQueue()**
   - Check reaction matrix against new events
   - Probability + cooldown checks
   - Budget: 3000ms
   - Creates proposals for agent interactions

3. **promoteInsights()**
   - Scan high-confidence memories
   - Promote to permanent storage
   - Budget: 2000ms

4. **learnFromOutcomes()**
   - Fetch recent trade results
   - Extract lessons (wins + losses)
   - Write to ops_agent_memory
   - Budget: 3000ms

5. **recoverStaleSteps()**
   - Find steps stuck in "running" for 30+ min
   - Mark failed, finalize missions
   - Budget: 2000ms

6. **recoverStaleRoundtables()**
   - Find conversations stuck
   - Mark failed, log error
   - Budget: 1000ms

**Total budget:** 15 seconds max per heartbeat

---

## WORKER PROCESSES (VPS)

**6 Workers (systemd managed):**

1. **roundtable-worker**
   - Orchestrates conversations turn-by-turn
   - Extracts memories post-conversation
   - Applies relationship drift
   - Generates action items

2. **trade-executor**
   - Claims execute_trade steps
   - Routes to Jupiter/Webull/TopstepX
   - Confirms fills
   - Fires events

3. **position-monitor**
   - Tracks open positions
   - Checks TP/SL thresholds
   - Fires risk alerts
   - Suggests exits

4. **signal-analyzer**
   - Claims analyze_signal steps
   - Runs technical analysis
   - Checks KOL activity
   - Outputs confidence score

5. **risk-calculator**
   - Claims calculate_risk steps
   - Position sizing
   - Portfolio exposure
   - Correlation analysis

6. **initiative-worker**
   - Consumes ops_initiative_queue
   - Generates proposals via LLM
   - Posts to proposal-service
   - Respects cooldowns

**All workers:**
- Poll every 15-30 seconds
- Atomic claiming (compare-and-swap)
- Circuit breaker (3 failures → auto-disable)
- systemd auto-restart on crash

---

## CAP GATES (Proposal Entry Points)

**Step kinds with gates:**

**1. execute_trade**
- Check: Daily trade limit (default 8)
- Check: Max open positions (default 3)
- Check: Position size within limit
- Reject if: Any limit exceeded

**2. close_position**
- Check: Position actually exists
- Check: Not already closing
- Reject if: Invalid state

**3. scale_position**
- Check: Would exceed max position size
- Check: Sufficient capital
- Reject if: Risk limits violated

**4. analyze_signal**
- Check: Daily analysis quota (default 20)
- Reject if: Quota full

**5. roundtable_conversation**
- Check: Max daily conversations (default 8)
- Reject if: Limit reached

**Gates prevent queue buildup** - reject at proposal, not at execution

---

## INTEGRATION WITH EXISTING SYSTEMS

### Autonomous Trader (crypto_monitor.js)
- Generates signals → writes to ops_signals
- Proposal-service picks up → creates mission
- Workers execute via Jupiter API
- Results → ops_trade_outcomes
- Lessons learned → ops_agent_memory

### Multi-User Platform (trading-platform/)
- User subscriptions stored
- Atlas trades → broadcast to users
- User-specific position tracking
- Separate P&L per user

### Future: Options + Futures
- Same proposal-service hub
- Different workers (Webull, TopstepX)
- Same learning loop
- Cross-market insights

---

## PHASE 1 BUILD PLAN

**Spark 1: Database + Migrations**
- All 15 tables
- Seed scripts (policies, triggers, relationships)
- Alembic migrations

**Spark 2: Proposal Service + Policy Engine**
- createProposalAndMaybeAutoApprove()
- Cap gates for all step kinds
- Policy reader/writer

**Spark 3: Trigger System**
- evaluateTriggers() orchestrator
- 6 reactive trigger checkers
- 6 proactive trigger checkers
- Memory cache optimization

**Spark 4: Event Stream + Reactions**
- Event writer
- Reaction matrix evaluator
- processReactionQueue()

**Spark 5: Memory System + Learning**
- Memory distillation (from conversations)
- learnFromOutcomes()
- promoteInsights()
- Memory-influenced topic selection

**Spark 6: Roundtable Orchestrator**
- Conversation worker
- Turn-by-turn LLM calls
- Speaker selection (weighted)
- 6 conversation formats

**Opus: Integration + Deployment**
- Wire all pieces together
- Deploy workers (systemd)
- Vercel heartbeat endpoint
- Connect to existing autonomous trader
- Testing + debugging

---

## SUCCESS METRICS

**Week 1:**
- System running without crashes
- 5+ roundtables per day
- 3+ trades executed autonomously
- Memories accumulating (30+ entries)
- Relationships evolving (drift visible)

**Week 2:**
- Profitable trading (net positive P&L)
- Agents proposing valuable insights
- Memory influencing decisions (30% rate)
- Low-affinity pairs having productive debates

**Week 3:**
- Consistent profitability (60%+ win rate)
- Self-healing working (stale task recovery)
- Initiative system enabled (agents proposing own work)
- Voice evolution visible (personality shifts)

**Phase 2 Ready:**
- 2+ weeks profitable operation
- Full audit trail
- System stability proven
- Ready to white-label

---

## MONETIZATION (Phase 2)

**Service Model:**
- Setup fee: $10-20K (custom deployment)
- Monthly: $2-5K (maintenance + new features)
- Rev share: 10-20% of trading profits (optional)

**SaaS Model:**
- Tier 1: $500/month (solo trader, 1 account)
- Tier 2: $2K/month (small fund, 5 accounts)
- Tier 3: $10K/month (institutional, unlimited)

**White-Label:**
- License fee: $50K upfront
- Monthly: $5K support
- Rev share: 5% of their revenue

---

**ARCHITECTURE COMPLETE**

Ready to spawn Sparks and build ⚡

---

Last updated: Feb 7, 2026 7:48 PM PST
Total scope: 15 tables, 6 agents, 12 triggers, 6 roundtable formats, 6 workers
Build time estimate: 2-3 days (parallel Sparks)
