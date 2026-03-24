# Cortex Capital Fish Tank Setup

Complete guide for running the Fish Tank visualization with Cortex Capital.

## Overview

The Fish Tank (Claw3D) provides live visualization of your Cortex Capital trading system:

- **Live P&L tracking** - Real-time profit/loss, positions, buying power
- **Agent activity feed** - Watch your 7 Cortex agents work (ANALYST, STRATEGIST, EXECUTOR, etc.)
- **Recent trades** - Live trade notifications with P&L
- **3D office view** - Visual representation of agent activity in a 3D workspace

## Architecture

```
┌─────────────────────┐
│  Cortex Capital     │
│  Trading System     │
│  (localhost:3001)   │
└──────────┬──────────┘
           │ HTTP API
           ↓
┌─────────────────────┐
│  Fish Tank          │
│  Frontend           │
│  (localhost:3000)   │
└─────────────────────┘
```

The Fish Tank fetches data from Cortex Capital's API and displays it in real-time.

## Prerequisites

### 1. Cortex Capital Running

Your Cortex Capital system must be running and accessible at `http://localhost:3001`.

Verify it's running:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456
}
```

### 2. Node.js 20+

```bash
node --version  # Should be v20.x.x or higher
```

## Installation

### 1. Clone and Install

```bash
cd /Users/atlasbuilds/clawd/cortex-fishtank
npm install
```

### 2. Configure Environment

Create `.env.local`:
```bash
# Cortex Capital API URL
NEXT_PUBLIC_CORTEX_API_URL=http://localhost:3001

# Optional: OpenClaw Gateway (for agent system integration)
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:18789
```

### 3. Start the Fish Tank

```bash
npm run dev
```

The Fish Tank will start at `http://localhost:3000`.

## Required Cortex Capital API Endpoints

Your Cortex Capital system must expose these endpoints:

### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456
}
```

### Live P&L
```http
GET /api/pnl
```
Response:
```json
{
  "totalPnL": 1250.50,
  "todayPnL": 340.20,
  "weekPnL": 890.00,
  "openPositions": 3,
  "dayTrades": 2,
  "accountValue": 25000.00,
  "buyingPower": 12500.00,
  "timestamp": 1710876543210
}
```

### Recent Trades
```http
GET /api/trades/recent?limit=10
```
Response:
```json
[
  {
    "id": "trade_123",
    "agentRole": "DAY_TRADER",
    "ticker": "AAPL",
    "action": "BUY",
    "quantity": 100,
    "price": 175.50,
    "timestamp": 1710876543210,
    "strategyType": "momentum",
    "profit": 250.00
  }
]
```

### Agent Activity
```http
GET /api/activity?limit=20
```
Response:
```json
[
  {
    "agentRole": "ANALYST",
    "activity": "Analyzing market conditions for AAPL",
    "timestamp": 1710876543210,
    "metadata": {
      "ticker": "AAPL",
      "action": "ANALYZE"
    }
  }
]
```

### Real-time Updates (Optional - SSE)
```http
GET /api/events
```
Server-Sent Events stream for real-time updates:
- `event: activity` - Agent activity updates
- `event: trade` - Trade notifications
- `event: pnl` - P&L updates

## Usage

### 1. Open the Dashboard

Navigate to `http://localhost:3000/cortex` to see the full dashboard.

### 2. Dashboard Layouts

The dashboard supports 3 layouts:

**Full Layout** (default)
- 3 columns: P&L | Trades | Activity
- Best for large screens

**Compact Layout**
- 2 columns: (P&L + Trades) | Activity
- Best for medium screens

**Minimal Layout**
- P&L only
- Best for mobile or embedded views

Change layout in the component:
```tsx
<CortexDashboard layout="compact" />
```

### 3. Integrate into Custom Pages

```tsx
import { CortexDashboard } from "@/features/office/components/CortexDashboard";

export default function MyPage() {
  return (
    <div className="p-6">
      <CortexDashboard 
        layout="full"
        tradesLimit={15}
        activityLimit={25}
      />
    </div>
  );
}
```

### 4. Use Individual Components

```tsx
import { CortexPnLDisplay } from "@/features/office/components/CortexPnLDisplay";
import { CortexTradesFeed } from "@/features/office/components/CortexTradesFeed";

export default function CustomView() {
  return (
    <div>
      <CortexPnLDisplay />
      <CortexTradesFeed limit={10} />
    </div>
  );
}
```

## The 7 Cortex Agents

The Fish Tank visualizes these 7 agents:

| Agent | Role | Emoji | Color | Description |
|-------|------|-------|-------|-------------|
| **ANALYST** | Analysis | 📊 | Blue | Market analysis and portfolio review |
| **STRATEGIST** | Strategy | ♟️ | Purple | Strategic planning and sector rotation |
| **EXECUTOR** | Execution | ⚡ | Green | Trade execution and order management |
| **REPORTER** | Reporting | 📝 | Amber | Performance reporting and notifications |
| **OPTIONS_STRATEGIST** | Options | 🎯 | Red | Options strategies and Greeks analysis |
| **DAY_TRADER** | Day Trading | 📈 | Cyan | Intraday momentum trading |
| **MOMENTUM** | Momentum | 🚀 | Pink | Momentum and relative strength tracking |

