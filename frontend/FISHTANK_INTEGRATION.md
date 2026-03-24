# Fish Tank 3D Integration

## Overview
Fish Tank 3D visualization integrated into Cortex Capital dashboard to provide real-time agent activity monitoring and P&L visualization.

## Components Created

### 1. `components/dashboard/fish-tank-embed.tsx`
- **Mini view**: Displays Fish Tank in a dashboard card (aspect-video)
- **Fullscreen mode**: Expand button launches fullscreen overlay
- **Live data overlay**: Shows P&L, percentage change, last trade
- **Auto-refresh**: Polls `http://localhost:3001/api/fishtank/live` every 2s

**Features:**
- Iframe embed of Fish Tank running at `http://localhost:3000`
- Maximize/minimize controls
- Live P&L overlay on mini view
- Smooth transitions between views

### 2. `components/dashboard/agent-status.tsx`
- **Agent list**: Shows all active/idle/error agents
- **Status indicators**: Color-coded badges (green=active, yellow=idle, red=error)
- **Current tasks**: Real-time display of what each agent is doing
- **Trade counts**: Shows trades today per agent
- **Uptime tracking**: Hours active for each agent
- **Detail modal**: Click agent to see full details

**API endpoint**: `http://localhost:3001/api/fishtank/agents`

### 3. `app/fishtank/page.tsx`
Full-page Fish Tank experience with three-column layout:

**Left Sidebar:**
- Live P&L card (large display)
- Performance stats (win rate, Sharpe ratio, trades today)
- Agent status widget

**Center:**
- Full-size Fish Tank iframe
- Main visualization area

**Right Sidebar:**
- Live activity feed
- Recent trades with outcomes
- Win/loss indicators
- Timestamps

### 4. Updated `app/dashboard/page.tsx`
- Added Fish Tank widget (2/3 width on desktop)
- Added Agent Status widget (1/3 width)
- Positioned prominently above Activity & Positions section

## API Endpoints Required

### `GET /api/fishtank/live`
Returns current Fish Tank state:
```json
{
  "pnl": 1234.56,
  "pnl_pct": 2.4,
  "total_value": 52456.78,
  "agents_active": 3,
  "trades_today": 18,
  "win_rate": 67.5,
  "sharpe_ratio": 2.8,
  "last_trade": {
    "symbol": "SPY 525C",
    "action": "BUY",
    "timestamp": "2026-03-21T12:00:00Z"
  }
}
```

### `GET /api/fishtank/agents`
Returns agent status list:
```json
{
  "agents": [
    {
      "id": "helios-1",
      "name": "Helios",
      "status": "active",
      "current_task": "Scanning SPY 0DTE opportunities",
      "last_action": "Bought SPY 525C @ 2.15",
      "uptime_hours": 8.5,
      "trades_today": 12
    }
  ]
}
```

### `GET /api/fishtank/activity`
Returns recent activity feed:
```json
{
  "activity": [
    {
      "id": "1",
      "timestamp": "2026-03-21T12:00:00Z",
      "agent": "Helios",
      "action": "BUY",
      "symbol": "SPY 525C",
      "outcome": "OPEN",
      "pnl": 0
    }
  ]
}
```

## Usage

### Dashboard View
Navigate to `/dashboard` - Fish Tank widget appears as a prominent card with:
- Mini visualization
- Live P&L overlay
- Expand button → fullscreen

### Full Page View
Navigate to `/fishtank` or click expand on dashboard widget for:
- Immersive full-screen experience
- Live stats sidebar
- Agent monitoring
- Activity feed

## Development

### Fish Tank Server
The Fish Tank 3D app should run at `http://localhost:3000`

### API Server
Backend API should run at `http://localhost:3001`

### Fallback Behavior
Components include mock data for development when APIs are unavailable:
- Demo P&L values
- Sample agent states
- Mock activity feed

## Styling
- Uses existing Cortex Capital design system
- Tailwind classes match dashboard theme
- Gradient text for headers
- Color-coded P&L (green=positive, red=negative)
- Dark mode native

## Icons
Uses `lucide-react` (already installed):
- `Maximize2` / `Minimize2` - expand/collapse
- `Activity` - status indicators
- `TrendingUp` / `TrendingDown` - P&L changes
- `Brain` - agent idle state
- `AlertCircle` - error state

## Next Steps
1. Implement backend API endpoints at `localhost:3001/api/fishtank/*`
2. Connect Fish Tank 3D to live trading data
3. Test fullscreen mode on various screen sizes
4. Add WebSocket support for real-time updates (optional upgrade from polling)
5. Consider adding chart overlays to Fish Tank visualization
