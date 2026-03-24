# CORTEX CAPITAL - Figma Design Specification

## 🎨 BRAND IDENTITY

### Colors
```
Primary Background: #0a0a1a (Deep space black)
Secondary Background: #12122a (Dark purple-blue)
Card Background: #1a1a3a (Elevated surface)

Primary Accent: #00d4ff (Electric cyan - AI/tech feel)
Secondary Accent: #7c3aed (Purple - wealth/premium)
Success: #00ff88 (Green - money/growth)
Warning: #ffaa00 (Amber)
Error: #ff4444 (Red)

Text Primary: #ffffff
Text Secondary: #a0a0b0
Text Muted: #606070
```

### Typography
```
Headlines: Inter Bold / SF Pro Bold
  - H1: 64px / 72px line-height
  - H2: 48px / 56px
  - H3: 32px / 40px
  - H4: 24px / 32px

Body: Inter Regular / SF Pro
  - Large: 20px / 32px
  - Regular: 16px / 24px
  - Small: 14px / 20px

Monospace (numbers): JetBrains Mono / SF Mono
```

### Effects
```
Glow effect: 0 0 40px rgba(0, 212, 255, 0.3)
Card shadow: 0 4px 24px rgba(0, 0, 0, 0.4)
Glassmorphism: background blur 12px, bg rgba(26, 26, 58, 0.8)
```

---

## 📱 LANDING PAGE SECTIONS

### 1. HERO SECTION (100vh)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: CORTEX]                    [Pricing] [Login] [CTA] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         YOUR PERSONAL                                       │
│         HEDGE FUND                                          │
│                                                             │
│         Hedge fund strategies. AI-powered. $49/month.       │
│                                                             │
│         [ Start Free Trial ]  [ Watch Demo ▶ ]              │
│                                                             │
│         "Wall Street charges 2% + 20% and requires $1M.    │
│          We bring the same strategies to everyone."         │
│                                                             │
│                    ↓ Scroll                                 │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Background: Animated gradient mesh (dark blues/purples)
- "HEDGE FUND" has subtle cyan glow
- CTA button: Solid cyan with hover glow
- Secondary button: Outline style
- Floating abstract shapes in background (low opacity)
- Stats bar at bottom: "$2.4M managed • 1,200 portfolios • 12.4% avg return*"

---

### 2. PROBLEM SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                 THE OLD WAY DOESN'T WORK                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  HEDGE      │  │  ROBO-      │  │  DIY        │         │
│  │  FUNDS      │  │  ADVISORS   │  │  TRADING    │         │
│  │             │  │             │  │             │         │
│  │  2% + 20%   │  │  Boring     │  │  Emotional  │         │
│  │  $1M min    │  │  ETFs only  │  │  90% lose   │         │
│  │  Exclusive  │  │  7% returns │  │  No time    │         │
│  │             │  │             │  │             │         │
│  │  ❌          │  │  😴          │  │  💸          │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Three cards with red/muted accents (problem = negative)
- Icons: Money bags, sleeping face, chart going down
- Cards have subtle red border glow
- Section background: Slightly darker than hero

---

### 3. SOLUTION SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              MEET YOUR AI PORTFOLIO TEAM                    │
│                                                             │
│     7 AI agents work 24/7 to grow your wealth               │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🩺      │ │ ♟️      │ │ 🎯      │ │ 📊      │           │
│  │ ANALYST │ │STRATGST │ │EXECUTOR │ │REPORTER │           │
│  │         │ │         │ │         │ │         │           │
│  │Monitors │ │ Plans   │ │ Trades  │ │ Updates │           │
│  │ health  │ │ moves   │ │perfectly│ │  you    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │ 🧙‍♂️      │ │ ⚡      │ │ 🏄      │                       │
│  │ OPTIONS │ │DAYTRADR │ │MOMENTUM │                       │
│  │         │ │         │ │         │                       │
│  │  LEAPS  │ │Intraday │ │ Sector  │                       │
│  │  expert │ │ signals │ │rotation │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Agent cards with avatar/emoji, name, role
- Cyan glow on hover
- Cards connected with subtle dotted lines (workflow)
- Each card could animate in on scroll
- Premium agents (Options, DayTrader, Momentum) have purple accent

---

### 4. HOW IT WORKS

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    HOW IT WORKS                             │
│                                                             │
│     ①              ②              ③              ④         │
│   ┌────┐         ┌────┐         ┌────┐         ┌────┐      │
│   │ 📝 │ ──────► │ 🏗️ │ ──────► │ 🤖 │ ──────► │ 📈 │      │
│   └────┘         └────┘         └────┘         └────┘      │
│                                                             │
│   Tell us        We build       AI manages     You check   │
│   your goals     your custom    everything     in when     │
│   (5 min)        portfolio      24/7           you want    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Horizontal timeline with numbered steps
- Animated connecting lines
- Each step has icon, title, description
- Mobile: Vertical stack

---

