# CORTEX CAPITAL - MASTER DOCUMENT 🏦

**"Your Personal Hedge Fund"**

*Last Updated: 2026-03-21 02:40 PDT*

---

## 🎯 EXECUTIVE SUMMARY

Cortex Capital is an AI-powered portfolio management platform that brings hedge fund strategies to retail investors through three risk-tiered subscription plans.

**What Makes Us Different:**
1. **LLM-Powered Agents** - Not just algorithms, actual AI reasoning
2. **Tiered Risk Profiles** - Conservative to Ultra Aggressive
3. **Multi-Broker Support** - Tradier, Alpaca, Webull, Robinhood
4. **Transparent Pricing** - Flat monthly fee, no AUM percentage
5. **Full Options Integration** - LEAPS, spreads, covered calls

---

## 💰 PRICING TIERS

| Tier | Price | Target | Strategy |
|------|-------|--------|----------|
| **CONSERVATIVE** | $49/mo | 50+ yo, $50K-$100K | ETFs only, quarterly rebalancing |
| **MODERATE** | $99/mo | 30-50 yo, $10K-$75K | Stocks + LEAPS (20% max), monthly |
| **ULTRA AGGRESSIVE** | $249/mo | 25-40 yo, $5K-$50K | Full options, day trading, sector rotation |

---

## 🤖 AI AGENTS (LLM-Powered)

Each agent has a SOUL.md personality file and uses DeepSeek/GPT-4/Claude for reasoning.

| Agent | Role | Personality |
|-------|------|-------------|
| **ANALYST** 🩺 | Portfolio health, risk metrics | The meticulous diagnostician |
| **STRATEGIST** ♟️ | Rebalancing plans, allocation | The patient chess player |
| **EXECUTOR** 🎯 | Trade execution, order flow | The surgical operator |
| **REPORTER** 📊 | Emails, notifications, reports | The clear communicator |
| **OPTIONS_STRATEGIST** 🧙‍♂️ | LEAPS, spreads, Greeks | The derivatives wizard |
| **DAY_TRADER** ⚡ | Intraday setups (Ultra only) | The lightning scalper |
| **MOMENTUM** 🏄 | Weekly sector rotation (Ultra only) | The trend surfer |

**LLM Configuration:**
- Primary: DeepSeek Chat (cheap, fast)
- Backup: GPT-4 Turbo (complex reasoning)
- Premium: Claude Opus (when accuracy critical)

---

## 📊 STRATEGIES BY TIER

### CONSERVATIVE (30/70 Equities/Bonds)
- **Assets:** VTI, BND, VTIP, BNDX
- **Entry:** RSI < 30 on pullbacks
- **Exit:** RSI > 70 or 5% drift from target
- **Rebalancing:** Quarterly or 5% drift trigger
- **No options, no individual stocks**

### MODERATE (60/35/5 Equities/Bonds/Alternatives)
- **Assets:** VTI, QQQ, BND, individual stocks (max 5% each)
- **LEAPS:** 0.70-0.85 delta, 12-24 month expiry, 20% max allocation
- **Entry:** MACD crossover + RSI confirmation
- **Exit:** 8% trailing stop, 15% profit target
- **Rebalancing:** Monthly or 3% drift trigger

### ULTRA AGGRESSIVE (85/10/5 Equities/Alternatives/Cash)
**Everything above PLUS:**
- **Day Trading:** Breakouts, momentum plays
  - 1% max risk per trade
  - 3% max daily loss
  - Flat by 3:45 PM (no overnight)
- **Options:** Covered calls (10-15% OTM, 30-45 DTE), bull call spreads
- **Sector Rotation:** Weekly top 2 / bottom 2 rotation
- **Rebalancing:** Weekly or event-driven

---

## 🏦 BROKER INTEGRATIONS

### Production Ready
| Broker | Type | Features | Status |
|--------|------|----------|--------|
| **Tradier** | Official API | Full options, OAuth | ✅ Integrated |
| **Alpaca** | Official API | Commission-free, paper trading | ✅ Ready |
| **Interactive Brokers** | Official API | Pro-level, complex | 🔄 Planned |

### Unofficial (With Disclaimers)
| Broker | Type | Risk | Status |
|--------|------|------|--------|
| **Webull** | Unofficial → Official Q1 2026 | Medium | 🔄 Planned |
| **Robinhood** | Unofficial (robin_stocks) | Medium-High | 🔄 Planned |

