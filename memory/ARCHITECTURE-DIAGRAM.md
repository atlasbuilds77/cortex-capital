# Memory System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS TRADING COMPANY                                │
│                       MEMORY & LEARNING SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │   CONVERSATIONS     │              │   TRADE OUTCOMES    │              │
│  │  (Roundtables)      │              │   (Wins & Losses)   │              │
│  │                     │              │                     │              │
│  │ • Morning Standup   │              │ • Entry/Exit Price  │              │
│  │ • Position Review   │              │ • PnL & PnL%       │              │
│  │ • Post Mortem       │              │ • Hold Time        │              │
│  │ • Debate           │              │ • Engagement Score  │              │
│  └─────────┬───────────┘              └─────────┬───────────┘              │
│            │                                    │                           │
└────────────┼────────────────────────────────────┼───────────────────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│   MEMORY DISTILLER      │          │   OUTCOME LEARNER       │
│   memory-distiller.ts   │          │   outcome-learner.ts    │
├─────────────────────────┤          ├─────────────────────────┤
│                         │          │                         │
│ • Extract insights      │          │ • Calculate medians     │
│ • LLM analysis         │          │ • Identify performers   │
│ • Max 6 per convo      │          │ • Generate lessons      │
│ • Min confidence 0.55   │          │ • Max 3/agent/day      │
│ • Idempotent dedup     │          │ • Confidence 0.6-0.7   │
│                         │          │                         │
└───────────┬─────────────┘          └───────────┬─────────────┘
            │                                    │
            │                                    │
            └──────────────┬─────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (ops_agent_memory)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Memory Records:                                                 │
│  • id, agent_id, type, content                                  │
│  • confidence, tags[], source_trace_id                          │
│  • upvotes, downvotes, promoted                                 │
│  • created_at, last_accessed_at                                 │
│                                                                  │
│  ⚠️  200 MEMORY CAP PER AGENT (oldest removed)                  │
│                                                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MEMORY QUERY                             │
│                       memory-query.ts                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │   QUERY ENGINE       │        │    CACHE LAYER       │      │
│  │                      │        │                      │      │
│  │ • Filter by type     │◄──────►│ • 5-min TTL         │      │
│  │ • Filter confidence  │        │ • Per-agent cache   │      │
│  │ • Filter tags        │        │ • Query hash key    │      │
│  │ • Sort & limit       │        │ • Avoid duplicate   │      │
│  │ • Enforce 200 cap    │        │   DB calls          │      │
│  └──────────────────────┘        └──────────────────────┘      │
│                                                                  │
└─────────┬───────────────────────────────┬────────────────────────┘
          │                               │
          ▼                               ▼
┌──────────────────────┐      ┌──────────────────────────┐
│  MEMORY INFLUENCE    │      │   INSIGHT PROMOTER       │
│  memory-influence.ts │      │   insight-promoter.ts    │
├──────────────────────┤      ├──────────────────────────┤
│                      │      │                          │
│ • 30% probability    │      │ • Min confidence 0.80    │
│ • Scan keywords      │      │ • Check upvotes (3+)     │
│ • Match topics       │      │ • Promotion scoring      │
│ • Relevance scoring  │      │ • Mark as promoted       │
│ • Generate summary   │      │ • Track statistics       │
│                      │      │                          │
└──────────┬───────────┘      └───────────┬──────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DECISION SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐              ┌─────────────────────┐   │
│  │  ENRICHED TOPICS   │              │  PROMOTED INSIGHTS  │   │
│  │                    │              │                     │   │
│  │ • Risk analysis    │              │ • Best strategies   │   │
│  │ • Entry timing     │              │ • Key patterns      │   │
│  │ • Position sizing  │              │ • Critical lessons  │   │
│  │ + Memory context   │              │ • Permanent store   │   │
│  └────────────────────┘              └─────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       HEARTBEAT INTEGRATION                      │
│                         (Every 5 minutes)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. learnFromOutcomes()      → Extract lessons from trades      │
│  2. promoteInsights()        → Elevate high-value memories      │
│  3. Cache expires            → Fresh data on next query         │
│                                                                  │
│  Budget: ~5 seconds per heartbeat                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        MEMORY TYPES (5)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INSIGHT     │ Discovery/observation      │ 0.65-0.85          │
│  PATTERN     │ Recurring behavior         │ 0.70-0.90          │
│  STRATEGY    │ High-level approach        │ 0.75-0.90          │
│  PREFERENCE  │ Operational choice         │ 0.60-0.80          │
│  LESSON      │ Learned from experience    │ 0.55-0.75          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                               │
└─────────────────────────────────────────────────────────────────┘

Conversations → Distiller → Database → Query → Influence → Decisions
                                          ↓
Trade Outcomes → Learner ──┘             Cache
                                          ↓
                               Promoter → Permanent Storage

KEY FEATURES:
✅ Idempotent deduplication (source_trace_id)
✅ 200 memory cap per agent (auto-cleanup)
✅ 5-minute query cache (avoid duplicate DB calls)
✅ 30% memory influence rate on decisions
✅ Automatic insight promotion (confidence >0.80)
✅ Type-specific confidence ranges
✅ Daily lesson limits (3 per agent)

PERFORMANCE:
• Memory Distillation: <1s per conversation
• Outcome Learning: ~3s per heartbeat
• Memory Query: <100ms (cached), <500ms (DB)
• Memory Influence: ~200ms per topic
• Insight Promotion: ~2s per heartbeat
```

---

## Component Interaction Matrix

| Component | Reads From | Writes To | Called By |
|-----------|------------|-----------|-----------|
| Memory Distiller | Conversations | Database | Roundtable Worker |
| Outcome Learner | Trade Outcomes | Database | Heartbeat Loop |
| Memory Query | Database | Cache | All Components |
| Memory Influence | Cache | Decision Topics | Topic Selector |
| Insight Promoter | Database | Database | Heartbeat Loop |

---

## Memory Lifecycle

```
1. CREATION
   Conversation/Trade → Distiller/Learner → Validate → Database
   
2. STORAGE
   Database → (200 cap enforced) → Oldest removed if over limit
   
3. ACCESS
   Query → Cache Check → DB if miss → Cache Store → Return
   
4. INFLUENCE
   Topic Created → 30% chance → Match keywords → Enrich
   
5. PROMOTION
   High Confidence + Upvotes → Score → Promote → Permanent
   
6. EXPIRY
   Age > 200 newest → Removed (unless promoted)
```

---

## Integration Points

### With Heartbeat Loop:
```typescript
heartbeat() {
  // ... other operations ...
  await learner.learnFromOutcomes();
  await promoter.promoteInsights();
}
```

### With Roundtable System:
```typescript
conversationComplete(conversation) {
  await distiller.distillMemoriesFromConversation(
    conversation, 
    conversation.id
  );
}
```

### With Decision System:
```typescript
selectTopic(topics) {
  const enriched = await influence.enrichTopicsWithMemory(topics);
  return enriched.find(t => t.memoryInfluenced) || enriched[0];
}
```