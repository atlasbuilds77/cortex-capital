# Cortex Capital - Dashboard Design Spec

## Design Philosophy

**Inspired by:** Robinhood (simplicity) + Wealthfront (long-term focus) + Bloomberg (data when needed)

**Core Principles:**
1. **Trust through clarity** - Clean, readable, no clutter
2. **Mobile-first** - Most users check on phone
3. **Progressive disclosure** - Simple by default, detail on demand
4. **AI transparency** - Show what agents are doing and why

---

## User Journey

### 1. LANDING PAGE → SIGNUP
```
Landing Page
    ↓
[Start Free Trial]
    ↓
Email/Password + OAuth (Google/Apple)
    ↓
Onboarding Wizard
```

### 2. ONBOARDING WIZARD (5 steps)
```
Step 1: Risk Assessment
    - 5 quick questions
    - "How would you react to a 20% drop?"
    - Slider-based, visual
    
Step 2: Goals
    - Retirement / Growth / Income / Wealth Building
    - Timeline selector
    
Step 3: Interests (Optional)
    - Sectors: Tech, Clean Energy, Healthcare...
    - Themes: AI, EV, Dividend...
    
Step 4: Custom Picks (Optional)
    - "Any stocks you love?"
    - Type to search, add chips
    - We validate quality
    
Step 5: Exclusions (Optional)
    - "Anything to avoid?"
    - Fossil fuels, tobacco, weapons...
```

### 3. CONNECT BROKER
```
Select Broker Screen
    ↓
[Alpaca] [Tradier] [Robinhood] [Interactive Brokers]
    ↓
OAuth flow (or username/password for RH)
    ↓
Portfolio Import
    ↓
AI Analysis ("Here's what we see...")
    ↓
Recommendation Preview
    ↓
[Approve & Start] or [Customize]
```

### 4. MAIN DASHBOARD
```
┌─────────────────────────────────────────────────────┐
│  CORTEX CAPITAL              [Settings] [Profile]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TOTAL VALUE         DAILY CHANGE                  │
│  $124,567.89         +$1,234.56 (+1.2%)           │
│                                                     │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░         │
│  6 month performance chart (sparkline)             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🤖 AI ACTIVITY                          [See All] │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✅ ANALYST checked portfolio health (2h ago) │   │
│  │ 🔄 STRATEGIST rebalancing Monday 9:30 AM     │   │
│  │ 💡 MOMENTUM sees XLK momentum building       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 POSITIONS                            [See All] │
│                                                     │
│  NVDA    50 shares    $44,500    +12.3%   ████    │
│  AAPL    200 shares   $34,400    +4.2%    ███     │
│  QQQ     50 shares    $24,250    +2.1%    ██      │
│  TSLA    100 shares   $17,500    -2.8%    █       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📅 UPCOMING                                        │
│  • Monday: Weekly rebalance                        │
│  • March 28: NVDA earnings (watching)              │
│  • April 1: Monthly report                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [📊 Portfolio] [🤖 Agents] [📈 Activity] [⚙️ Settings] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Key Screens

### A. Portfolio Screen
- Positions table with P&L
- Sector allocation pie chart
- Risk metrics (beta, volatility)
- Tax-loss harvesting opportunities

### B. Agents Screen (Fish Tank Light)
- 7 agent cards with status
- What each is working on
- Recent decisions with reasoning
- Trust scores (internal)

### C. Activity Screen
- Trade history
- AI decisions log
- Performance attribution
- "Why did we buy/sell X?"

### D. Settings Screen
- Risk profile
- Preferences
- Broker connections
- Notifications
- Billing

---

## Fish Tank Integration

### Embedded View (Dashboard)
Small 3D preview showing agents working

### Full View (/fishtank)
```
┌─────────────────────────────────────────────────────┐
│  🐠 FISH TANK - Live AI Trading                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│         ┌─────────────────────────────┐            │
│         │                             │            │
│         │    [3D OFFICE SCENE]        │            │
│         │                             │            │
│         │  🤖 ANALYST at desk         │            │
│         │  📊 STRATEGIST presenting   │            │
│         │  💻 EXECUTOR trading        │            │
│         │                             │            │
│         └─────────────────────────────┘            │
│                                                     │
│  LIVE P&L: +$1,234.56 today                        │
│                                                     │
│  ACTIVITY FEED:                                    │
│  [10:05] ANALYST: "NVDA momentum strong, holding"  │
│  [10:02] EXECUTOR: "Bought 10 XLK @ $135.34"       │
│  [09:45] STRATEGIST: "Rotating into tech sector"   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **Next.js 14+** - App Router
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Components
- **Tremor** - Charts/data viz
- **React Three Fiber** - 3D (Fish Tank)
- **Framer Motion** - Animations

### Backend (Already Built)
- **Fastify** - API server
- **PostgreSQL** - Database (Render)
- **Alpaca/Tradier** - Brokers
- **Stripe** - Payments

---

## Component Library

### Cards
- StatCard (value, change, sparkline)
- PositionCard (symbol, qty, P&L)
- AgentCard (avatar, status, activity)
- AlertCard (type, message, action)

### Charts
- PortfolioChart (line, area)
- AllocationChart (donut)
- PerformanceChart (bar)
- SparklineChart (inline mini)

### Forms
- RiskSlider
- StockSearch
- BrokerSelector
- PreferenceToggles

### Navigation
- BottomNav (mobile)
- Sidebar (desktop)
- TopBar (branding, profile)

---

## Color Palette

```css
/* Primary */
--background: #0a0a1a;        /* Deep space */
--surface: #12122a;           /* Card background */
--surface-elevated: #1a1a3a;  /* Hover/elevated */

/* Accents */
--primary: #00d4ff;           /* Electric cyan */
--secondary: #7c3aed;         /* Purple */
--success: #00ff88;           /* Money green */
--warning: #ffaa00;           /* Amber */
--danger: #ff4444;            /* Red */

/* Text */
--text-primary: #ffffff;
--text-secondary: #a0a0b0;
--text-muted: #606070;
```

---

## Mobile Considerations

- Bottom navigation (4 items max)
- Swipe for actions
- Pull to refresh
- Large touch targets (44px min)
- No horizontal scrolling
- Sticky headers

---

## Accessibility

- WCAG 2.1 AA minimum
- High contrast mode
- Screen reader labels
- Keyboard navigation
- Focus indicators
- Reduced motion option

---

## Next Steps

1. [ ] Set up Next.js frontend project
2. [ ] Install shadcn/ui + Tremor
3. [ ] Build component library
4. [ ] Create onboarding flow
5. [ ] Build main dashboard
6. [ ] Integrate Fish Tank
7. [ ] Connect to backend API
8. [ ] Deploy to Vercel

---

*Design spec created: 2026-03-21*
