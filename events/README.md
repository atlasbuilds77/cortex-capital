# Event System & Reaction Matrix

This module implements the event stream and reaction matrix system for the Autonomous Trading Company.

## Overview

The system enables agents to react to events in a probabilistic, cooldown-controlled manner, creating emergent agent-to-agent interactions that feel "alive" rather than deterministic.

## Core Components

### 1. EventEmitter (`event-emitter.ts`)
- **Purpose**: Write events to `ops_agent_events` table
- **Key method**: `emitEvent(agentId, kind, title, summary, tags, metadata)`
- **Helper methods**: `emitTradeEvent()`, `emitSignalEvent()`, `emitRiskEvent()`, etc.
- **Trigger**: Automatically calls reaction evaluation after writing event

### 2. ReactionMatrixManager (`reaction-matrix-manager.ts`)
- **Purpose**: Load and manage reaction patterns from `ops_policy` table
- **Key method**: `loadReactionMatrix()` - loads from DB with 5-minute cache
- **Pattern matching**: `matchEvent(event, patterns)` - finds patterns matching event tags
- **Default matrix**: 6 patterns from ARCHITECTURE.md (loaded if DB empty)

### 3. ReactionEvaluator (`reaction-evaluator.ts`)
- **Purpose**: Evaluate new events against reaction matrix
- **Key method**: `evaluateReactionMatrix(event)` - main hook called by EventEmitter
- **Checks**: 
  1. Cooldown (per source-target-type triplet)
  2. Probability roll (0.3 = 30% chance)
- **Output**: Writes to `ops_agent_reactions` queue

### 4. ReactionQueueProcessor (`reaction-processor.ts`)
- **Purpose**: Process queued reactions every heartbeat
- **Key method**: `processReactionQueue()` - runs with 3000ms budget
- **Process**: 
  1. Fetches oldest queued reactions (batch of 10)
  2. Creates proposals via proposal-service
  3. Marks reactions as processed
- **Budget-aware**: Stops if exceeds 3000ms

### 5. ReactionUtils (`reaction-utils.ts`)
- **Purpose**: Cooldown management and probability utilities
- **Features**:
  - In-memory cooldown store with automatic expiration
  - Probability dice rolling
  - Cooldown cleanup

## Reaction Matrix Patterns

From ARCHITECTURE.md (6 patterns):

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

## How It Works

### Sample Event → Reaction Flow

1. **Event Creation**:
   ```typescript
   // Scout executes a trade
   await eventEmitter.emitExecutionEvent(
     'scout',
     'Trade Executed: BTC',
     'Bought 0.1 BTC at $65,200',
     { exchange: 'binance', order_id: '123' }
   );
   ```

2. **Event Tags**: `['trade', 'executed']`

3. **Pattern Matching**: Matches pattern #3:
   - Source: `scout` ✓
   - Tags: `['trade', 'executed']` ✓ (both required tags present)
   - Target: `growth`
   - Type: `analyze`
   - Probability: `0.3` (30% chance)
   - Cooldown: `120` minutes

4. **Evaluation**:
   - Check cooldown: No active cooldown for `scout→growth:analyze`
   - Roll probability: Math.random() < 0.3? (30% chance)
   - If passes: Queue reaction to `ops_agent_reactions`

5. **Queue Processing** (next heartbeat):
   - Fetch queued reaction
   - Create proposal for GROWTH to analyze the trade
   - Mark reaction as processed
   - Set 120-minute cooldown for `scout→growth:analyze`

### Probability Calculation Examples

- **Probability 1.0** (100%): Always triggers (e.g., big losses, errors)
- **Probability 0.8** (80%): High confidence signals usually get evaluated
- **Probability 0.6** (60%): Insights often lead to strategy proposals
- **Probability 0.3** (30%): Only some executed trades get analyzed (makes agents feel less robotic)

**Why probability?** Creates variability in agent behavior. Not every event triggers the same reaction, making the system feel more organic and less predictable.

### Cooldown Tracking Approach

**Key**: `source:target:type` (e.g., `scout:growth:analyze`)

**Storage**: In-memory Map with automatic expiration
- Each cooldown record has `expires_at` timestamp
- Cleanup runs periodically (10% chance on each evaluation)
- No database overhead for frequent cooldown checks

**Purpose**: Prevents infinite reaction loops and spam
- Example: After SCOUT triggers GROWTH to analyze a trade, GROWTH won't be asked to analyze another SCOUT trade for 120 minutes
- But: Different reaction types have separate cooldowns
- Wildcard sources (`*`) use event source agent for cooldown key

## Integration

### Setup
```typescript
import { createEventSystem } from './events';

const { eventEmitter, queueProcessor } = createEventSystem(db, proposalService);

// Emit events
await eventEmitter.emitTradeEvent(...);

// Process queue in heartbeat
const stats = await queueProcessor.processReactionQueue();
```

### Heartbeat Integration
```typescript
// In heartbeat loop (every 5 minutes)
async function processReactionQueue() {
  const processor = new ReactionQueueProcessor(db, proposalService);
  return processor.processReactionQueue(); // 3000ms budget
}
```

### Database Schema
Ensure these tables exist:
```sql
-- ops_agent_events
CREATE TABLE ops_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  trade_id TEXT,
  pnl DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ops_agent_reactions
CREATE TABLE ops_agent_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  trigger_event_id UUID REFERENCES ops_agent_events(id),
  status TEXT DEFAULT 'queued', -- queued/processed/failed
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- ops_policy (for reaction matrix)
CREATE TABLE ops_policy (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Sample Test Scenario
```typescript
// 1. Big loss trade
await eventEmitter.emitTradeEvent(
  'scout',
  'trade_123',
  'BTC Trade Closed at Loss',
  'Sold 0.1 BTC at $62,400 (-4.3%)',
  -0.043
);
// → Triggers SAGE diagnose (probability 1.0, cooldown 60min)

// 2. High confidence signal
await eventEmitter.emitSignalEvent(
  'intel',
  'Strong Buy Signal: ETH',
  '3 whales accumulating ETH, RSI oversold',
  0.85
);
// → 80% chance triggers ATLAS evaluate (cooldown 30min)

// 3. Risk warning
await eventEmitter.emitRiskEvent(
  'sage',
  'Portfolio Risk High',
  'Correlation between positions > 0.8',
  'high'
);
// → Triggers ATLAS review (probability 1.0, cooldown 15min)
```

## Monitoring

### Queue Statistics
```typescript
const stats = await queueProcessor.getQueueStats();
console.log(`Queued: ${stats.queued}, Processed: ${stats.processed}, Failed: ${stats.failed}`);
```

### Active Cooldowns
```typescript
const cooldowns = reactionEvaluator.getActiveCooldowns();
cooldowns.forEach(cd => {
  console.log(`${cd.key.source}→${cd.key.target}:${cd.key.type} expires ${cd.expires_at}`);
});
```

## Design Philosophy

1. **Probabilistic, not deterministic**: Makes agents feel alive
2. **Cooldown-controlled**: Prevents spam and infinite loops
3. **Tag-based matching**: Flexible pattern definitions
4. **Wildcard support**: `"*"` matches any source agent
5. **Budget-aware processing**: 3000ms max per heartbeat
6. **Memory-efficient**: In-memory cooldowns, database for persistence

This system creates the "nervous system" of the trading company, allowing agents to interact organically based on events in the system.