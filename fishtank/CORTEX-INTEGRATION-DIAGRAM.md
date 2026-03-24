# Cortex Capital ↔ Claw3D Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CORTEX CAPITAL                              │
│                    (Trading Backend System)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  ANALYST    │  │ STRATEGIST  │  │  EXECUTOR   │                 │
│  │  Agent      │  │   Agent     │  │   Agent     │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                          │
│         └────────────────┴────────────────┘                          │
│                          │                                            │
│                          ▼                                            │
│                ┌──────────────────┐                                  │
│                │  Claw3D Helper   │                                  │
│                │   Integration    │                                  │
│                │    Library       │                                  │
│                └────────┬─────────┘                                  │
│                         │                                            │
│  Functions:             │                                            │
│  • notifyAnalystActivity()                                           │
│  • notifyExecutorActivity()                                          │
│  • notifyReporterActivity()                                          │
│  • ... etc                                                           │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          │ (JSON payload)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CLAW3D                                     │
│                   (3D Office Visualization)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  API Endpoint: POST /api/cortex/activity                            │
│  ├── Receives activity events                                        │
│  ├── Validates event structure                                       │
│  └── Pushes to Activity Feed                                         │
│                                                                       │
│  ┌──────────────────┐                                               │
│  │  Activity Feed   │                                               │
│  ├──────────────────┤                                               │
│  │ • Event buffer   │                                               │
│  │ • Pub/Sub        │                                               │
│  │ • Subscribers    │                                               │
│  └────────┬─────────┘                                               │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────┐                                               │
│  │  Cortex Bridge   │                                               │
│  ├──────────────────┤                                               │
│  │ • Maps events    │                                               │
│  │   to statuses    │                                               │
│  │ • Updates agent  │                                               │
│  │   state          │                                               │
│  └────────┬─────────┘                                               │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────┐              │
│  │          Agent Status Map                        │              │
│  ├──────────────────────────────────────────────────┤              │
│  │ cortex-analyst       → working                   │              │
│  │ cortex-strategist    → idle                      │              │
│  │ cortex-executor      → working                   │              │
│  │ cortex-reporter      → idle                      │              │
│  │ ...                                              │              │
│  └────────┬─────────────────────────────────────────┘              │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────┐                                               │
│  │  RetroOffice3D   │                                               │
│  │    Component     │                                               │
│  ├──────────────────┤                                               │
│  │ • Renders office │                                               │
│  │ • Places agents  │                                               │
│  │   at desks       │                                               │
│  │ • Animates       │                                               │
│  │   based on       │                                               │
│  │   status         │                                               │
│  └────────┬─────────┘                                               │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────┐              │
│  │             3D Office Scene                      │              │
│  ├──────────────────────────────────────────────────┤              │
│  │                                                  │              │
│  │  👤 ANALYST (blue, working)    🪑               │              │
│  │                                                  │              │
│  │  👤 STRATEGIST (purple, idle)  🪑               │              │
│  │                                                  │              │
│  │  👤 EXECUTOR (green, working)  🪑               │              │
│  │                                                  │              │
│  │  👤 REPORTER (amber, idle)     🪑               │              │
│  │                                                  │              │
│  └──────────────────────────────────────────────────┘              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│ Cortex      │
│ Capital     │  "ANALYST reviewing portfolio for user_123"
│ Agent       │
└──────┬──────┘
       │
       │ notifyAnalystActivity()
       ▼
┌─────────────────────────────────────────────────┐
│ CortexActivityEvent {                           │
│   timestamp: 1711010000000,                     │
│   agentRole: "ANALYST",                         │
│   activityType: "analyzing",                    │
│   description: "Reviewing portfolio...",        │
│   metadata: { userId: "user_123" }              │
│ }                                               │
└──────┬──────────────────────────────────────────┘
       │
       │ HTTP POST
       ▼
┌─────────────────────────────────────────────────┐
│ POST /api/cortex/activity                       │
│   ▼                                             │
│ Validate event                                  │
│   ▼                                             │
│ pushActivity(event)                             │
│   ▼                                             │
│ Activity Feed Buffer                            │
│   ▼                                             │
│ Notify Subscribers                              │
│   ▼                                             │
│ Cortex Bridge                                   │
│   ▼                                             │
│ Update status: cortex-analyst → "working"       │
│   ▼                                             │
│ RetroOffice3D re-renders                        │
│   ▼                                             │
│ ANALYST agent turns blue, moves around desk     │
└─────────────────────────────────────────────────┘
```

## Activity Types → Agent Status Mapping

```
Activity Type       → Agent Visual Status
─────────────────────────────────────────
analyzing          → working (agent moves, colored)
trading            → working
reporting          → working
strategizing       → working
monitoring         → working
executing          → working
idle               → idle (agent sits still, gray)
```

## Integration Methods

### 1. HTTP Webhook (Recommended)

```
Cortex Capital                    Claw3D
     │                               │
     │  POST /api/cortex/activity    │
     │ ───────────────────────────►  │
     │                               │
     │  { success: true }            │
     │ ◄───────────────────────────  │
```

### 2. File-based (Simple)

```
Cortex Capital                    Claw3D
     │                               │
     │  Append to                    │
     │  /tmp/cortex-activity.jsonl   │
     │ ──────────┐                   │
     │           │                   │
     │           ▼                   │
     │      [JSONL File]             │
     │                          Poll │
     │                      ◄────────┤
     │                               │
     │                         Read  │
     │                      ◄────────┤
```

### 3. WebSocket (Real-time)

```
Cortex Capital                    Claw3D
     │                               │
     │  ws://claw3d/ws/cortex        │
     │ ◄────────────────────────────►│
     │                               │
     │  { event }                    │
     │ ───────────────────────────►  │
     │                               │
     │  { event }                    │
     │ ───────────────────────────►  │
```

## 7 Agent Desk Layout

```
Office Grid View (Top-down):

      3         6         9        12        15
   ┌─────────────────────────────────────────────┐
 3 │  📊 ANALYST   ♟️  STRATEGIST   🎯 OPTIONS   │
   │                                              │
 6 │  ⚡ EXECUTOR   📝 REPORTER     📈 DAY_TRADER │
   │                                              │
   │                                   🚀 MOMENTUM│
   └─────────────────────────────────────────────┘

Legend:
📊 ANALYST          - Portfolio analysis (blue)
♟️  STRATEGIST       - Market strategy (purple)
⚡ EXECUTOR         - Trade execution (green)
📝 REPORTER         - Reports/summaries (amber)
🎯 OPTIONS          - Options Greeks (red)
📈 DAY_TRADER       - Intraday momentum (cyan)
🚀 MOMENTUM         - Sector rotation (pink)
```

---

**File:** `/Users/atlasbuilds/clawd/cortex-fishtank/CORTEX-INTEGRATION-DIAGRAM.md`  
**Created:** 2026-03-21  
**Built by:** Atlas 🔥