### 5. STRATEGIES SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           NOT YOUR GRANDMA'S ROBO-ADVISOR                   │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │                                                   │    │
│   │  ✓ LEAPS Options        4x leverage, no margin   │    │
│   │  ✓ Sector Rotation      Ride the momentum        │    │
│   │  ✓ Covered Calls        Generate income          │    │
│   │  ✓ Day Trading          Partner tier only        │    │
│   │  ✓ Tax-Loss Harvesting  Automatic savings        │    │
│   │  ✓ Your Stock Picks     We validate & include    │    │
│   │                                                   │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│             [ See All Strategies → ]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Checklist style with green checkmarks
- Each item has title + brief description
- Card with glassmorphism effect
- Background: Subtle chart/graph pattern

---

### 6. PRICING SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      SIMPLE PRICING                         │
│                                                             │
│              [ Monthly ]  [ Annual - Save 20% ]             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   SCOUT     │  │  OPERATOR   │  │  PARTNER    │         │
│  │             │  │  ★ POPULAR  │  │             │         │
│  │    $49      │  │    $99      │  │    $249     │         │
│  │   /month    │  │   /month    │  │   /month    │         │
│  │             │  │             │  │             │         │
│  │ ✓ ETFs     │  │ ✓ Everything│  │ ✓ Everything│         │
│  │ ✓ Quarterly│  │   in Scout  │  │   in Operator│        │
│  │ ✓ Monthly  │  │ ✓ Stocks    │  │ ✓ Day trading│        │
│  │   reports  │  │ ✓ LEAPS     │  │ ✓ Full opts │         │
│  │            │  │ ✓ Monthly   │  │ ✓ Weekly    │         │
│  │            │  │   rebalance │  │ ✓ API access│         │
│  │            │  │             │  │ ✓ SMS alerts│         │
│  │            │  │             │  │             │         │
│  │ [Get Scout]│  │[Get Operator│  │[Get Partner]│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Middle card (Operator) elevated/highlighted
- "POPULAR" badge in cyan
- Annual toggle shows discounted prices
- Feature comparison with checkmarks
- CTA buttons match tier importance

---

### 7. FISH TANK / DEMO SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  WATCH THE AI WORK                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                                                     │  │
│   │              [CLAW3D EMBED / VIDEO]                 │  │
│   │                                                     │  │
│   │     Live demo account • Updated in real-time        │  │
│   │                                                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│         Today: +$247.83  │  This Month: +$1,892.41         │
│                                                             │
│                   [ Open Full Demo → ]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Embedded iframe or video player
- Live P&L stats below
- "LIVE" indicator with pulsing red dot
- Dark border with subtle glow

---

### 8. FAQ SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  FREQUENTLY ASKED QUESTIONS                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ▶ Is this a hedge fund?                             │  │
│   └─────────────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ▶ Is my money safe?                                 │  │
│   └─────────────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ▶ What brokers do you support?                      │  │
│   └─────────────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ▶ Can I lose money?                                 │  │
│   └─────────────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ ▶ What if I want to stop?                           │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Accordion style (click to expand)
- Subtle animation on expand
- Arrow rotates when open

---

### 9. FINAL CTA SECTION

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              READY TO GROW YOUR WEALTH?                     │
│                                                             │
│       Join 1,200+ investors using AI to build wealth.       │
│                                                             │
│              [ Start Free 14-Day Trial ]                    │
│                                                             │
│           No credit card required. Cancel anytime.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Large CTA button with glow effect
- Trust badges below (SSL, Tradier partner, etc.)
- Background: Gradient mesh animation

---

### 10. FOOTER

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  CORTEX         Product        Company       Legal         │
│  CAPITAL        Pricing        About         Terms         │
│                 Features       Blog          Privacy       │
│  [Social]       Demo           Support       Disclaimer    │
│  [Icons]        FAQ            Careers                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  © 2026 Cortex Capital. Not a registered investment        │
│  advisor. Trading involves risk. Past performance does     │
│  not guarantee future results.                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 RESPONSIVE BREAKPOINTS

```
Desktop: 1280px+  (full layout)
Tablet:  768px    (2 columns → 1, horizontal → vertical)
Mobile:  375px    (single column, stacked CTAs)
```

---

## 🎬 ANIMATIONS

1. **Hero text:** Fade in + slide up on load
2. **Agent cards:** Stagger fade in on scroll
3. **Stats counter:** Number count up animation
4. **CTA buttons:** Subtle pulse glow
5. **Background:** Slow gradient mesh movement
6. **Fish tank:** Live updating numbers

---

## 📁 FIGMA FILE STRUCTURE

```
Cortex Capital Landing Page
├── 🎨 Design System
│   ├── Colors
│   ├── Typography
│   ├── Effects
│   └── Components
├── 📱 Desktop (1440px)
│   ├── Hero
│   ├── Problem
│   ├── Solution
│   ├── How It Works
│   ├── Strategies
│   ├── Pricing
│   ├── Demo
│   ├── FAQ
│   ├── CTA
│   └── Footer
├── 📱 Tablet (768px)
│   └── [All sections]
├── 📱 Mobile (375px)
│   └── [All sections]
└── 🧩 Components
    ├── Buttons
    ├── Cards
    ├── Agent Cards
    ├── Pricing Cards
    ├── FAQ Accordion
    └── Navigation
```

---

## 🚀 NEXT STEPS

1. **Create Figma file** with this structure
2. **Build design system** (colors, type, components)
3. **Design desktop version** first
4. **Responsive variations**
5. **Prototype interactions**
6. **Export for development**

---

*Design spec created by Atlas for Cortex Capital*
*Ready for Figma implementation*
