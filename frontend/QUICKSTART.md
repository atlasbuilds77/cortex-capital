# Cortex Capital Frontend - Quick Start Guide

## Installation (2 minutes)

```bash
# Navigate to frontend directory
cd /Users/atlasbuilds/clawd/cortex-capital/frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

## What You'll See

### Landing Page (/)
- Hero with "Cortex Capital" gradient logo
- Feature highlights
- **[Start Free Trial]** button → `/onboarding`
- **[Sign In]** button → `/login` (placeholder)

### Onboarding Flow (/onboarding)
5 steps with progress bar:
1. **Risk Assessment** - 3 questions about investment style
2. **Goals** - Select: Retirement, Growth, Income, Wealth Building
3. **Interests** - Optional sectors: Tech, Clean Energy, etc.
4. **Custom Picks** - Optional stock search (placeholder)
5. **Exclusions** - Optional: Fossil Fuels, Tobacco, Weapons, Gambling

Completes → `/connect`

### Broker Connection (/connect)
- Select broker: Alpaca, Tradier, Robinhood, IBKR
- Enter credentials (API keys or username/password)
- Connect → `/dashboard`
- Or **Skip for now (demo mode)** → `/dashboard`

### Dashboard (/dashboard)
Main screen with:
- **Total Value:** $124,567.89
- **Daily Change:** +$1,234.56 (+1.2%)
- **Portfolio Chart:** 6-month performance (Tremor area chart)
- **AI Activity:** Recent agent actions (ANALYST, STRATEGIST, MOMENTUM)
- **Positions:** NVDA, AAPL, QQQ, TSLA with P&L bars
- **Upcoming Events:** Rebalancing, earnings, reports
- **Bottom Nav (mobile):** Portfolio, Agents, Activity, Settings

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14.2.0 | React framework |
| React | 18.3.0 | UI library |
| TypeScript | 5.3.0 | Type safety |
| Tailwind CSS | 3.4.0 | Styling |
| Tremor | 3.17.0 | Charts |
| Framer Motion | 11.0.0 | Animations (future) |

## Mock Data

Currently using realistic mock data for development:
- Portfolio value: $124,567.89 (+1.2% today)
- 4 positions: NVDA (+12.3%), AAPL (+4.2%), QQQ (+2.1%), TSLA (-2.8%)
- 3 agent activities (last 2-4 hours)
- 6 months chart data ($100k → $124k growth)

## API Integration

Backend API should be running at **http://localhost:3001**

If backend is running, the frontend will call:
- `GET /api/portfolio` - Portfolio snapshot
- `GET /api/positions` - Position list
- `GET /api/agents/activity` - AI activity feed
- `POST /api/onboarding` - Submit preferences
- `POST /api/broker/connect` - Connect broker

If backend is NOT running, components fall back to mock data automatically.

## File Structure

```
frontend/
├── app/
│   ├── dashboard/page.tsx      ← Main dashboard
│   ├── onboarding/page.tsx     ← 5-step wizard
│   ├── connect/page.tsx        ← Broker connection
│   ├── page.tsx                ← Landing page
│   ├── layout.tsx              ← Root layout
│   └── globals.css             ← Design system
├── components/
│   ├── ui/                     ← Reusable components
│   ├── dashboard/              ← Dashboard components
│   └── onboarding/             ← Onboarding components
├── lib/
│   ├── api.ts                  ← API client
│   └── utils.ts                ← Utilities
└── package.json
```

## Color Palette

All colors from DASHBOARD-DESIGN.md:

| Variable | Hex | Use |
|----------|-----|-----|
| `--background` | #0a0a1a | Page background (deep space) |
| `--surface` | #12122a | Card background |
| `--surface-elevated` | #1a1a3a | Hover states |
| `--primary` | #00d4ff | Electric cyan (CTA, links) |
| `--secondary` | #7c3aed | Purple (accents) |
| `--success` | #00ff88 | Money green (gains) |
| `--danger` | #ff4444 | Red (losses) |
| `--warning` | #ffaa00 | Amber (alerts) |

## Development Tips

### Hot Reload
Changes auto-reload. Edit any file and see updates instantly.

### TypeScript Errors
```bash
npm run build  # Check for type errors
```

### Add shadcn/ui Components
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

### Tailwind IntelliSense
Install "Tailwind CSS IntelliSense" VS Code extension for autocomplete.

## Common Tasks

### Change API URL
Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.cortexcapital.com
```

### Add New Page
```bash
mkdir -p app/newpage
touch app/newpage/page.tsx
```

### Add New Component
```bash
touch components/ui/my-component.tsx
```

### Format Currency
```typescript
import { formatCurrency } from '@/lib/utils'
formatCurrency(124567.89) // "$124,567.89"
```

### Format Percent
```typescript
import { formatPercent } from '@/lib/utils'
formatPercent(1.2) // "+1.20%"
```

## Mobile Testing

Test responsive design:
1. Open DevTools (Cmd+Option+I)
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone or Android
4. See bottom navigation appear

## Production Build

```bash
npm run build    # Create optimized build
npm start        # Run production server
```

## Deploy to Vercel

```bash
vercel           # Deploy
```

Set environment variables in Vercel dashboard.

## Next Steps

- [ ] Connect to real backend API
- [ ] Add Fish Tank 3D visualization
- [ ] Implement WebSocket for real-time updates
- [ ] Build Settings page
- [ ] Add Agent detail screens
- [ ] Create Activity history page
- [ ] Add notification system

---

**Status: FULLY FUNCTIONAL** ✅

Mock data allows full testing without backend.
Ready for API integration when backend is live.

**Enjoy building! 🚀**
