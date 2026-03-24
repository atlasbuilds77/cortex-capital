# Cortex Capital Agents Configuration

The Fish Tank visualizes 7 distinct trading agents from Cortex Capital.

## Agent Roster

### 1. ANALYST 📊
- **Role:** Market analysis and portfolio review
- **Color:** Blue (#3B82F6)
- **Position:** Desk at (5, 3) facing south
- **Decoration:** Analytics screens
- **Activities:** 
  - Analyzing market conditions
  - Reviewing portfolio performance
  - Researching securities
  - Generating analysis reports

### 2. STRATEGIST ♟️
- **Role:** Strategic planning and sector rotation
- **Color:** Purple (#8B5CF6)
- **Position:** Desk at (8, 3) facing south
- **Decoration:** Chess board
- **Activities:**
  - Developing trading strategies
  - Analyzing sector rotation patterns
  - Planning long-term positions
  - Risk assessment

### 3. EXECUTOR ⚡
- **Role:** Trade execution and order management
- **Color:** Green (#10B981)
- **Position:** Desk at (5, 6) facing north
- **Decoration:** Trading terminal
- **Activities:**
  - Placing buy/sell orders
  - Managing order flow
  - Executing strategies
  - Monitoring fills

### 4. REPORTER 📝
- **Role:** Performance reporting and notifications
- **Color:** Amber (#F59E0B)
- **Position:** Desk at (8, 6) facing north
- **Decoration:** Printer and email station
- **Activities:**
  - Sending daily summaries
  - Generating performance reports
  - Notifying on trades
  - Creating weekly reviews

### 5. OPTIONS_STRATEGIST 🎯
- **Role:** Options strategies and Greeks analysis
- **Color:** Red (#EF4444)
- **Position:** Desk at (11, 3) facing south
- **Decoration:** Greeks charts
- **Activities:**
  - Calculating option Greeks
  - Analyzing options strategies
  - Managing spreads
  - Volatility analysis

### 6. DAY_TRADER 📈
- **Role:** Intraday momentum trading
- **Color:** Cyan (#06B6D4)
- **Position:** Desk at (11, 6) facing north
- **Decoration:** Multi-monitor setup
- **Activities:**
  - Executing day trades
  - Monitoring intraday momentum
  - Scalping opportunities
  - Managing day trade limits

### 7. MOMENTUM 🚀
- **Role:** Momentum and relative strength tracking
- **Color:** Pink (#EC4899)
- **Position:** Desk at (14, 4) facing west
- **Decoration:** Sector heatmap
- **Activities:**
  - Tracking relative strength leaders
  - Monitoring momentum indicators
  - Identifying breakouts
  - Sector rotation signals

## Office Layout

```
        North
          ↑
    3     4     5     6
  ┌─────┬─────┬─────┬─────┐
  │  📊 │     │  ♟️  │     │ (row 3)
  │ ANA │     │ STR │     │
  ├─────┼─────┼─────┼─────┤
  │     │     │     │  🚀 │ (row 4)
  │     │     │     │ MOM │
  ├─────┼─────┼─────┼─────┤
  │     │     │     │     │ (row 5)
  │     │     │     │     │
  ├─────┼─────┼─────┼─────┤
  │  ⚡ │     │  📝 │     │ (row 6)
  │ EXE │     │ REP │     │
  └─────┴─────┴─────┴─────┘

  ┌─────┬─────┬─────┐
  │  🎯 │     │  📈 │ (rows 3-6)
  │ OPT │     │ DAY │
  │     │     │     │
  │     │     │     │
  └─────┴─────┴─────┘
   11    12    13

Legend:
ANA = ANALYST
STR = STRATEGIST
EXE = EXECUTOR
REP = REPORTER
OPT = OPTIONS_STRATEGIST
DAY = DAY_TRADER
MOM = MOMENTUM
```

## Activity Types

Agents can be in these states:

| Activity Type | Visual Status | Description |
|---------------|---------------|-------------|
| `analyzing` | Working | Analyzing data or markets |
| `trading` | Working | Executing trades |
| `reporting` | Working | Generating reports |
| `strategizing` | Working | Planning strategies |
| `monitoring` | Working | Watching markets |
| `executing` | Working | Placing orders |
| `idle` | Idle | Waiting for signals |

## Customization

### Change Agent Properties

Edit `/Users/atlasbuilds/clawd/cortex-fishtank/src/config/cortex-agents.ts`:

```typescript
{
  id: "cortex-analyst",
  name: "Analyst",
  role: "ANALYST",
  color: "#3B82F6",  // Change color
  emoji: "📊",        // Change emoji
  desk: {
    x: 5,            // Change X position
    y: 3,            // Change Y position
    facing: "south", // Change facing direction
    decoration: "analytics_screens", // Change desk decoration
  },
}
```

### Add New Agent

1. Add new role to `CortexAgentRole` type:
```typescript
export type CortexAgentRole =
  | "ANALYST"
  | "STRATEGIST"
  // ... existing roles
  | "MY_NEW_AGENT"; // Add here
```

2. Add agent config to `CORTEX_AGENTS` array:
```typescript
{
  id: "cortex-my-agent",
  name: "My Agent",
  role: "MY_NEW_AGENT",
  color: "#FF5733",
  emoji: "🔥",
  desk: {
    x: 17,
    y: 4,
    facing: "west",
    decoration: "custom_screen",
  },
}
```

3. Update Cortex Capital backend to emit activity for new agent role.

### Change Office Layout

Adjust `x`, `y`, and `facing` properties in agent desk configs. Grid coordinates:
- X: horizontal position (0-20)
- Y: vertical position (0-10)
- Facing: "north", "south", "east", "west"

## Integration with Cortex Capital

### Send Agent Activity

From Cortex Capital, POST to `/api/cortex/activity`:

```javascript
await fetch('http://localhost:3000/api/cortex/activity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timestamp: Date.now(),
    agentRole: 'ANALYST',
    activityType: 'analyzing',
    description: 'Analyzing AAPL technical indicators',
    metadata: {
      ticker: 'AAPL',
      action: 'ANALYZE'
    }
  })
});
```

### Agent State Machine

```
        ┌─────┐
        │ IDLE │
        └──┬──┘
           │
    ┌──────┴──────┐
    │             │
    ↓             ↓
┌────────┐   ┌─────────┐
│WORKING │   │  ERROR  │
└────┬───┘   └─────────┘
     │
     ↓
  ┌─────┐
  │ IDLE │
  └─────┘
```

Agents transition from `idle` → `working` when activity is received, then back to `idle` when no activity for 30+ seconds.

## Desk Decorations

Available desk decorations:
- `analytics_screens` - Multiple monitors with charts
- `chess_board` - Strategic thinking symbol
- `trading_terminal` - Direct market access
- `printer_email` - Communication hub
- `greeks_charts` - Options Greeks displays
- `multi_monitor` - Standing desk setup
- `sector_heatmap` - Sector rotation display

Add custom decorations in the 3D office implementation.

## Colors Reference

Agent colors are used consistently across:
- Avatar backgrounds
- Activity feed badges
- Desk highlights
- 3D office representations

| Agent | Hex | Tailwind |
|-------|-----|----------|
| ANALYST | #3B82F6 | blue-500 |
| STRATEGIST | #8B5CF6 | violet-500 |
| EXECUTOR | #10B981 | emerald-500 |
| REPORTER | #F59E0B | amber-500 |
| OPTIONS_STRATEGIST | #EF4444 | red-500 |
| DAY_TRADER | #06B6D4 | cyan-500 |
| MOMENTUM | #EC4899 | pink-500 |

---

**Questions?** See [CORTEX_SETUP.md](CORTEX_SETUP.md) for full integration guide.
