# CORTEX CAPITAL - PERSONALIZED ONBOARDING SYSTEM

**Make us BETTER than Betterment/Wealthfront/M1**

## THE VISION

Users don't just pick a risk level — they tell us their **interests**, **goals**, and **specific stocks they love**, and we BUILD them a custom AI-managed portfolio.

---

## THE DIFFERENTIATOR

### Betterment
> "Pick risk level, we do rest" — **BORING**

### M1 Finance
> "You pick everything" — **TOO HARD**

### Composer
> "AI helps you build" — **CLOSE**

### CORTEX CAPITAL
> "Tell us what you love, we build your dream portfolio with AI" — **NAILED IT** ⚡

---

## WHAT MAKES US DIFFERENT

1. **VALIDATE their picks** (not just accept anything)
   - Quality score 0-100
   - Fundamentals check
   - Liquidity check
   - Options availability

2. **WARN about concentration risk**
   - Single stock > 15% = warning
   - Custom picks > 40% = diversification recommended

3. **SUGGEST alternatives**
   - "You like RIVN? Consider TSLA, F, GM too"
   - Similarity engine based on sector/theme/correlation

4. **ADD options overlay for extra returns**
   - LEAPS on custom picks (Tier 2-3)
   - Covered calls for income (Tier 3)
   - Spreads for defined-risk plays (Tier 3)

5. **SHOW expected returns before they commit**
   - Preview portfolio across all 3 tiers
   - Compare side-by-side
   - Transparent metrics (return, volatility, Sharpe, max drawdown)

---

## ARCHITECTURE

### Files Created

```
lib/
├── preferences.ts           # Type definitions for user preferences
├── stock-analyzer.ts        # Validate custom stock picks (quality scoring)
└── portfolio-builder.ts     # AI portfolio construction by tier

services/
└── onboarding-flow.ts       # Step-by-step onboarding service

agents/
└── strategist-preferences-adapter.ts  # Bridges preferences with STRATEGIST

migrations/
└── 005_preferences.sql      # Database schema for preferences
```

---

## DATABASE SCHEMA

### Enhanced `user_preferences` Table

```sql
ALTER TABLE user_preferences
ADD COLUMN goal VARCHAR(50);                    -- retirement, wealth_building, etc.
ADD COLUMN time_horizon VARCHAR(20);            -- 1-3 years, 10+ years, etc.
ADD COLUMN sectors JSONB;                       -- ['tech', 'healthcare']
ADD COLUMN themes JSONB;                        -- ['AI', 'EVs', 'dividends']
ADD COLUMN must_have_stocks JSONB;              -- ['RIVN', 'SOFI', 'HIMS']
ADD COLUMN excluded_stocks JSONB;               -- []
ADD COLUMN excluded_sectors JSONB;              -- ['fossil_fuels', 'tobacco']
ADD COLUMN dividend_preference VARCHAR(20);     -- none, some, focus
ADD COLUMN covered_calls_interest BOOLEAN;      -- Generate income?
ADD COLUMN options_comfort VARCHAR(20);         -- none, leaps_only, full_options
ADD COLUMN max_options_allocation DECIMAL(5,2); -- 0-40%
ADD COLUMN day_trading_interest BOOLEAN;        -- Tier 3 only
ADD COLUMN max_daily_risk DECIMAL(5,2);         -- 1-5%
```

### New Tables

#### `user_custom_stocks`
Tracks user's custom picks with quality analysis:
```sql
CREATE TABLE user_custom_stocks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(10),
  quality_score INTEGER,        -- 0-100
  investable BOOLEAN,
  status VARCHAR(20),            -- pending, approved, rejected, in_portfolio
  analysis_data JSONB,
  user_notes TEXT,
  system_notes TEXT
);
```

#### `user_exclusions`
ESG and values-based exclusions:
```sql
CREATE TABLE user_exclusions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  exclusion_type VARCHAR(50),    -- sector, stock, esg_category
  exclusion_value VARCHAR(100),  -- fossil_fuels, tobacco, etc.
  reason TEXT
);
```