Each agent appears in the activity feed with their emoji and color when active.

## Configuration

### Agent Definitions

Edit `/Users/atlasbuilds/clawd/cortex-fishtank/src/config/cortex-agents.ts` to customize:
- Agent names
- Emojis
- Colors
- Desk positions in 3D office
- Desk decorations

### API Settings

Edit `/Users/atlasbuilds/clawd/cortex-fishtank/src/lib/cortex-api.ts` to configure:
- API base URL
- Request timeout
- Polling intervals
- Error handling

### Polling Intervals

Default: 5 seconds for P&L/trades, 30 seconds for health checks.

Edit in `/Users/atlasbuilds/clawd/cortex-fishtank/src/features/office/hooks/useCortexData.ts`:
```tsx
const POLL_INTERVAL = 5000; // Change to your preference
```

## Troubleshooting

### "Cortex API Offline"

**Check Cortex Capital is running:**
```bash
curl http://localhost:3001/health
```

**Check environment variable:**
```bash
echo $NEXT_PUBLIC_CORTEX_API_URL
```

Should be `http://localhost:3001`.

### CORS Errors

If Cortex Capital is on a different port/domain, you'll need CORS headers:

```javascript
// In your Cortex Capital API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### No Data Showing

**Verify API responses:**
```bash
curl http://localhost:3001/api/pnl
curl http://localhost:3001/api/trades/recent?limit=5
curl http://localhost:3001/api/activity?limit=10
```

**Check browser console** for fetch errors.

### Stale Data

Check polling interval in `useCortexData.ts`. Default is 5 seconds.

For real-time updates, implement SSE in Cortex Capital:
```javascript
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send events
  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Example: send P&L every second
  const interval = setInterval(() => {
    send('pnl', { totalPnL: 1250, todayPnL: 340, ... });
  }, 1000);
  
  req.on('close', () => clearInterval(interval));
});
```

## Development

### File Structure

```
cortex-fishtank/
├── src/
│   ├── config/
│   │   └── cortex-agents.ts          # Agent definitions
│   ├── lib/
│   │   └── cortex-api.ts             # API connector
│   ├── features/office/
│   │   ├── components/
│   │   │   ├── CortexDashboard.tsx   # Main dashboard
│   │   │   ├── CortexPnLDisplay.tsx  # P&L widget
│   │   │   ├── CortexTradesFeed.tsx  # Trades feed
│   │   │   └── CortexActivityFeed.tsx # Activity feed
│   │   └── hooks/
│   │       └── useCortexData.ts      # React hooks
│   ├── app/
│   │   ├── cortex/
│   │   │   └── page.tsx              # Dashboard page
│   │   └── api/cortex/
│   │       ├── activity/route.ts     # Activity proxy
│   │       ├── pnl/route.ts          # P&L proxy
│   │       └── trades/route.ts       # Trades proxy
│   └── agents/
│       ├── activity-feed.ts          # Activity feed manager
│       └── cortex-bridge.ts          # Integration bridge
└── CORTEX_SETUP.md                   # This file
```

### Adding New Features

**Add a new metric to P&L:**
1. Update `CortexPnL` interface in `lib/cortex-api.ts`
2. Update Cortex Capital API response
3. Update `CortexPnLDisplay.tsx` to show new metric

**Add a new agent:**
1. Add agent to `CORTEX_AGENTS` array in `config/cortex-agents.ts`
2. Update `CortexAgentRole` type
3. Restart Fish Tank

**Add real-time WebSocket:**
1. Implement WebSocket server in Cortex Capital
2. Use `subscribeToCortexUpdates()` from `lib/cortex-api.ts`
3. Update hooks to listen for events

## Production Deployment

### Environment Variables

```bash
# Production Cortex API URL
NEXT_PUBLIC_CORTEX_API_URL=https://cortex.yourdomain.com

# OpenClaw Gateway (if using)
NEXT_PUBLIC_GATEWAY_URL=wss://gateway.yourdomain.com
```

### Build

```bash
npm run build
npm run start
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t cortex-fishtank .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_CORTEX_API_URL=http://cortex:3001 \
  cortex-fishtank
```

## Support

### Documentation
- [Claw3D Architecture](ARCHITECTURE.md)
- [Code Documentation](CODE_DOCUMENTATION.md)
- [Contributing Guide](CONTRIBUTING.md)

### Issues
Open issues at the project repository.

## License

MIT

---

**Ready to visualize your trades?** 🚀

Start Cortex Capital → Start Fish Tank → Watch agents work in real-time.
