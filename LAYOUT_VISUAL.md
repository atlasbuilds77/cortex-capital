# Fish Tank Integration - Visual Layout

## Dashboard View (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────┐
│  CORTEX CAPITAL                          Settings | Sign Out    │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────┬────────────────────────────────────────┐
│  TOTAL VALUE           │  DAILY CHANGE                          │
│  $124,567.89           │  +$1,234.56  (+1.2%)                   │
└────────────────────────┴────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Portfolio Chart                              │
│  [Chart visualization here]                                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────┐
│  🐟 FISH TANK            [Expand ⛶]  │  🤖 AGENT STATUS       │
│  ┌───────────────────────────────┐   │  ┌───────────────────┐ │
│  │                               │   │  │ Helios  [ACTIVE]  │ │
│  │   Fish Tank Iframe Here       │   │  │ Scanning SPY...   │ │
│  │   (aspect-video)              │   │  │ → Bought SPY 525C │ │
│  │                               │   │  │ 12 trades • 8.5h  │ │
│  │ ┌──────────────────────────┐  │   │  └───────────────────┘ │
│  │ │ Live P&L: +$1,234.56     │  │   │  ┌───────────────────┐ │
│  │ │ +2.4%                    │  │   │  │ Meridian [ACTIVE] │ │
│  │ │ Last: BUY SPY 525C       │  │   │  │ Monitoring VIX... │ │
│  │ └──────────────────────────┘  │   │  │ → Closed QQQ 440P │ │
│  └───────────────────────────────┘   │  │ 8 trades • 8.5h   │ │
│                                       │  └───────────────────┘ │
└──────────────────────────────────────┴─────────────────────────┘

┌─────────────────────────┬───────────────────────────────────────┐
│  ACTIVITY FEED          │  POSITIONS                            │
│  [Activity list]        │  [Position cards]                     │
└─────────────────────────┴───────────────────────────────────────┘
```

---

## Full Page View (`/fishtank`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back   🐟 FISH TANK          3 agents • 18 trades today      │
└─────────────────────────────────────────────────────────────────┘

┌──────────┬──────────────────────────────────────┬──────────────┐
│  STATS   │         FISH TANK                    │  ACTIVITY    │
│          │                                      │              │
│ ┌──────┐ │  ┌────────────────────────────────┐ │ LIVE ACTIVITY│
│ │ P&L  │ │  │                                │ │              │
│ │      │ │  │                                │ │ ┌──────────┐ │
│ │+1234 │ │  │    Full Screen Fish Tank       │ │ │ Helios   │ │
│ │+2.4% │ │  │         Iframe                 │ │ │ BUY      │ │
│ └──────┘ │  │                                │ │ │ SPY 525C │ │
│          │  │                                │ │ │ 12:00:45 │ │
│ ┌──────┐ │  │                                │ │ │ OPEN     │ │
│ │PERF  │ │  │                                │ │ └──────────┘ │
│ │      │ │  │                                │ │              │
│ │Win:  │ │  │                                │ │ ┌──────────┐ │
│ │67.5% │ │  │                                │ │ │ Meridian │ │
│ │      │ │  │                                │ │ │ SELL     │ │
│ │Sharpe│ │  │                                │ │ │ QQQ 440P │ │
│ │2.8   │ │  │                                │ │ │ 11:55:22 │ │
│ └──────┘ │  │                                │ │ │ WIN      │ │
│          │  │                                │ │ │ +$156.50 │ │
│ ┌──────┐ │  │                                │ │ └──────────┘ │
│ │AGENTS│ │  │                                │ │              │
│ │      │ │  │                                │ │ ┌──────────┐ │
│ │Helios│ │  │                                │ │ │ Helios   │ │
│ │Active│ │  │                                │ │ │ SELL     │ │
│ │12↑   │ │  │                                │ │ │ SPY 524P │ │
│ │      │ │  │                                │ │ │ 11:45:10 │ │
│ │Merid │ │  └────────────────────────────────┘ │ │ LOSS     │ │
│ │Active│ │                                      │ │ -$45.20  │ │
│ │8↑    │ │                                      │ └──────────┘ │
│ └──────┘ │                                      │              │
│          │                                      │              │
└──────────┴──────────────────────────────────────┴──────────────┘
```

