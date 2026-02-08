# Memory System & Learning Module

## Overview

The Memory System enables autonomous trading agents to learn from experience, remember insights, and apply lessons to future decisions. It consists of 5 core components that work together to create a continuous learning loop.

## Core Components

### 1. Memory Distiller (`memory-distiller.ts`)
**Purpose:** Extract insights/patterns/lessons from conversations between agents.

**Key Features:**
- LLM call to analyze conversation history and extract memories
- Max 6 memories per conversation
- Minimum confidence threshold: 0.55 (memories below are dropped)
- Idempotent deduplication via `source_trace_id`
- 5 memory types with different confidence ranges

**Usage:**
```typescript
const distiller = new MemoryDistiller();
const memories = await distiller.distillMemoriesFromConversation(
  conversation,
  'conv_123'
);
```

### 2. Outcome Learner (`outcome-learner.ts`)
**Purpose:** Extract lessons from trade outcomes (wins and losses).

**Key Features:**
- Runs every heartbeat (5-minute intervals)
- Analyzes recent trade results (48-hour lookback)
- Calculates median engagement/PnL as baseline
- Identifies strong performers (>2x median) → confidence 0.7
- Identifies weak performers (<0.3x median) → confidence 0.6
- Max 3 lessons per agent per day

**Usage:**
```typescript
const learner = new OutcomeLearner();
const lessons = await learner.learnFromOutcomes();
```

### 3. Memory Query (`memory-query.ts`)
**Purpose:** Optimized memory retrieval with caching.

**Key Features:**
- `queryAgentMemories()` with flexible filtering
- Memory cache per heartbeat (5-minute TTL)
- Filter by type, confidence, tags, recency
- 200 memory cap per agent (oldest automatically removed)
- Support for sorting by confidence, relevance, or recency

**Usage:**
```typescript
const query = new MemoryQuery();
const memories = await query.queryAgentMemories('atlas', {
  types: ['strategy', 'lesson'],
  minConfidence: 0.70,
  tags: ['risk-management'],
  limit: 10,
  sortBy: 'confidence'
});
```

### 4. Memory Influence (`memory-influence.ts`)
**Purpose:** Enrich decision topics with relevant memories.

**Key Features:**
- `enrichTopicWithMemory()` with 30% probability
- Scans memory keywords against available topics
- Returns matched topic + `memoryInfluenced` flag
- Uses most relevant memories (strategy, lesson, pattern types)
- Generates influence summaries

**Usage:**
```typescript
const influence = new MemoryInfluence(memoryQuery);
const enrichedTopic = await influence.enrichTopicWithMemory(topic);
```

### 5. Insight Promoter (`insight-promoter.ts`)
**Purpose:** Promote high-value memories to permanent storage.

**Key Features:**
- Runs every heartbeat
- Finds high-confidence memories (>0.80)
- Considers upvotes, access patterns, and recency
- Promotes to permanent storage
- Tracks promotion statistics

**Usage:**
```typescript
const promoter = new InsightPromoter(memoryQuery);
const promoted = await promoter.promoteInsights();
```

## Memory Types

| Type | Description | Confidence Range | Source |
|------|-------------|------------------|--------|
| **Insight** | Discovery or observation | 0.65-0.85 | Pattern recognition |
| **Pattern** | Recurring market behavior | 0.70-0.90 | Historical data analysis |
| **Strategy** | High-level trading approach | 0.75-0.90 | Backtested performance |
| **Preference** | Operational choice | 0.60-0.80 | Risk-adjusted returns |
| **Lesson** | Learned from failure/success | 0.55-0.75 | Trade post-mortem |

## Database Schema

The memory system uses the `ops_agent_memory` table:

```sql
CREATE TABLE ops_agent_memory (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL, -- insight/pattern/strategy/preference/lesson
  content TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT[] NOT NULL,
  source_trace_id TEXT NOT NULL, -- For idempotent dedup
  created_at TIMESTAMP NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  promoted BOOLEAN DEFAULT FALSE,
  last_accessed_at TIMESTAMP NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_agent_memory_agent ON ops_agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON ops_agent_memory(type);
CREATE INDEX idx_agent_memory_confidence ON ops_agent_memory(confidence);
CREATE INDEX idx_agent_memory_promoted ON ops_agent_memory(promoted);
CREATE INDEX idx_agent_memory_created ON ops_agent_memory(created_at);
```