#### `onboarding_progress`
Track step-by-step completion:
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  current_step INTEGER,
  completed_steps JSONB,
  step_data JSONB,              -- Collects data from each step
  preview_data JSONB,           -- Generated portfolio previews
  recommended_tier VARCHAR(20)
);
```

#### `stock_analysis_cache`
Cache stock quality analysis:
```sql
CREATE TABLE stock_analysis_cache (
  symbol VARCHAR(10) PRIMARY KEY,
  quality_score INTEGER,
  investable BOOLEAN,
  market_cap BIGINT,
  pe_ratio DECIMAL(10,2),
  avg_volume BIGINT,
  has_options BOOLEAN,
  has_leaps BOOLEAN,
  warnings JSONB,
  alternatives JSONB,
  cached_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

#### `portfolio_templates`
Pre-built portfolios for quick start:
```sql
CREATE TABLE portfolio_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  tier VARCHAR(20),
  risk_profile VARCHAR(20),
  allocations JSONB,
  expected_return DECIMAL(5,2),
  expected_volatility DECIMAL(5,2)
);
```

---

## ONBOARDING FLOW (13 STEPS)

### Step 1: Basic Info
- Name, email
- Simple welcome screen

### Step 2: Risk Assessment (5 Questions)
1. Volatility comfort (drop 20% reaction)
2. Investment experience
3. Time commitment (monitoring frequency)
4. Loss tolerance (-5% to -50%+)
5. Return expectations (5-7% to 25%+)

**Output:** Risk profile (conservative, moderate, aggressive)

### Step 3: Goals & Timeline
- Goal selection: retirement, wealth_building, short_term, income, speculation
- Time horizon: 1-3 years, 3-5 years, 5-10 years, 10+ years

### Step 4: Sector Interests (Multi-Select)
Available sectors:
- Technology
- Healthcare
- Financials
- Consumer Discretionary
- Clean Energy
- Semiconductors
- Cloud Computing
- Cybersecurity
- EV/Batteries
- Space Tech
- And more...

### Step 5: Theme Preferences (Multi-Select)
Investment themes:
- AI & ML
- Electric Vehicles
- Renewable Energy
- Cloud Computing
- Genomics
- FinTech
- Dividend Aristocrats
- Value Investing
- Growth Investing
- Small Cap Growth
- Emerging Markets

### Step 6: Custom Stock Picks (OPTIONAL)
- User enters tickers (RIVN, SOFI, HIMS, etc.)
- **System analyzes each pick:**
  - Quality score 0-100
  - Fundamentals check
  - Liquidity check
  - Options availability
  - Risk warnings
- **Approve/Reject with explanations**
- **Suggest alternatives** if score is low

### Step 7: Exclusions (ESG)
What to avoid:
- Fossil fuels
- Tobacco
- Alcohol
- Gambling
- Weapons
- Private prisons
- Animal testing
- Factory farming

### Step 8: Income Preferences
- Dividend preference: none, some, focus
- Covered calls interest: yes/no (generate extra income)

### Step 9: Options Comfort Level
- **None:** No options (Tier 1 only)
- **LEAPS only:** Long-term calls on custom picks (Tier 2+)
- **Full options:** LEAPS, spreads, covered calls (Tier 3)
- Max options allocation: 0-40%

### Step 10: Generate Preview Portfolio
- **Show all 3 tiers side-by-side**
- Compare features, allocations, expected returns
- Highlight recommended tier based on preferences

### Step 11: Select Tier
- **Scout ($49/mo):** ETFs only, quarterly rebalancing
- **Operator ($99/mo):** ETFs + stocks + LEAPS, monthly rebalancing
- **Partner ($249/mo):** Everything + day trading, weekly rebalancing

### Step 12: Payment (Stripe)
- Stripe Checkout integration
- Create subscription
- Handle payment

### Step 13: Connect Broker (Tradier OAuth)
- Tradier OAuth flow
- Fetch account info
- Store encrypted credentials
- **READY TO TRADE** ⚡

---

## TIER COMPARISON

| Feature | Scout ($49) | Operator ($99) | Partner ($249) |
|---------|------------|----------------|----------------|
| **Instruments** | ETFs only | ETFs + Stocks + LEAPS | ETFs + Stocks + LEAPS + Spreads |
| **Custom Picks** | ❌ | ✅ (validated) | ✅ (validated) |
| **Options** | ❌ | LEAPS only | Full options |
| **Covered Calls** | ❌ | ❌ | ✅ |
| **Day Trading** | ❌ | ❌ | ✅ |
| **Rebalancing** | Quarterly | Monthly | Weekly |
| **AI Analysis** | Basic | Advanced | Ultra |
| **Priority Support** | ❌ | ✅ | ✅ |

---

## STOCK QUALITY SCORING (0-100)

### Scoring Factors

1. **Market Cap (0-20 points)**
   - Mega cap ($200B+): 20 points
   - Large cap ($10B+): 18 points
   - Mid cap ($2B+): 15 points
   - Small cap ($300M+): 10 points
   - Micro cap ($50M+): 5 points
   - Nano cap: 0 points

2. **Liquidity (0-20 points)**
   - Volume: 5M+ shares = 12 points
   - Spread: <0.01 = 8 points

3. **Fundamentals (0-30 points)**
   - P/E ratio (0-8 points)
   - Revenue growth (0-10 points)
   - Debt-to-equity (0-6 points)
   - Profitability (0-6 points)

4. **Options Availability (0-15 points)**
   - Options exist: 5 points
   - Weeklies: +3 points
   - LEAPS: +5 points
   - Open interest 10k+: +2 points

5. **Risk Deductions (0-15 points)**
   - Each warning = -3 points (max -15)

### Quality Tiers

- **S (85-100):** Excellent — top-tier stocks
- **A (70-84):** Good — solid picks
- **B (55-69):** Fair — acceptable with caution
- **C (40-54):** Risky — warnings issued
- **D (0-39):** Very Risky — NOT RECOMMENDED

**Threshold:** Score ≥ 40 to be "investable"

---

## PORTFOLIO BUILDER LOGIC

### Tier 1: Scout ($49)
```typescript
// 60-40-50% broad market base (risk-dependent)
SPY: 50%

// Sector ETFs matching user interests
XLK (Tech): 20%
XLV (Healthcare): 20%

// Dividend focus if requested
SCHD (Dividends): 10%
```

### Tier 2: Operator ($99)
```typescript
// 35% broad market core
SPY: 35%

// 25% sector ETFs
XLK + XLV: 25%

// 25% custom picks (validated)
RIVN: 8%  (Quality score: 65/100)
SOFI: 8%  (Quality score: 72/100)
HIMS: 9%  (Quality score: 68/100)

// 15% LEAPS on custom picks
RIVN LEAP (365+ DTE, 0.70-0.80 delta): 10%
SOFI LEAP: 5%
```

### Tier 3: Partner ($249)
```typescript
// 20% conservative core
SPY: 20%

// 30% custom picks
RIVN: 10%
SOFI: 10%
HIMS: 10%

// 15% LEAPS
RIVN LEAP: 10%
SOFI LEAP: 5%

// 10% spreads
SPX Bull Call Spread: 10%

// 15% covered call overlay
On SPY + custom picks: 15%

// 10% day trading reserve
Cash for intraday momentum: 10%
```

---

## CONCENTRATION RISK WARNINGS

### Rules
1. **Single stock > 15%** → Warning
2. **Custom picks total > 40%** → Diversification recommended
3. **Sector > 40%** → Overexposure warning

### Example
```
⚠️ CONCENTRATION RISK DETECTED

RIVN is 18.5% of portfolio — consider reducing to <15%
Custom picks (RIVN + SOFI + HIMS) = 42% — diversification recommended
```

---

## ALTERNATIVE SUGGESTIONS

When user adds a stock, we suggest similar alternatives:

```typescript
const alternativesMap = {
  'RIVN': ['TSLA', 'F', 'GM', 'LCID'],
  'SOFI': ['AFRM', 'UPST', 'LC', 'NU'],
  'HIMS': ['TDOC', 'AMWL', 'OSCR'],
  'PLTR': ['SNOW', 'AI', 'NET'],
  'RKLB': ['ASTS', 'SPCE', 'BA'],
};
```

**Display:**
> You like RIVN? Consider also: TSLA (Score: 92), F (Score: 78), GM (Score: 81)

---

## INTEGRATION WITH STRATEGIST

### Old Way
```typescript
// STRATEGIST used hardcoded risk profiles
const preferences = {
  risk_profile: 'moderate',
  investment_horizon: 'long',
  constraints: { never_sell: [], max_position_size: 25 }
};
```

### New Way (Preferences-Aware)
```typescript
import { generateEnhancedRebalancingPlan } from './strategist-preferences-adapter';

const plan = await generateEnhancedRebalancingPlan(
  userId,
  currentPositions,
  totalPortfolioValue
);

// Now includes:
// - Custom picks injected
// - ESG exclusions applied
// - Tier limitations enforced
// - Quality-validated stocks only
```

---

## API INTEGRATIONS NEEDED

### Stock Analysis
- **Tradier API:** Real-time quotes, options chains
- **Financial Data Provider:** Alpha Vantage, Polygon, or similar
  - Fundamentals (P/E, revenue growth, debt)
  - Market cap
  - Volume data

### Payments
- **Stripe:** Subscription management
  - Create customer
  - Create subscription ($49/$99/$249)
  - Handle webhooks

### Broker Connection
- **Tradier OAuth:** Secure broker connection
  - OAuth flow
  - Fetch account info
  - Store encrypted access tokens

---

## FRONTEND COMPONENTS NEEDED

1. **Risk Assessment Quiz**
   - 5-question wizard
   - Progress bar
   - Visual scoring

2. **Sector/Theme Multi-Select**
   - Grid layout with icons
   - Search/filter
   - "Select all in category"

3. **Custom Stock Picker**
   - Autocomplete ticker search
   - Real-time validation
   - Quality score badge (S/A/B/C/D)
   - Warning alerts
   - Alternative suggestions

4. **Portfolio Preview**
   - Side-by-side tier comparison
   - Interactive allocation pie chart
   - Metrics dashboard (return, volatility, Sharpe, drawdown)
   - "What if" simulator

5. **Tier Selection**
   - Feature comparison table
   - Pricing cards
   - Recommended tier highlight

---

## TESTING CHECKLIST

- [ ] Risk assessment correctly calculates profile
- [ ] Stock analyzer validates RIVN/SOFI/HIMS
- [ ] Quality scores match expectations (40+ threshold)
- [ ] Portfolio builder generates correct allocations per tier
- [ ] Concentration risk warnings trigger at >15%
- [ ] Alternative suggestions display correctly
- [ ] ESG exclusions filter properly
- [ ] Onboarding progress saves to database
- [ ] Tier limitations enforced (no options in Scout)
- [ ] STRATEGIST adapter injects custom picks
- [ ] Preview portfolios generate without errors

---

## NEXT STEPS

1. **Frontend Implementation**
   - Build React components for onboarding flow
   - Integrate with Stripe
   - Tradier OAuth flow

2. **API Integration**
   - Connect Tradier for stock/options data
   - Integrate financial data provider
   - Set up webhook handlers

3. **Testing**
   - Unit tests for quality scoring
   - Integration tests for full onboarding flow
   - Load testing for concurrent users

4. **Deployment**
   - Run migration 005_preferences.sql
   - Deploy updated STRATEGIST adapter
   - Monitor first 100 onboardings

5. **Marketing**
   - Landing page highlighting differentiators
   - Demo video showing custom pick validation
   - Comparison table vs Betterment/Wealthfront/M1

---

## SUCCESS METRICS

- **Conversion Rate:** Onboarding start → payment
- **Custom Pick Adoption:** % of users adding custom stocks
- **Tier Distribution:** Scout vs Operator vs Partner
- **Quality Score Distribution:** Average score of approved picks
- **Retention:** 3-month, 6-month, 12-month retention by tier
- **Portfolio Performance:** Actual vs expected returns

---

**Built with ⚡ by Atlas**  
*Making Cortex Capital BETTER than the competition*
