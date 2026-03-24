# Cortex Capital - Frontend

AI-powered investing platform built with Next.js 14 App Router.

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **Tailwind CSS v3** - Styling
- **shadcn/ui** - Component library
- **Tremor** - Charts and data visualization
- **TypeScript** - Type safety

## Getting Started

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── dashboard/          # Main dashboard
│   ├── onboarding/         # 5-step wizard
│   ├── connect/            # Broker connection
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── stat-card.tsx
│   │   ├── position-card.tsx
│   │   └── agent-card.tsx
│   └── dashboard/          # Dashboard-specific components
│       ├── portfolio-chart.tsx
│       ├── activity-feed.tsx
│       └── positions-list.tsx
├── lib/
│   ├── api.ts              # API client
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Features

### Landing Page
- Clean hero section
- Feature highlights
- CTA buttons (Sign Up / Sign In)

### Onboarding Wizard
1. Risk Assessment (3 questions)
2. Investment Goals (multiple select)
3. Sector Interests (optional)
4. Custom Stock Picks (optional)
5. Exclusions (optional)

### Broker Connection
- Support for Alpaca, Tradier, Robinhood, Interactive Brokers
- Secure credential handling
- OAuth flow support

### Dashboard
- Total portfolio value
- Daily change ($ and %)
- Portfolio performance chart (6 months)
- AI activity feed
- Positions list with P&L
- Upcoming events calendar
- Mobile-responsive bottom navigation

## Design System

### Colors

```css
--background: #0a0a1a        /* Deep space */
--surface: #12122a           /* Card background */
--surface-elevated: #1a1a3a  /* Hover/elevated */
--primary: #00d4ff           /* Electric cyan */
--secondary: #7c3aed         /* Purple */
--success: #00ff88           /* Money green */
--warning: #ffaa00           /* Amber */
--danger: #ff4444            /* Red */
```

### Components

- **StatCard** - Display key metrics with optional change indicator
- **PositionCard** - Stock position with P&L and visual bar
- **AgentCard** - AI agent activity with status icon
- **PortfolioChart** - Area chart for portfolio performance
- **ActivityFeed** - Live feed of AI agent actions
- **PositionsList** - Full list of portfolio positions

## API Integration

The frontend connects to the backend API at `http://localhost:3001`.

See `lib/api.ts` for all available endpoints:
- Auth (login, signup)
- Portfolio (snapshot, positions)
- Agents (activity feed)
- Onboarding (submit preferences)
- Broker (connect, disconnect)

## Mobile-First Design

- Responsive layout with Tailwind breakpoints
- Bottom navigation for mobile (< 768px)
- Large touch targets (44px minimum)
- Swipe gestures support (future)
- Pull to refresh (future)

## Next Steps

- [ ] Add Fish Tank 3D visualization (React Three Fiber)
- [ ] Implement real-time WebSocket updates
- [ ] Add settings page
- [ ] Build agent detail screens
- [ ] Create activity history page
- [ ] Add notifications system
- [ ] Implement dark/light mode toggle
- [ ] Add accessibility improvements

## Deployment

Deploy to Vercel:

```bash
vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` - Production API URL

---

Built with ⚡ by Cortex Capital