### Not Supported
- TD Ameritrade/Schwab - API deprecated
- Any crypto-only exchanges

---

## 📡 DATA SOURCES

| Data Type | Source | Cost |
|-----------|--------|------|
| Real-time quotes | Tradier API | Included |
| Options chains | Tradier (ORATS) | Included |
| Fundamentals | Alpha Vantage | Free tier |
| News/Sentiment | Finnhub | $0/mo (free tier) |
| Technical indicators | Calculate locally | $0 |
| Sector ETFs | Tradier | Included |

**Total Data Cost:** ~$0-$200/mo depending on scale

---

## 🔧 TECHNICAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    CORTEX CAPITAL                        │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                                      │
│  ├── Dashboard (portfolio view, P&L)                    │
│  ├── Onboarding (broker OAuth, profile selection)       │
│  └── Settings (risk profile, notifications)             │
├─────────────────────────────────────────────────────────┤
│  Backend (Node.js/TypeScript)                           │
│  ├── API Server (Express)                               │
│  ├── Agent Daemon (LLM-powered agents)                  │
│  ├── Execution Engine (Tradier/Alpaca)                  │
│  └── Scheduler (rebalancing, reports)                   │
├─────────────────────────────────────────────────────────┤
│  Database (Supabase/Postgres)                           │
│  ├── Users, Profiles, Credentials (encrypted)          │
│  ├── Portfolios, Positions, Trades                     │
│  ├── Agent Decisions, Audit Logs                       │
│  └── Subscriptions, Payments                            │
├─────────────────────────────────────────────────────────┤
│  External Services                                       │
│  ├── Stripe (payments)                                  │
│  ├── Resend (email)                                     │
│  ├── DeepSeek/OpenAI (LLM)                             │
│  └── Tradier/Alpaca (brokerage)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 💳 PAYMENTS (Stripe)

**Keys Configured:** ✅
- Live secret key
- Publishable key  
- Webhook secret

**Price IDs to Create:**
- Conservative: $49/mo
- Moderate: $99/mo
- Ultra Aggressive: $249/mo

**Flow:**
1. User selects tier on pricing page
2. Stripe Checkout handles payment
3. Webhook creates user in Supabase
4. User connects broker (OAuth)
5. Agents start analyzing

---

## ⚖️ LEGAL STRUCTURE

**Recommended:** Software/Signals Service (NOT RIA)

**Why:**
- We provide signals/software, not personalized advice
- Users make their own decisions
- No discretionary authority over accounts
- Can add RIA later when scale justifies

**Required Disclaimers:**
- "Not investment advice"
- "Past performance ≠ future results"
- "Trading involves risk of loss"
- Risk acknowledgment before signup

**Estimated Legal Review:** $1K-$3K with securities attorney

---

## 🏆 COMPETITIVE ADVANTAGES

### vs Robo-Advisors (Betterment, Wealthfront)
- **They:** 0.25% AUM fee, basic allocation
- **We:** Flat monthly fee, AI-powered, options strategies

### vs AI Platforms (Composer, QuantConnect)
- **They:** Complex, requires coding knowledge
- **We:** Turnkey, agents do the work

### vs Copy Trading (eToro, Collective2)
- **They:** Follow human traders
- **We:** Follow AI agents with transparent logic

### Market Gaps We Fill
1. **AI sophistication** - Real LLM reasoning, not rule-based
2. **Skill level bridge** - Not too simple, not too complex
3. **Options for everyone** - LEAPS made accessible
4. **Transparent flat pricing** - No hidden AUM fees

---

## 🐛 KNOWN ISSUES (From Audit)

**71 TypeScript errors to fix:**
1. Missing Tradier API functions (getQuote, getOptionsChain, etc.)
2. Type safety violations (44 implicit `any` types)
3. Missing utility functions (query, executeSingleTrade)

**Estimated fix time:** 6-10 hours

---

## 🚀 LAUNCH CHECKLIST

### Phase 1: Code Fixes (6-10 hours)
- [ ] Fix 71 TypeScript compilation errors
- [ ] Implement missing Tradier API functions
- [ ] Add proper type annotations
- [ ] Run full test suite