---

## Mobile View (Dashboard)

```
┌───────────────────────────────┐
│  CORTEX CAPITAL         ☰     │
├───────────────────────────────┤
│                               │
│  TOTAL VALUE                  │
│  $124,567.89                  │
│                               │
│  DAILY CHANGE                 │
│  +$1,234.56  (+1.2%)          │
│                               │
├───────────────────────────────┤
│  Portfolio Chart              │
├───────────────────────────────┤
│  🐟 FISH TANK      [Expand]   │
│  ┌─────────────────────────┐  │
│  │  Fish Tank Iframe       │  │
│  │                         │  │
│  │ ┌─────────────────────┐ │  │
│  │ │ +$1,234.56 +2.4%    │ │  │
│  │ └─────────────────────┘ │  │
│  └─────────────────────────┘  │
├───────────────────────────────┤
│  🤖 AGENT STATUS              │
│  ┌─────────────────────────┐  │
│  │ Helios [ACTIVE]         │  │
│  │ Scanning SPY 0DTE...    │  │
│  └─────────────────────────┘  │
├───────────────────────────────┤
│  ACTIVITY FEED                │
├───────────────────────────────┤
│  POSITIONS                    │
└───────────────────────────────┘
│  📊    🤖    📈    ⚙️         │  ← Bottom Nav
└───────────────────────────────┘
```

---

## Component Interactions

### Dashboard → Fullscreen Flow
```
User clicks [Expand ⛶] button
    ↓
FishTankEmbed sets isExpanded = true
    ↓
Renders fixed overlay (z-50)
    ↓
Fish Tank iframe fills entire screen
    ↓
User clicks [Minimize] button
    ↓
Returns to mini card view
```

### Dashboard → Full Page Flow
```
User navigates to /fishtank route
    ↓
FishTankPage component loads
    ↓
3-column layout renders
    ↓
Stats sidebar + Full iframe + Activity feed
    ↓
User clicks back button
    ↓
Returns to /dashboard
```

### Agent Detail Flow
```
User clicks agent card in AgentStatus
    ↓
setSelectedAgent(agent)
    ↓
Modal overlay opens (z-50)
    ↓
Shows full agent details
    ↓
User clicks X or backdrop
    ↓
Modal closes
```

---

## Data Flow

```
Frontend Components
    ↓
Fetch from API (2-5s intervals)
    ↓
http://localhost:3001/api/fishtank/live
http://localhost:3001/api/fishtank/agents
http://localhost:3001/api/fishtank/activity
    ↓
Backend aggregates trading data
    ↓
Returns JSON
    ↓
Components update state
    ↓
React re-renders with live data
```

---

## Color Coding

### P&L Display
- **Green** (#10b981): Positive P&L, wins
- **Red** (#ef4444): Negative P&L, losses
- **Gray** (#9ca3af): Neutral/pending

### Agent Status Badges
- **Green** (#10b981): Active (trading)
- **Yellow** (#f59e0b): Idle (monitoring)
- **Red** (#ef4444): Error state

### Activity Icons
- **📈 TrendingUp**: Winning trades
- **📉 TrendingDown**: Losing trades
- **⚡ Activity**: Active status
- **🧠 Brain**: Idle status
- **⚠️ AlertCircle**: Error status

---

## Responsive Breakpoints

- **Mobile** (< 768px): Single column, bottom nav
- **Tablet** (768px - 1024px): 2-column grid
- **Desktop** (> 1024px): 3-column grid
- **Wide** (> 1920px): Max-width container

---

**All layouts implemented and responsive ✅**
