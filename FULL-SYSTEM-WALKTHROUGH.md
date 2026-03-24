# CORTEX CAPITAL - FULL SYSTEM WALKTHROUGH

**The Complete Picture: How Everything Works**

*Last Updated: 2026-03-21 03:25 AM*

---

## 🎯 THE VISION

**"Your Personal Hedge Fund for $49-249/month"**

Instead of paying 2% AUM + 20% performance fees to a hedge fund, retail investors get AI-powered portfolio management for a flat monthly fee.

---

## 💰 THE THREE TIERS

### TIER 1: CONSERVATIVE ($49/mo)
**Target:** 50+ years old, $50K-$100K portfolio, capital preservation

**What they get:**
- ETFs only (VTI, BND, VTIP, BNDX)
- 30% stocks / 70% bonds allocation
- Quarterly rebalancing
- No options, no individual stocks
- Email reports monthly

**Strategy:**
```
Entry: RSI < 30 on pullbacks (buy the dip)
Exit: RSI > 70 or 5% drift from target
Rebalance: Every 90 days OR when drift > 5%
```

---

### TIER 2: MODERATE ($99/mo)
**Target:** 30-50 years old, $10K-$75K portfolio, balanced growth

**What they get:**
- Stocks + LEAPS (20% max in options)
- 60% stocks / 35% bonds / 5% alternatives
- Monthly rebalancing
- Individual stock picks (max 5% per position)
- Weekly email summaries

**LEAPS Strategy (THIS IS THE EDGE):**
```
Selection Criteria:
- Delta: 0.70-0.85 (deep in the money)
- Expiry: 12-24 months out
- Underlying: High-quality stocks (AAPL, MSFT, GOOGL, etc.)
- Max allocation: 20% of portfolio in LEAPS

Why LEAPS work:
- 80% of stock upside for 20% of the capital
- Theta decay minimal at 12+ months
- Leverage without margin risk

Rolling Rules:
- When DTE < 90 days: Roll to next year
- When delta drops below 0.60: Evaluate exit
- When profit > 50%: Consider taking profits
```

**Example LEAPS Trade:**
```
Stock: AAPL trading at $180
LEAPS: Jan 2028 $150 Call
Delta: 0.78 (moves $0.78 for every $1 AAPL moves)
Cost: $4,500 per contract (controls 100 shares = $18,000 worth)
Break-even: $195 at expiry
Risk: Premium paid ($4,500 max loss)
Reward: Unlimited upside with 4x leverage
```

---

### TIER 3: ULTRA AGGRESSIVE ($249/mo)
**Target:** 25-40 years old, $5K-$50K portfolio, maximum growth

**What they get:**
- Full options access (LEAPS, spreads, covered calls)
- Day trading signals (intraday only)
- Weekly sector rotation
- 85% stocks / 10% alternatives / 5% cash
- Real-time alerts + daily reports

**Day Trading Rules:**
```
Risk Management:
- 1% max risk per trade
- 3% max daily loss (hit it = done for day)
- NO overnight holds (flat by 3:45 PM)
- 2:1 minimum reward/risk ratio

Setups We Trade:
- Breakouts (price breaks resistance on 2x volume)
- Momentum (RSI > 70 with trend, ride it)
- News plays (earnings beats, FDA approvals)

Entry Window: 9:45 AM - 11:30 AM, 2:00 PM - 3:30 PM
Avoid: First 15 min (chaos), lunch hour (chop)
```

**Sector Rotation Strategy:**
```
Every Friday:
1. Rank all 11 sectors by relative strength vs SPY
2. Identify top 2 and bottom 2
3. Generate rotation trades

Every Monday:
4. Execute rotation (sell weak, buy strong)
5. Hold for minimum 3 weeks

Sectors tracked:
XLK (Tech), XLF (Financials), XLE (Energy), XLV (Healthcare),
XLY (Consumer Disc), XLP (Consumer Staples), XLI (Industrials),
XLB (Materials), XLRE (Real Estate), XLU (Utilities), XLC (Comms)
```

**Covered Calls:**
```
On stocks we own 100+ shares:
- Sell calls 10-15% OTM
- 30-45 DTE (days to expiry)
- Collect premium as income
- If called away, we made profit anyway
```

---

## 🤖 THE 7 AI AGENTS

Each agent has a SOUL.md personality and uses LLM (DeepSeek/GPT-4) for reasoning.

