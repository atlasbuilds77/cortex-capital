# Roundtable Conversation System

Multi-agent conversation orchestrator for the Autonomous Trading Company.

## Overview

The roundtable system enables natural conversations between the 6 trading agents (ATLAS, SAGE, SCOUT, GROWTH, INTEL, OBSERVER) using weighted speaker selection, memory-influenced responses, and relationship evolution.

## Architecture

### Core Components

1. **orchestrator.ts** - Turn-by-turn conversation execution
2. **voices.ts** - 6 agent personality definitions
3. **formats.ts** - 6 conversation formats with parameters
4. **speaker-selection.ts** - Weighted speaker selection algorithm
5. **voice-evolution.ts** - Memory-derived voice modifiers
6. **relationship-drift.ts** - Affinity updates based on interactions
7. **roundtable-worker/** - Background worker for queue processing

### Conversation Flow

```
Queue Entry → Worker Claim → Orchestrator → Turn Execution → Post-Processing
     ↓              ↓             ↓              ↓                ↓
  Pending       Claimed      Participants   Speaker Select   Memory Distill
                                  ↓              ↓          Relationship Drift
                               Topic Set     LLM Call       Action Items
                                  ↓              ↓          Event Emission
                               Modifiers   Response Process
```

## Agent Personalities

### ATLAS (Strategy / Coordinator)
- **Directive:** Portfolio manager, makes final calls
- **Tone:** Direct, data-driven, decisive
- **Quirk:** Always asks about risk-reward ratio
- **Affinity:** High with SAGE (0.80), low with INTEL (0.35)

### SAGE (Risk Manager / Analyst)
- **Directive:** Protect capital, voice of caution
- **Tone:** Cautious, analytical, protective
- **Quirk:** Cites probability and exposure metrics
- **Affinity:** High with OBSERVER (0.80), low with INTEL (0.30)

### SCOUT (Execution / Market Monitor)
- **Directive:** Report facts, no opinions
- **Tone:** Precise, detail-oriented, technical
- **Quirk:** Reports exact prices and timestamps
- **Affinity:** High with INTEL (0.75), medium with others

### GROWTH (Performance Analyst)
- **Directive:** Analyze outcomes, find patterns
- **Tone:** Curious, pattern-seeking, optimization-focused
- **Quirk:** Always looking for edges in past performance
- **Affinity:** High with INTEL (0.70), medium with others

### INTEL (Research / Signal Scanner)
- **Directive:** Find opportunities, filter noise
- **Tone:** Alert, proactive, information-hungry
- **Quirk:** Surfaces opportunities before others notice
- **Affinity:** High with SCOUT (0.75), low with SAGE (0.30)

### OBSERVER (Quality Control / System Monitor)
- **Directive:** Monitor quality, flag deviations
- **Tone:** Methodical, detail-oriented, process-oriented
- **Quirk:** Flags when rules aren't followed
- **Affinity:** High with SAGE (0.80), medium with others

## Conversation Formats

### 1. Morning Standup
- **Participants:** 4-6 agents (always ATLAS, SAGE, INTEL)
- **Turns:** 6-12
- **Temperature:** 0.6
- **Purpose:** Daily strategy alignment
- **Formal:** Yes (action items extracted)

### 2. Position Review
- **Participants:** 3-4 agents (ATLAS, SAGE, SCOUT, +GROWTH)
- **Turns:** 4-8
- **Temperature:** 0.5
- **Purpose:** Review open positions
- **Formal:** Yes

### 3. Post-Mortem
- **Participants:** 4-5 agents (all except OBSERVER)
- **Turns:** 8-15
- **Temperature:** 0.7
- **Purpose:** Analyze day's trades
- **Formal:** Yes

### 4. Debate
- **Participants:** 2-3 agents (low affinity pairs)
- **Turns:** 6-10
- **Temperature:** 0.8
- **Purpose:** Healthy conflict, prevent groupthink
- **Formal:** No

### 5. Strategy Session
- **Participants:** 3-4 agents (ATLAS, SAGE, GROWTH, +INTEL)
- **Turns:** 10-16
- **Temperature:** 0.65
- **Purpose:** Strategic planning
- **Formal:** Yes

### 6. Watercooler
- **Participants:** 2-3 agents (random)
- **Turns:** 3-6
- **Temperature:** 0.9
- **Purpose:** Informal chat, surprising insights
- **Formal:** No

## Speaker Selection Algorithm

### Weight Calculation
```
Total Weight = (0.6 × Affinity) + (0.2 × Recency) + (0.2 × Jitter)
```

**Affinity Weight:** Average affinity with other participants (0.1-0.95)

**Recency Weight:** Exponential decay based on turns since last spoke
- Just spoke: ~0.1 weight
- 3+ turns ago: ~1.0 weight

**Jitter:** 20% random component for unpredictability

### Example Calculation
For ATLAS in a conversation with SAGE (affinity 0.80) and INTEL (affinity 0.35):
- Affinity weight = (0.80 + 0.35) / 2 = 0.575
- If ATLAS spoke last turn: Recency weight = 0.1
- Jitter = 0.2 × random(0-1) = 0.15
- **Total weight = (0.6×0.575) + (0.2×0.1) + (0.2×0.15) = 0.395**

## Relationship Drift

### Drift Calculation
Based on conversation interactions:
- **Agreement:** +0.02 per interaction
- **Support:** +0.015 per interaction  
- **Disagreement:** -0.01 per interaction
- **Challenge:** -0.005 per interaction (healthy tension)

### Caps and Limits
- **Max drift per conversation:** ±0.03
- **Affinity range:** 0.10 - 0.95
- **Overall sentiment** modifies drift by ±50%

### Example Update
ATLAS and INTEL start at 0.35 affinity:
- They have 2 agreements (strength 0.8 each) = +0.032
- 1 disagreement (strength 0.7) = -0.007
- Net drift = +0.025 (capped at +0.03)
- **New affinity = 0.35 + 0.025 = 0.375**

## Voice Evolution

### Memory Modifiers
Agents are influenced by recent memories:
- **Insight → Optimism** (confidence-based strength)
- **Pattern → Emphasis** 
- **Strategy → Emphasis**
- **Preference → Caution**
- **Lesson → Caution**

### Modifier Application
Strong modifiers (>0.7 strength) add emphasis:
- Emphasis: Adds "!" to response
- Caution: Prefixes "[Caution advised]"
- Urgency: Prefixes "[Urgent]"

## Response Processing

### Length Enforcement
- **Max 120 characters** per turn
- Responses truncated with "..." if too long
- Empty responses replaced with "[No response generated]"

### Natural Pacing
- **3-8 second delay** between turns
- Random variation for natural flow
- No delay after final turn

## Worker System

### Queue Processing
- **Polls every 30 seconds** for pending conversations
- **Atomic claiming** prevents duplicate processing
- **Max 3 concurrent conversations** per worker
- **Circuit breaker** after 3 consecutive failures

### Status Flow
```
pending → claimed → running → succeeded/failed
```

## Integration Points

### Required Providers
1. **LLM Provider:** `(prompt, temperature) → response`
2. **Memory Provider:** `(agentId, topic) → memories[]`
3. **Relationship Provider:** `() → affinity matrix`
4. **Relationship Updater:** `(updates[]) → void`
5. **Memory Distiller:** `(conversation) → void`
6. **Event Emitter:** `(event, data) → void`

### Database Schema
```sql
-- ops_roundtable_queue
id, format, participants[], topic, status, 
claimed_by, claimed_at, created_at, result

-- ops_agent_relationships  
agent_a, agent_b, affinity, total_interactions, drift_log[]
```

## Sample Conversation

### Morning Standup (6 turns)
```
Turn 1 (ATLAS): Market looks volatile. What's our edge today?
Turn 2 (INTEL): Seeing whale accumulation in SOL. 3 large buys overnight.
Turn 3 (SAGE): Exposure already high. Need strict stop-losses.
Turn 4 (ATLAS): Agree. Scout, prepare scaled entry plan.
Turn 5 (SCOUT): Ready. 3 tranches at 5% intervals.
Turn 6 (GROWTH): Pattern shows morning pumps fade by 10am. Caution.
```

### Speaker Weights (example)
```
ATLAS: weight=0.395 (affinity=0.575, recency=0.1, jitter=0.15)
SAGE: weight=0.620 (affinity=0.800, recency=0.9, jitter=0.10)
INTEL: weight=0.485 (affinity=0.525, recency=0.8, jitter=0.15)
```

### Relationship Drift Applied
```
ATLAS ↔ INTEL: 0.350 → 0.365 (+0.015) - Positive interaction
SAGE ↔ INTEL: 0.300 → 0.295 (-0.005) - Mild tension
```

## Configuration

### Orchestrator Settings
```typescript
{
  maxResponseLength: 120,
  minTurnDelayMs: 3000,
  maxTurnDelayMs: 8000,
  // Provider implementations required
}
```

### Worker Settings
```typescript
{
  workerId: 'worker_001',
  pollIntervalMs: 30000,
  maxConcurrentConversations: 3,
  // Database adapter required
}
```

## Error Handling

### Graceful Degradation
- Failed LLM calls → "[Error: No response]"
- Missing memories → No modifiers applied
- Database errors → Retry with exponential backoff
- Circuit breaker → Auto-disable after 3 failures

### Recovery
- Stale claims (30+ minutes) auto-released
- Failed conversations logged with error details
- Worker auto-restart on crash (systemd managed)

## Monitoring

### Key Metrics
- Conversations per hour
- Average turns per conversation
- Relationship drift trends
- Action items extracted
- Error rate by component

### Health Checks
- Worker heartbeat (last poll time)
- Queue backlog size
- LLM response latency
- Database connection status

## Deployment

### Worker Process
```bash
# systemd service
systemctl start roundtable-worker

# Manual start
node roundtable-worker/index.js
```

### Scaling
- Multiple workers can run concurrently
- Database claims prevent duplicates
- Load balancing via queue depth monitoring

## Testing

### Unit Tests
- Speaker weight calculations
- Relationship drift logic
- Response processing
- Modifier application

### Integration Tests
- Full conversation flow
- Database interactions
- LLM provider integration
- Error scenarios

### Sample Data
```typescript
// Test conversation
const session = ConversationOrchestrator.createSession(
  'morning_standup',
  ['atlas', 'sage', 'intel', 'scout'],
  'Market volatility strategy'
);
```

## Future Enhancements

### Planned Features
1. **Emotion detection** from conversation tone
2. **Topic steering** based on market events
3. **Cross-conversation memory** linking
4. **Advanced NLP** for interaction analysis
5. **Real-time sentiment** integration

### Performance Optimizations
- Conversation template caching
- Batch LLM calls for parallel turns
- Relationship prediction models
- Memory relevance scoring improvements

---

**Built for:** Autonomous Trading Company  
**Version:** 1.0.0  
**Last Updated:** Feb 7, 2026