# Cortex Capital - Trading Floor Architecture

## The Vision
A Wall Street trading floor where AI agents work, discuss, trade, and take breaks.
Clients watch their portfolio being managed by a team of specialists.
Sea monkeys vibes - they're always alive, always doing something.

## Agents (The Trading Floor Team)

### Management
- **ATLAS** - General Manager
  - Oversees the floor
  - Breaks ties in debates
  - Reports to the human (Orion/client)
  - Can intervene in any discussion
  - The "adult in the room"

### Trading Desk
- **ANALYST** 📊 - Market Analyst
  - Researches market conditions
  - Provides data-driven analysis
  - First to speak on any trade idea

- **STRATEGIST** 🎯 - Chief Strategist  
  - Big picture allocation
  - Rebalancing decisions
  - Challenges assumptions

- **RISK** 🛡️ - Risk Manager
  - Position sizing
  - Stop losses
  - Portfolio exposure limits
  - Can VETO trades

### Execution
- **EXECUTOR** 🎬 - Trade Executor
  - Timing and execution
  - Slippage management
  - Actually places the trades

### Specialists
- **MOMENTUM** 🚀 - Momentum Trader
  - Sector rotation
  - Trend following
  - Weekly rebalancing

- **GROWTH** 📈 - Growth Advocate
  - Bullish opportunities
  - High-conviction plays
  - "Let it ride" mentality

- **VALUE** 💎 - Value Investor
  - Contrarian views
  - Undervalued picks
  - "Buy the dip" mentality

## Agent States (What You See)

```
WORKING     - At desk, analyzing (typing animation)
DISCUSSING  - In meeting pod with others (speech bubbles)
EXECUTING   - At terminal, placing trade (flashing screen)
BREAK       - Coffee area, stretching (idle animation)
ALERT       - Standing, urgent notification (red glow)
IDLE        - At desk, monitoring (subtle movement)
```

## Trading Floor Layout

```
┌─────────────────────────────────────────────────────────┐
│                    TICKER TAPE                           │
│  SPY +0.45%  QQQ +0.62%  AAPL -0.12%  NVDA +2.31%       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────┐  ┌─────┐  ┌─────┐       ┌──────────────┐     │
│   │ANLST│  │STRAT│  │RISK │       │              │     │
│   │ 📊  │  │ 🎯  │  │ 🛡️  │       │   MEETING    │     │
│   └─────┘  └─────┘  └─────┘       │     POD      │     │
│                                    │              │     │
│   ┌─────┐  ┌─────┐  ┌─────┐       └──────────────┘     │
│   │EXEC │  │MMTM │  │GRWTH│                             │
│   │ 🎬  │  │ 🚀  │  │ 📈  │       ┌──────────────┐     │
│   └─────┘  └─────┘  └─────┘       │   COFFEE     │     │
│                                    │    AREA      │     │
│   ┌─────┐           ┌─────┐       └──────────────┘     │
│   │VALUE│           │ATLAS│                             │
│   │ 💎  │           │ ⚡  │  <- GM Office               │
│   └─────┘           └─────┘                             │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  TRADE LOG: BOUGHT 100 NVDA @ $892.45 | SOLD 50 SPY... │
└─────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Continuous Life Cycle
```
Every 15 minutes:
  - Random agent takes a "break" (coffee area)
  - Others continue working
  - Creates natural movement

Every hour:
  - Team meeting in meeting pod
  - Discuss portfolio status
  - Logged to discussion feed

Market hours (6:30 AM - 1 PM PT):
  - Higher activity
  - More discussions
  - Trade executions visible

After hours:
  - Agents "wind down"
  - Research mode
  - Planning for tomorrow
```

### 2. Discussion Triggers
```
Portfolio review    → All agents to meeting pod
Trade idea          → ANALYST + STRATEGIST + RISK
Risk alert          → RISK stands up, alert animation
Trade execution     → EXECUTOR at terminal, ticker updates
Market open         → All agents active, morning briefing
Market close        → End of day recap
```

### 3. Visual Feedback
```
Agent speaking      → Speech bubble with text
Agent thinking      → Thought bubble with "..."
Trade placed        → Green flash on EXECUTOR desk
Trade failed        → Red flash, RISK alert
Disagreement        → Agents face each other, debate animation
Consensus reached   → Agents nod, return to desks
```

## Tech Stack

### Backend (Already Built)
- Cortex Capital API (port 3001)
- DeepSeek for LLM discussions
- Alpaca/Tradier/Robinhood integrations
- SSE streaming for real-time updates

### Frontend (To Build)
- Fork RetroOffice3D → TradingFloor3D
- Wall Street aesthetic (dark wood, green screens, ticker tape)
- Agent state machine (working/discussing/break/alert)
- Real-time position updates
- Discussion panel overlay

### State Management
```typescript
interface AgentFloorState {
  id: string;
  name: string;
  position: { x: number; y: number };
  state: 'working' | 'discussing' | 'executing' | 'break' | 'alert' | 'idle';
  currentActivity: string;
  lastSpoke: Date;
  inMeeting: boolean;
  meetingWith: string[];
}
```

## Integration with Atlas

Atlas (the OpenClaw agent you talk to) becomes the General Manager:
- Can join any discussion
- Gets notified of all trades
- Reports summaries to Orion
- Can override agent decisions
- The human interface to the trading floor

## Client Experience

1. Client logs in
2. Sees their portfolio value, P&L
3. Watches agents at desks working
4. Sees discussions happen in real-time
5. Can trigger discussions ("Review my portfolio")
6. Watches trades get executed
7. Feels like they have a TEAM managing their money

## Files to Create

```
/cortex-capital/
├── trading-floor/
│   ├── TradingFloor3D.tsx      # Main 3D scene
│   ├── AgentDesk.tsx           # Individual desk component
│   ├── MeetingPod.tsx          # Discussion area
│   ├── CoffeeArea.tsx          # Break zone
│   ├── TickerTape.tsx          # Live prices
│   ├── TradeLog.tsx            # Recent executions
│   └── state/
│       ├── floorState.ts       # Agent positions/states
│       └── activityEngine.ts   # Schedules agent behavior
```

## Next Steps

1. Fork RetroOffice3D to TradingFloor3D
2. Create Wall Street assets (desks, terminals, ticker)
3. Implement agent state machine
4. Connect to existing discussion backend
5. Add Atlas as GM with special UI
6. Deploy and test with demo portfolio