### Agent Workflow:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S PORTFOLIO                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  🩺 ANALYST                                                  │
│  "Your portfolio is 65% tech - that's concentrated risk.    │
│   Health score: 72/100. Recommending rebalance."            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ♟️ STRATEGIST                                               │
│  "Here's the plan: Trim NVDA by 5%, add XLV (healthcare).   │
│   This brings tech to 45%, adds defensive exposure."        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  👤 USER APPROVAL (or auto-execute if enabled)              │
│  "Do you approve this rebalancing plan? [YES] [NO] [MODIFY]"│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  🎯 EXECUTOR                                                 │
│  "Executing. SELL 10 NVDA @ $875.50. Filled.                │
│   BUY 25 XLV @ $142.30. Filled. Done."                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  📊 REPORTER                                                 │
│  "Trade confirmation sent to your email.                    │
│   Weekly summary scheduled for Monday."                     │
└─────────────────────────────────────────────────────────────┘
```

### Specialized Agents (Tier 2-3 only):

```
🧙‍♂️ OPTIONS STRATEGIST
- Selects LEAPS (delta 0.70-0.85, 12+ months)
- Manages covered calls
- Monitors Greeks daily
- Rolls positions before expiry danger zone

⚡ DAY TRADER (Tier 3 only)
- Scans for setups at market open
- Enters/exits same day
- Enforces 1% risk, 3% daily max
- Force exits at 3:45 PM

🏄 MOMENTUM (Tier 3 only)
- Friday: Ranks sectors
- Monday: Executes rotation
- Tracks relative strength
- 3-week minimum hold
```

---

## 🏗️ TECHNICAL ARCHITECTURE

### High-Level Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  Next.js Dashboard (Vercel)                                 │
│  - Portfolio view, P&L charts                               │
│  - Approve/reject recommendations                           │
│  - Settings, notifications                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                             │
│  Node.js/Fastify (Railway)                                  │
│  - REST endpoints                                           │
│  - WebSocket for real-time                                  │
│  - Auth (JWT + bcrypt)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PORTFOLIO      │ │    SCHEDULER     │ │    DATABASE      │
│    ENGINE        │ │   (node-cron)    │ │   (Supabase)     │
│                  │ │                  │ │                  │
│ - Load user      │ │ - 9 AM: Analyze  │ │ - Users          │
│ - Call agents    │ │ - Mon 8AM: Rebal │ │ - Portfolios     │
│ - Store results  │ │ - 1st: Reports   │ │ - Trades         │
└──────────────────┘ └──────────────────┘ └──────────────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                             │
│  Tradier API ─────── Quotes, Options, Execution             │
│  DeepSeek API ────── LLM reasoning ($0.0001/call)           │
│  Stripe ──────────── Payments ($49/$99/$249)                │
│  Resend ──────────── Email notifications                    │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Design:

```
User A (Conservative, $50K)     User B (Moderate, $25K)
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PORTFOLIO ENGINE                          │
│                                                             │
│  1. Load user from Supabase (SELECT * WHERE user_id = X)   │
│  2. Load their risk profile                                 │
│  3. Fetch portfolio from Tradier                            │
│  4. Call ANALYST with their context                         │
│  5. Generate recommendations                                │
│  6. Store results (INSERT WHERE user_id = X)               │
│                                                             │
│  ⚠️ Every query includes user_id - NO cross-user leakage   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Local Testing (Today)
```bash
cd /Users/atlasbuilds/clawd/cortex-capital
cp .env.example .env  # Already done
npm install
npm run dev           # Start server on localhost:3000
```

### Step 2: Database Setup (Supabase)
```bash
# Run all migrations
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_phase2_enhancements.sql
psql $DATABASE_URL -f migrations/003_profiles_and_options.sql
psql $DATABASE_URL -f migrations/004_engine_tables.sql
```

### Step 3: Deploy Backend (Railway)
```bash
# Connect Railway
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# - DATABASE_URL (Supabase connection string)
# - TRADIER_TOKEN
# - DEEPSEEK_API_KEY
# - STRIPE_SECRET_KEY
# - RESEND_API_KEY
```

### Step 4: Deploy Frontend (Vercel)
```bash
cd dashboard
vercel deploy --prod

# Set environment variables in Vercel:
# - NEXT_PUBLIC_API_URL (Railway backend URL)
# - NEXT_PUBLIC_STRIPE_KEY
```

### Step 5: Domain Setup
```
cortexcapital.ai → Vercel (frontend)
api.cortexcapital.ai → Railway (backend)
```

