# Quick Start: Cortex Capital + Fish Tank

**Get your Cortex Capital trading system visualized in 5 minutes.**

## Prerequisites

- Cortex Capital running at `http://localhost:3001`
- Node.js 20+

## Setup (3 steps)

### 1. Install Dependencies

```bash
cd /Users/atlasbuilds/clawd/cortex-fishtank
npm install
```

### 2. Configure Environment

```bash
# Create .env.local
echo "NEXT_PUBLIC_CORTEX_API_URL=http://localhost:3001" > .env.local
```

### 3. Start Fish Tank

```bash
npm run dev
```

Open `http://localhost:3000/cortex` 🚀

## Verify Integration

Run the test suite:

```bash
npm run test:cortex
```

Expected output:
```
✅ Health Check                             OK
✅ P&L Endpoint                             OK
✅ Trades Endpoint                          OK
✅ Activity Endpoint                        OK
✅ Fish Tank P&L Proxy                      OK
✅ Fish Tank Trades Proxy                   OK
✅ POST /api/cortex/activity                Activity posted successfully

Passed: 7 | Failed: 0 | Total: 7

🎉 All tests passed! Cortex integration is working.
```

## What You'll See

### Dashboard (`/cortex`)

**Left column: Live P&L**
- Total P&L
- Today's P&L
- Open positions
- Day trades used
- Buying power

**Middle column: Recent Trades**
- Last 10 trades
- Buy/Sell/Close actions
- Ticker, quantity, price
- P&L per trade
- Agent that executed

**Right column: Agent Activity**
- Live agent status (ANALYST, STRATEGIST, EXECUTOR, etc.)
- What each agent is doing right now
- Activity timestamps
- Metadata (tickers, actions)

### The 7 Agents

Each agent appears with emoji + color when active:

- 📊 **ANALYST** (Blue) - Market analysis
- ♟️ **STRATEGIST** (Purple) - Strategic planning
- ⚡ **EXECUTOR** (Green) - Trade execution
- 📝 **REPORTER** (Amber) - Performance reports
- 🎯 **OPTIONS_STRATEGIST** (Red) - Options strategies
- 📈 **DAY_TRADER** (Cyan) - Day trading
- 🚀 **MOMENTUM** (Pink) - Momentum tracking

## Required Cortex API Endpoints

Your Cortex Capital must expose:

```
GET  /health                     → Health check
GET  /api/pnl                    → Live P&L data
GET  /api/trades/recent?limit=10 → Recent trades
GET  /api/activity?limit=20      → Agent activity
```

See [CORTEX_SETUP.md](CORTEX_SETUP.md) for full API specs.

## Troubleshooting

### "Cortex API Offline" indicator

**Check Cortex is running:**
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"healthy","version":"1.0.0"}
```

If not running, start Cortex Capital first.

### No data showing

**Test endpoints manually:**
```bash
curl http://localhost:3001/api/pnl
curl http://localhost:3001/api/trades/recent?limit=5
curl http://localhost:3001/api/activity?limit=10
```

All should return JSON data.

### CORS errors in console

Add CORS headers to your Cortex API:

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});
```

## Next Steps

### Customize Agent Layout

Edit agent positions in `src/config/cortex-agents.ts`:

```typescript
{
  id: "cortex-analyst",
  name: "Analyst",
  desk: {
    x: 5,  // Change position
    y: 3,
    facing: "south",
  },
}
```

See [CORTEX_AGENTS.md](CORTEX_AGENTS.md) for full customization guide.

### Use in Your App

Import components anywhere:

```tsx
import { CortexDashboard } from "@/features/office/components/CortexDashboard";

export default function MyPage() {
  return <CortexDashboard layout="compact" />;
}
```

### Add Real-time Updates

Implement Server-Sent Events in Cortex:

```javascript
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  
  // Send events
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  // Push updates
  onTrade(trade => send('trade', trade));
  onPnLUpdate(pnl => send('pnl', pnl));
});
```

Fish Tank auto-connects via `subscribeToCortexUpdates()`.

## Files Created

```
cortex-fishtank/
├── src/
│   ├── config/cortex-agents.ts        # Agent definitions ✅
│   ├── lib/cortex-api.ts              # API connector ✅
│   ├── features/office/
│   │   ├── components/
│   │   │   ├── CortexDashboard.tsx    # Main dashboard ✅
│   │   │   ├── CortexPnLDisplay.tsx   # P&L widget ✅
│   │   │   ├── CortexTradesFeed.tsx   # Trades feed ✅
│   │   │   └── CortexActivityFeed.tsx # Activity feed ✅
│   │   └── hooks/useCortexData.ts     # React hooks ✅
│   ├── app/
│   │   ├── cortex/page.tsx            # Dashboard page ✅
│   │   └── api/cortex/
│   │       ├── pnl/route.ts           # P&L proxy ✅
│   │       └── trades/route.ts        # Trades proxy ✅
│   └── agents/
│       ├── activity-feed.ts           # Activity manager ✅
│       └── cortex-bridge.ts           # Integration bridge ✅
├── CORTEX_SETUP.md                    # Full setup guide ✅
├── CORTEX_AGENTS.md                   # Agent configuration ✅
└── QUICKSTART_CORTEX.md               # This file ✅
```

## Documentation

- [CORTEX_SETUP.md](CORTEX_SETUP.md) - Complete integration guide
- [CORTEX_AGENTS.md](CORTEX_AGENTS.md) - Agent configuration reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - Claw3D architecture
- [README.md](README.md) - Main Claw3D documentation

## Support

Questions? Issues?
- Check [CORTEX_SETUP.md](CORTEX_SETUP.md) troubleshooting section
- Run `npm run test:cortex` to diagnose problems
- Review API specs in documentation

---

**Ready to trade visually?** 📈

Start Cortex → Start Fish Tank → Watch your agents work in real-time.