### Phase 2: Infrastructure (4 hours)
- [ ] Run Supabase migrations
- [ ] Configure Stripe products/prices
- [ ] Set up Resend for emails
- [ ] Deploy to Vercel (frontend) + Railway (backend)

### Phase 3: Testing (1 week)
- [ ] Paper trading with test accounts
- [ ] All 3 tiers running simultaneously
- [ ] Agent decision logging
- [ ] Performance tracking

### Phase 4: Soft Launch (2 weeks)
- [ ] 5-10 beta users (friends/family)
- [ ] Collect feedback
- [ ] Fix issues
- [ ] Build track record

### Phase 5: Public Launch
- [ ] Landing page live
- [ ] Pricing page with Stripe
- [ ] Onboarding flow complete
- [ ] Support email configured

---

## 🎮 FISH TANK / DEMO MODE

**cortex-hq-game** - Phaser.js isometric office view

**Vision:** Live visualization of agents trading
- See agents "walking around" the office
- Real-time P&L displayed
- Public demo account everyone can watch
- "Fish tank" marketing - watch the AI work

**Location:** `/Volumes/atlaa/clawd-archive/cortex-hq-game/`
**Already fetches live data from:** `https://dashboard-ten-kohl.vercel.app/api/stats`

---

## 📁 FILE STRUCTURE

```
/Users/atlasbuilds/clawd/cortex-capital/
├── .env                          # API keys (configured)
├── agents/
│   ├── SOULS/                    # Agent personalities
│   │   ├── ANALYST.soul.md
│   │   ├── STRATEGIST.soul.md
│   │   ├── EXECUTOR.soul.md
│   │   ├── REPORTER.soul.md
│   │   ├── OPTIONS_STRATEGIST.soul.md
│   │   ├── DAY_TRADER.soul.md
│   │   └── MOMENTUM.soul.md
│   ├── llm-agent-wrapper.ts      # LLM integration
│   ├── analyst.ts
│   ├── strategist.ts
│   ├── executor.ts
│   └── reporter.ts
├── dashboard/                    # Next.js frontend
├── migrations/                   # Database schema
├── AUDIT-REPORT.md              # Code issues
├── BROKER-LIBRARIES.md          # GitHub libraries
├── COMPETITOR-ANALYSIS.md       # Market research
├── DATA-AND-BROKERS.md          # Data sources
├── LEGAL-STRUCTURE.md           # Compliance
├── STRATEGY-PLAYBOOK.md         # Trading rules
└── CORTEX-CAPITAL-MASTER.md     # This file
```

---

## 📞 API KEYS CONFIGURED

| Service | Status | Location |
|---------|--------|----------|
| Supabase | ✅ | .env |
| Tradier | ✅ | .env |
| Stripe | ✅ | .env |
| DeepSeek | ❌ | Need to add |
| Resend | ❌ | Need to add |

---

## 🎯 NEXT STEPS

**IMMEDIATE (Tonight/Tomorrow):**
1. Fix 71 TypeScript errors OR spawn coding agent
2. Add DeepSeek API key
3. Test one agent end-to-end

**THIS WEEK:**
1. Run migrations in Supabase
2. Deploy to Vercel/Railway
3. Paper test all 3 tiers
4. Create Stripe products

**NEXT WEEK:**
1. Beta users
2. Track record building
3. Landing page polish
4. Legal review ($1-3K)

---

## 💡 THE VISION

**Year 1:** 100 subscribers = $15K MRR
**Year 2:** 1,000 subscribers = $100K+ MRR  
**Year 3:** RIA registration, institutional clients

**The Dream:** The AI hedge fund that anyone can access for $49/mo.

---

*This is THE project. Build it. Ship it. ⚡*

---

**Research Documents Created:**
- `AUDIT-REPORT.md` - Code quality assessment
- `BROKER-LIBRARIES.md` - GitHub libraries for each broker
- `COMPETITOR-ANALYSIS.md` - 14 competitors analyzed
- `DATA-AND-BROKERS.md` - Data sources and broker capabilities
- `LEGAL-STRUCTURE.md` - Compliance and legal approach
- `STRATEGY-PLAYBOOK.md` - Detailed trading rules per tier
- `agents/SOULS/*.soul.md` - 7 agent personalities
- `agents/llm-agent-wrapper.ts` - LLM integration code