---

## 📈 SCALING PLAN

### Phase 1: MVP (0-100 users)
- Single Railway instance ($5/mo)
- Supabase free tier
- Manual monitoring

### Phase 2: Growth (100-1,000 users)
- Railway Pro ($20/mo)
- Supabase Pro ($25/mo)
- Add Redis for caching
- Background job queue (BullMQ)

### Phase 3: Scale (1,000-10,000 users)
- Multiple Railway instances + load balancer
- Dedicated Postgres
- Separate worker processes
- CDN for static assets

### Cost at Scale:
```
1,000 users × $99 avg = $99,000 MRR

Costs:
- Infrastructure: $200/mo
- Tradier API: Included (per-user accounts)
- DeepSeek: $30/mo (1000 users × $0.03)
- Stripe fees: $2,970/mo (3%)
- Total: ~$3,200/mo

Profit: $95,800/mo 🔥
```

---

## 📣 MARKETING PLAN

### Positioning:
**"The AI hedge fund you can actually afford"**

### Target Audience:
1. **Tech workers** (30-45, good income, no time to trade)
2. **Retirees** (50+, want safe growth, hate complexity)
3. **Side hustlers** (25-35, want aggressive growth)

### Channels:

**1. Content Marketing**
- YouTube: "How I let AI manage my portfolio"
- Twitter/X: Daily market insights from our agents
- Blog: Educational content on LEAPS, sector rotation

**2. Fish Tank Demo (Claw3D)**
- Live visualization of agents trading
- Public demo account everyone can watch
- "See the AI work before you trust it"

**3. Referral Program**
- Give $20, get $20
- 20% recurring commission for affiliates

**4. Comparison Content**
- "Cortex vs Betterment vs Wealthfront"
- "Why pay 0.25% AUM when you can pay $49 flat?"

### Launch Sequence:
1. **Week 1:** Beta with 10 friends/family
2. **Week 2:** Fix issues, collect testimonials
3. **Week 3:** Launch on Product Hunt
4. **Week 4:** Twitter/X marketing push
5. **Month 2:** YouTube content series
6. **Month 3:** Paid ads (once unit economics proven)

---

## 🎮 FISH TANK (CLAW3D)

The live demo that sells the product.

### What Users See:
```
┌─────────────────────────────────────────────────────────────┐
│                    CORTEX CAPITAL HQ                         │
│                    [3D Isometric Office]                    │
│                                                             │
│    📊 ANALYST          ♟️ STRATEGIST         🧙‍♂️ OPTIONS      │
│    [At desk]           [At desk]            [At desk]       │
│    "Analyzing          "Planning            "Checking       │
│     portfolio..."       rebalance..."        Greeks..."     │
│                                                             │
│    🎯 EXECUTOR          📊 REPORTER          ⚡ DAY_TRADER   │
│    [At desk]           [At desk]            [Standing]      │
│    "Executing          "Sending             "Watching       │
│     AAPL buy..."        report..."           TSLA..."       │
│                                                             │
│    ────────────────────────────────────────────────────     │
│    LIVE P&L: +$1,247.83 today | 23 trades | 78% win rate   │
└─────────────────────────────────────────────────────────────┘
```

### Demo Account:
- Real $10K account trading live
- All trades visible in real-time
- Shows agents "working" in the 3D office
- Updates every trade

---

## 🔐 HOW LEAPS SELECTION WORKS (DETAILED)

### The Algorithm:

```typescript
async function selectLEAPS(portfolio: Portfolio): Promise<LEAPSRecommendation[]> {
  // 1. Get universe of high-quality stocks
  const universe = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
  
  // 2. For each stock, get options chain
  for (const symbol of universe) {
    const chain = await tradier.getOptionsChain(symbol);
    
    // 3. Filter for LEAPS criteria
    const leaps = chain.filter(option => {
      const dte = daysToExpiry(option.expiration);
      return (
        option.type === 'call' &&
        dte >= 365 &&                    // 12+ months out
        dte <= 730 &&                    // Not more than 2 years
        option.delta >= 0.70 &&          // Deep ITM
        option.delta <= 0.85 &&          // But not too deep
        option.volume > 100 &&           // Liquid
        option.spread < 0.05 * option.ask // Tight spread (<5%)
      );
    });
    
    // 4. Rank by value (leverage vs cost)
    const ranked = leaps.sort((a, b) => {
      const leverageA = (a.delta * 100) / a.ask;
      const leverageB = (b.delta * 100) / b.ask;
      return leverageB - leverageA;
    });
    
    // 5. Take top pick
    if (ranked.length > 0) {
      recommendations.push({
        symbol,
        option: ranked[0],
        reason: `${symbol} LEAPS: ${ranked[0].delta} delta, ${dte} DTE, 
                 ${((1/ranked[0].ask) * ranked[0].delta * 100).toFixed(1)}x leverage`
      });
    }
  }
  
  return recommendations;
}
```