## Integration with Heartbeat Loop

The memory system integrates with the main heartbeat loop (every 5 minutes):

```typescript
// In heartbeat loop:
async function runMemorySystem() {
  // 1. Learn from recent trade outcomes
  const learner = new OutcomeLearner();
  const lessons = await learner.learnFromOutcomes();
  
  // 2. Promote high-value insights
  const promoter = new InsightPromoter(memoryQuery);
  const promoted = await promoter.promoteInsights();
  
  // 3. (Optional) Process conversation memories
  // This happens separately when conversations complete
  
  return { lessons, promoted };
}
```

## Configuration

Key configuration parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxMemoriesPerConversation` | 6 | Max memories extracted per conversation |
| `minConfidence` | 0.55 | Minimum confidence for memory retention |
| `memoryCapPerAgent` | 200 | Max memories per agent (oldest removed) |
| `lookbackHours` | 48 | Trade outcome analysis window |
| `influenceProbability` | 0.30 | Chance topic gets memory enrichment |
| `minConfidenceForPromotion` | 0.80 | Minimum confidence for insight promotion |

## Sample Output

### Memory Distillation Example:
```json
[
  {
    "content": "Stop losses at -30% provide enough room for volatility while protecting capital",
    "type": "strategy",
    "confidence": 0.78,
    "tags": ["risk-management", "stop-loss", "volatility"]
  },
  {
    "content": "KOL accumulation signals often lead to 30-50% pumps within 2-4 hours",
    "type": "pattern", 
    "confidence": 0.72,
    "tags": ["KOL", "signals", "momentum"]
  }
]
```

### Outcome Learning Logic Flow:
```
1. Fetch recent trade outcomes (48h window)
2. Group by agent
3. Calculate median PnL% and engagement per agent
4. Identify strong performers (>2x median)
   → Generate lesson with confidence 0.7
5. Identify weak performers (<0.3x median)
   → Generate lesson with confidence 0.6
6. Apply daily limit (max 3 lessons per agent)
7. Convert lessons to memory objects
```

### Memory Influence Success Tracking:
```typescript
// After processing 100 topics:
{
  totalTopics: 100,
  influencedTopics: 32,  // ~32% (close to target 30%)
  influenceRate: 0.32,
  avgMemoriesPerInfluencedTopic: 2.4
}
```

## Testing

Run the test suite:
```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company/memory
npm test  # If test files exist
```

Or test individual components:
```typescript
// Test memory distillation
const distiller = new MemoryDistiller();
const testConversation = { /* mock conversation */ };
const memories = await distiller.distillMemoriesFromConversation(
  testConversation,
  'test_123'
);
console.log(`Extracted ${memories.length} memories`);

// Test outcome learning
const learner = new OutcomeLearner();
const lessons = await learner.learnFromOutcomes();
console.log(`Learned ${lessons.length} lessons`);

// Test memory query with caching
const query = new MemoryQuery();
const atlasMemories = await query.queryAgentMemories('atlas', {
  types: ['strategy'],
  minConfidence: 0.75
});
console.log(`Found ${atlasMemories.length} strategies for Atlas`);
```

## Performance Considerations

1. **Caching**: Memory queries are cached per heartbeat (5 minutes) to avoid duplicate database calls
2. **Memory Limits**: 200 memories per agent prevents unbounded growth
3. **Batch Processing**: Outcome learning and insight promotion run in batches
4. **Indexed Queries**: Database indexes on agent_id, type, confidence, and promoted flags
5. **Async Processing**: All operations are async and non-blocking

## Future Enhancements

1. **Cross-Agent Memory Sharing**: Allow agents to access each other's memories
2. **Memory Pruning**: Automatic cleanup of low-value memories
3. **Temporal Weighting**: Recent memories weighted higher than old ones
4. **Confidence Decay**: Memory confidence decreases over time unless reinforced
5. **Memory Clustering**: Group similar memories for better retrieval
6. **Visualization**: Dashboard to view memory network and learning progress

## Dependencies

- TypeScript 4.5+
- Node.js 16+
- Database client (PostgreSQL preferred)
- LLM API (OpenAI, Anthropic, etc.) for memory distillation

## License

Part of the Autonomous Trading Company system. See main project for licensing details.