### Example Output:

```
LEAPS Recommendations for Moderate Tier:

1. AAPL Jan 2028 $150 Call
   - Delta: 0.78
   - Cost: $4,500 per contract
   - Leverage: 4.0x
   - Reason: "Strong fundamentals, 78% correlation to stock, 
              minimal theta decay at 22 months DTE"

2. MSFT Jan 2028 $350 Call
   - Delta: 0.75
   - Cost: $6,200 per contract
   - Leverage: 3.8x
   - Reason: "Cloud growth, AI tailwinds, deep ITM protection"

3. GOOGL Jan 2028 $140 Call
   - Delta: 0.72
   - Cost: $3,800 per contract
   - Leverage: 4.2x
   - Reason: "Undervalued vs peers, search monopoly, YouTube growth"

Portfolio Allocation:
- AAPL LEAPS: 8% ($8,000)
- MSFT LEAPS: 7% ($7,000)
- GOOGL LEAPS: 5% ($5,000)
- Total LEAPS: 20% (at limit)
```

---

## 📊 DAILY OPERATIONS

### Automated Schedule:

```
EVERY DAY:
├── 6:00 AM - System health check
├── 9:00 AM - ANALYST reviews all portfolios
├── 9:30 AM - Market opens
├── 9:45 AM - DAY_TRADER scans for setups
├── 10:00 AM - Send morning alerts
├── 3:45 PM - DAY_TRADER force-exits all positions
├── 4:00 PM - Market closes
├── 4:30 PM - Daily P&L calculation
└── 5:00 PM - Send daily digest (Tier 3 only)

EVERY MONDAY:
├── 8:00 AM - STRATEGIST generates rebalancing plans
├── 8:30 AM - MOMENTUM executes sector rotation
└── 9:00 AM - Send weekly preview

EVERY FRIDAY:
├── 3:00 PM - MOMENTUM ranks sectors
└── 4:00 PM - Send weekly summary

1ST OF MONTH:
├── 9:00 AM - Monthly performance report
├── 10:00 AM - Tax-loss harvesting scan
└── 11:00 AM - LEAPS roll check (< 90 DTE warning)
```

---

## 💡 THE EDGE

### Why We Win:

1. **Flat pricing** - $49-249/mo vs 0.25-2% AUM
   - User with $100K saves $250-2000/year

2. **AI-powered** - Not rules-based, actual reasoning
   - DeepSeek/GPT-4 understands market context
   - Adapts to changing conditions

3. **LEAPS access** - Most robo-advisors don't do options
   - 4x leverage without margin risk
   - Huge edge for moderate risk tolerance

4. **Transparency** - Fish tank shows exactly what we do
   - No black box
   - Watch the AI work

5. **Multi-tier** - Something for everyone
   - Conservative grandma: $49 ETFs
   - Aggressive millennial: $249 full options

---

## ✅ WHAT'S READY NOW

| Component | Status |
|-----------|--------|
| Backend API | ✅ Ready |
| Portfolio Engine | ✅ Ready |
| Scheduler | ✅ Ready |
| 7 AI Agents | ✅ Ready |
| LEAPS Selection | ✅ Ready |
| Day Trading | ✅ Ready |
| Sector Rotation | ✅ Ready |
| Tradier Integration | ✅ Ready |
| Stripe Payments | ✅ Keys configured |
| Fish Tank (Claw3D) | ✅ Cloned, integration built |
| Database Schema | ✅ Migrations ready |
| TypeScript | ✅ Zero errors |
| Security Audit | ✅ Opus approved |

---

## 🎯 NEXT STEPS

1. **Today:** Run locally, test with your Tradier account
2. **This week:** Deploy to Railway/Vercel
3. **Next week:** Beta with 5-10 users
4. **Week 3:** Fix issues, add fish tank
5. **Week 4:** Public launch

---

*Built by Atlas for Orion. 2026-03-21 03:25 AM* ⚡
