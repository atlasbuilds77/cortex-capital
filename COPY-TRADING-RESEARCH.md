# Copy-Trading Legal & Technical Research
## Cortex Capital - Research Document
**Last Updated:** 2026-03-21

---

## PART 1: LEGAL STRUCTURE

### 1. Do We Need to Be a Registered Investment Advisor (RIA)?

**SHORT ANSWER:** It depends on HOW you structure the service.

**The Critical Distinction:**

| Structure | RIA Required? | Regulatory Body |
|-----------|---------------|-----------------|
| Discretionary management (you control trades) | YES | SEC |
| Non-discretionary signals (user decides) | MAYBE | Depends on implementation |
| Software/technology service only | NO* | None (with proper structure) |
| Futures/commodities copy trading | YES | CFTC/NFA |

**Key Legal Principle (2026 Fintech Regulation Guide):**
> "If your product involves giving investment advice, even through automation, you may fall under the Investment Advisers Act. RIAs must register with the SEC or applicable state regulators."

**Thresholds:**
- **SEC registration:** Required if AUM > $100M or advising registered investment companies
- **State registration:** Required if AUM < $100M (register in your state)
- **Exemptions exist** for publishers, software providers, and certain automated tools

### 2. "Signals" vs "Managing Money" - The Critical Distinction

**SIGNALS (Lower Regulatory Burden):**
- User receives notification of trade opportunity
- User CHOOSES whether to execute
- User maintains full control
- You are an "information provider" or "publisher"
- Similar to newsletter/subscription service

**MANAGING MONEY (Full RIA Requirements):**
- Trades execute automatically on user's behalf
- User grants discretionary authority
- You have control over client assets
- Requires RIA registration, fiduciary duty, compliance program

**THE GRAY AREA - Copy Trading:**
Copy trading sits in a gray area because:
- Trades CAN be automatic (looks like discretionary)
- But user CHOOSES to follow and can stop anytime
- User sets their own risk parameters
- User's assets stay in THEIR broker account

**How Platforms Navigate This:**
1. **Collective2 Model:** Registered with NFA/CFTC for futures, operates as technology platform for equities
2. **eToro Model:** Fully licensed broker-dealer in multiple jurisdictions
3. **Kinfo Model:** Pure transparency/analytics platform, doesn't execute trades

### 3. How Do eToro, Collective2, TradingView Work Legally?

#### **Collective2**
- **Registration:** NFA Member #0401602, CFTC regulated
- **Structure:** Technology platform that connects "strategy managers" with subscribers
- **Legal Model:** NOT a broker-dealer; works with regulated partner brokers
- **How it works:** Strategy managers publish signals → Subscribers' brokers auto-execute
- **Key insight:** The BROKER handles the actual trading, C2 is the "pipes"

#### **eToro**
- **Registration:** Multi-jurisdiction licensed broker-dealer
  - US: SEC/FINRA regulated entities
  - EU: CySEC (MiCA license as of Jan 2025)
  - UK: FCA regulated
  - Australia: ASIC regulated
- **Structure:** Integrated broker + social trading platform
- **Legal Model:** They ARE the broker, so they handle all compliance
- **Key insight:** Dual-structure approach for different regulatory environments

#### **TradingView**
- **Registration:** NOT a broker, NOT an RIA
- **Structure:** Charting/analysis platform with broker integrations
- **Legal Model:** Pure software/technology provider
- **Copy Trading:** Done through THIRD-PARTY trade copiers (Copygram, etc.)
- **Key insight:** They don't execute trades, just provide tools and alerts

#### **Kinfo**
- **Registration:** Not disclosed as RIA or broker
- **Structure:** Social trading app for performance tracking
- **Legal Model:** Transparency/analytics platform
- **How it works:** Tracks and verifies trading performance, shows portfolios
- **Key insight:** Focused on verification/transparency, not trade execution

### 4. What Disclaimers Do We Need?

**ESSENTIAL DISCLAIMERS (All Copy Trading Platforms Use These):**

```
RISK DISCLOSURE
- Past performance is not indicative of future results
- Trading involves substantial risk of loss
- You may lose more than your initial investment
- Only trade with money you can afford to lose

NOT INVESTMENT ADVICE
- This service does not provide personalized investment advice
- We are not a registered investment advisor
- All trading decisions are made by you
- You should consult a licensed financial advisor

NO GUARANTEES
- We do not guarantee any specific results
- Strategy performance may vary significantly
- Market conditions can change without notice
- Technical issues may affect trade execution

USER RESPONSIBILITY
- You are solely responsible for your trading decisions
- You control your own brokerage account
- You can stop copying at any time
- You set your own risk parameters
```

**ADDITIONAL DISCLAIMERS FOR SPECIFIC STRUCTURES:**

For **Signals-Only:**
```
EDUCATIONAL/INFORMATIONAL PURPOSES
- Signals are provided for informational purposes only
- This is not a solicitation to buy or sell securities
- You make all final trading decisions
```

For **Auto-Copy:**
```
AUTOMATED TRADING DISCLOSURE
- Trades will be automatically executed in your account
- You authorize your broker to execute trades based on signals
- Latency and slippage may affect execution prices
- You can disable auto-trading at any time
```

### 5. Can We Operate as "Software Service" Not "Investment Advice"?

**YES - IF you structure it correctly:**

**Software Service Model (LOWEST REGULATORY BURDEN):**

✅ **DO:**
- Provide technology/infrastructure for trade replication
- Let users connect their OWN brokers
- Let users choose WHO to follow
- Let users set THEIR OWN risk parameters
- Provide performance data and analytics
- Charge for software/platform access (not % of profits)

❌ **DON'T:**
- Recommend specific strategies or traders
- Provide personalized advice based on user's situation
- Take custody of user funds
- Execute trades directly (let broker do this)
- Charge performance fees (looks like investment management)

**The "Collective2 Model" - Technology Platform Approach:**
1. Strategy managers create and publish trading systems
2. Platform provides infrastructure for signal distribution
3. Users connect their own broker accounts
4. User's broker executes trades via API
5. Platform charges subscription fees (not asset-based)

**Key Legal Positioning:**
- "We are a technology platform that facilitates trade automation"
- "We do not provide investment advice"
- "Users make their own decisions about which strategies to follow"
- "All trades are executed by the user's chosen broker"

---

## PART 2: TECHNICAL ARCHITECTURE

### 1. User Connects Broker via OAuth

**How OAuth 2.0 Works for Broker Integration:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User's    │     │   Cortex    │     │   Broker    │
│   Browser   │     │   Capital   │     │   (Tradier) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Click "Connect Broker"            │
       │──────────────────>│                   │
       │                   │                   │
       │  2. Redirect to broker OAuth page     │
       │<──────────────────│                   │
       │                   │                   │
       │  3. User logs in & authorizes         │
       │───────────────────────────────────────>
       │                   │                   │
       │  4. Broker redirects with auth code   │
       │<───────────────────────────────────────
       │                   │                   │
       │  5. Exchange code for access token    │
       │                   │──────────────────>│
       │                   │                   │
       │  6. Return access + refresh tokens    │
       │                   │<──────────────────│
       │                   │                   │
       │  7. Store tokens (encrypted)          │
       │                   │                   │
```

**Tradier OAuth 2.0 Implementation:**
```javascript
// OAuth endpoints
const TRADIER_AUTH_URL = 'https://api.tradier.com/v1/oauth/authorize';
const TRADIER_TOKEN_URL = 'https://api.tradier.com/v1/oauth/accesstoken';

// Scopes needed for copy trading
const SCOPES = [
  'read',      // Read account info
  'write',     // Place orders
  'trade',     // Execute trades
  'market'     // Market data access
];

// Token storage (encrypt these!)
{
  access_token: "xxx",
  refresh_token: "yyy",
  expires_at: 1711008000,
  account_id: "ABC123"
}
```

### 2. Detecting Master Account Trades

**Three Approaches:**

**A. Webhook/Streaming (BEST - Real-time)**
```javascript
// Tradier WebSocket streaming
const ws = new WebSocket('wss://ws.tradier.com/v1/markets/events');

// Subscribe to account events
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: ['ACCOUNT_EVENTS'],
  sessionid: masterAccountSession
}));

// On trade execution
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'order_fill') {
    triggerCopyTrade(data);
  }
};
```

**B. Polling (BACKUP - Higher latency)**
```javascript
// Poll every 1-5 seconds
setInterval(async () => {
  const orders = await tradier.getOrders(masterAccountId, {
    status: 'filled',
    since: lastCheckTimestamp
  });
  
  for (const order of orders.filter(isNew)) {
    await triggerCopyTrade(order);
  }
}, 1000);
```

**C. Order Entry Hook (INTEGRATED)**
```javascript
// If we control the trading interface
async function placeMasterTrade(order) {
  // Execute on master account
  const result = await tradier.placeOrder(masterAccountId, order);
  
  // Immediately trigger copy
  if (result.status === 'filled') {
    await triggerCopyTrades(order, result);
  }
  
  return result;
}
```

### 3. Replicating to Follower Accounts

**Copy Trade Flow:**
```
Master Trade Detected
        │
        ▼
┌───────────────────┐
│ Get All Followers │
│ (active + funded) │
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────────────┐
│ For Each Follower (PARALLEL):     │
│                                   │
│  1. Calculate position size       │
│  2. Check account balance         │
│  3. Apply risk limits             │
│  4. Place order via broker API    │
│  5. Log result                    │
└───────────────────────────────────┘
```

**Implementation:**
```javascript
async function copyTradeToFollowers(masterTrade) {
  const followers = await getActiveFollowers(masterTrade.strategyId);
  
  const results = await Promise.allSettled(
    followers.map(follower => executeCopyTrade(follower, masterTrade))
  );
  
  // Log successes and failures
  logCopyResults(masterTrade.id, results);
}

async function executeCopyTrade(follower, masterTrade) {
  // Calculate scaled position
  const scaledQty = calculateScaledQuantity(
    masterTrade.quantity,
    follower.allocationPercentage,
    follower.accountEquity,
    masterTrade.price
  );
  
  // Apply follower's risk limits
  if (scaledQty > follower.maxPositionSize) {
    scaledQty = follower.maxPositionSize;
  }
  
  // Place order
  return await tradier.placeOrder(follower.accountId, {
    symbol: masterTrade.symbol,
    side: masterTrade.side,
    quantity: scaledQty,
    type: masterTrade.orderType,
    duration: 'day'
  });
}
```

### 4. Handling Different Account Sizes (Percentage-Based)

**Scaling Methods:**

**A. Fixed Percentage of Equity**
```javascript
// Follower allocates X% of their account to this strategy
function calculateScaledQuantity(masterQty, masterEquity, followerEquity, allocationPct) {
  const masterPositionPct = (masterQty * price) / masterEquity;
  const followerPosition = followerEquity * allocationPct * masterPositionPct;
  return Math.floor(followerPosition / price);
}

// Example:
// Master: 100 shares @ $50 = $5,000 (10% of $50k account)
// Follower: $10k account, 50% allocation
// Follower position: $10k * 50% * 10% = $500 → 10 shares
```

**B. Fixed Dollar Amount per Trade**
```javascript
// Follower risks $X per trade
function calculateFixedRiskQuantity(followerRiskAmount, stopLossPct, price) {
  const riskPerShare = price * stopLossPct;
  return Math.floor(followerRiskAmount / riskPerShare);
}
```

**C. Lot Multiplier**
```javascript
// Simple multiplier (e.g., 0.5x, 1x, 2x master position)
function calculateMultipliedQuantity(masterQty, multiplier) {
  return Math.floor(masterQty * multiplier);
}
```

**Handling Minimum Quantities:**
```javascript
// Some securities have minimum lot sizes
function applyMinimumQuantity(qty, minLotSize = 1) {
  if (qty < minLotSize) {
    return 0; // Skip trade if too small
  }
  return Math.floor(qty / minLotSize) * minLotSize;
}
```

### 5. Handling Partial Fills

**Challenge:** Master gets partial fill, what do followers get?

**Approach A: Wait for Complete Fill**
```javascript
// Only copy when master order is fully filled
if (masterOrder.filled_qty === masterOrder.quantity) {
  await copyToFollowers(masterOrder);
}
```

**Approach B: Copy Partial Fills Immediately**
```javascript
// Copy each partial fill as it happens
masterOrder.on('partial_fill', async (fillEvent) => {
  const incrementalQty = fillEvent.filled_qty - lastFilledQty;
  await copyIncrementalFill(incrementalQty);
});
```

**Approach C: Hybrid (Recommended)**
```javascript
// Set a fill threshold (e.g., 80%)
const FILL_THRESHOLD = 0.8;

async function handleMasterFill(order) {
  const fillRatio = order.filled_qty / order.quantity;
  
  if (fillRatio >= FILL_THRESHOLD || order.status === 'filled') {
    // Copy based on actual filled quantity
    await copyToFollowers({
      ...order,
      quantity: order.filled_qty
    });
  }
}
```

**Handling Follower Partial Fills:**
```javascript
// If follower gets partial fill, track and potentially retry
async function handleFollowerOrder(order) {
  const result = await broker.placeOrder(order);
  
  if (result.status === 'partial_fill') {
    // Option 1: Accept partial
    logPartialFill(result);
    
    // Option 2: Place another order for remainder
    const remaining = order.quantity - result.filled_qty;
    if (remaining > 0) {
      await retryOrder({ ...order, quantity: remaining });
    }
  }
}
```

### 6. Latency Considerations

**Latency Sources:**
```
Master Trade Execution          0ms (baseline)
        │
        ├── Trade Detection     1-50ms (websocket) / 1000-5000ms (polling)
        │
        ├── Processing          5-20ms
        │
        ├── API Call to Broker  50-200ms per follower
        │
        └── Broker Execution    50-500ms (market dependent)
        
Total Latency: 100ms - 6000ms+
```

**Optimization Strategies:**

**A. Minimize Detection Latency**
```javascript
// Use WebSocket streaming, not polling
// Co-locate servers near broker infrastructure
// Use direct market data feeds if available
```

**B. Parallel Execution**
```javascript
// Execute all follower trades simultaneously
const results = await Promise.all(
  followers.map(f => executeTradeAsync(f, trade))
);
```

**C. Pre-calculation**
```javascript
// Pre-calculate follower positions during market hours
// Cache account balances and refresh periodically
// Pre-authorize tokens to avoid auth delays
```

**D. Order Type Selection**
```javascript
// For latency-sensitive copies, use market orders
// For price-sensitive copies, use limit orders with buffer

function selectOrderType(masterOrder, latencyMs) {
  if (latencyMs < 100 && masterOrder.type === 'market') {
    return 'market';
  }
  // Add buffer for limit orders to ensure fill
  return {
    type: 'limit',
    price: adjustPriceForLatency(masterOrder.price, latencyMs)
  };
}
```

---

## PART 3: EXISTING PLATFORMS TO STUDY

### 1. Collective2

**Overview:**
- Founded: 2001
- HQ: New York
- Registration: NFA Member #0401602, CFTC regulated

**How It Works:**
1. **Strategy Managers** create trading systems and publish signals
2. **Subscribers** pay to follow strategies
3. **AutoTrade** connects subscriber's broker to auto-execute signals
4. Supports: stocks, options, futures, forex

**Legal Structure:**
- NOT a broker-dealer
- Technology platform model
- Works with partner brokers (Interactive Brokers, TradeStation, etc.)
- Strategy managers are independent (not employees)

**Revenue Model:**
- Strategy subscription fees (set by manager, C2 takes cut)
- Platform fees for AutoTrade
- No performance fees from C2 (managers can charge)

**Key Learnings:**
- ✅ NFA registration for futures copy trading
- ✅ Partner broker model avoids broker-dealer requirements
- ✅ Transparent performance tracking
- ✅ User control over allocation and risk

### 2. eToro

**Overview:**
- Founded: 2007
- Public: NASDAQ: ETOR (since 2025)
- Users: 30M+

**How It Works:**
1. Users open account WITH eToro (they are the broker)
2. CopyTrader feature lets you allocate funds to copy another trader
3. Trades replicate proportionally
4. Can copy multiple traders simultaneously

**Legal Structure:**
- Fully licensed broker-dealer in multiple jurisdictions
- US: SEC/FINRA regulated
- EU: CySEC (MiCA license 2025)
- UK: FCA regulated
- Australia: ASIC regulated

**Revenue Model:**
- Spread on trades
- Currency conversion fees
- Withdrawal fees
- No commission on stocks

**Key Learnings:**
- ✅ Integrated broker model = full control but heavy regulation
- ✅ Social features drive engagement
- ✅ Multi-jurisdiction licensing required for global scale
- ⚠️ Regulatory burden is SIGNIFICANT

### 3. TradingView

**Overview:**
- Founded: 2011
- Users: 60M+
- Focus: Charting and analysis platform

**Copy Trading Approach:**
- TradingView does NOT offer native copy trading
- Third-party services provide copy trading FROM TradingView
- Popular copiers: Copygram, TradersPost, PickMyTrade

**How Third-Party Copiers Work:**
1. TradingView generates alerts (via Pine Script or manual)
2. Alert webhook sent to copier service
3. Copier places trades on connected broker accounts
4. Supports: MT4, MT5, Tradovate, NinjaTrader, etc.

**Legal Structure:**
- TradingView: Software/charting platform (no broker license)
- Copier services: Vary in structure and regulation

**Key Learnings:**
- ✅ Platform approach avoids regulatory burden
- ✅ Ecosystem of third-party tools extends functionality
- ✅ Alert/webhook system is flexible
- ⚠️ Reliability depends on third-party services

### 4. Kinfo

**Overview:**
- Focus: Performance tracking and verification
- Model: Social trading app

**How It Works:**
1. Connect brokerage accounts (read-only)
2. Track and verify your trading performance
3. View verified performance of top traders
4. Follow traders and see their portfolios

**Legal Structure:**
- NOT a broker or RIA (appears to be pure software)
- Read-only broker connections
- Does NOT execute trades

**Revenue Model:**
- Premium subscriptions
- Verification services

**Key Learnings:**
- ✅ Verification/transparency creates trust
- ✅ Read-only access = lower liability
- ✅ Community/social features
- ⚠️ Limited broker support

### 5. Tradier Copy Trading?

**Does Tradier Have Native Copy Trading?**
- NO native copy trading feature
- BUT: Excellent API makes it easy to BUILD copy trading

**Tradier API Capabilities:**
- OAuth 2.0 authentication
- Full order placement API
- Streaming quotes and account events
- Watchlist and account management

**Third-Party Copy Trading with Tradier:**
- Several third-party services integrate with Tradier
- Custom solutions easily built on their API
- Good documentation and developer support

**Key Learnings:**
- ✅ API-first broker = ideal for custom copy trading
- ✅ OAuth 2.0 = secure third-party access
- ✅ Reasonable pricing for API access
- ✅ Good fit for Cortex Capital architecture

---

## PART 4: RECOMMENDED APPROACH

### 1. Safest Legal Structure for Us

**RECOMMENDED: Technology Platform Model (Like Collective2)**

**Structure:**
```
┌────────────────────────────────────────────────────┐
│              CORTEX CAPITAL LLC                     │
│         (Technology Platform / Software)            │
├────────────────────────────────────────────────────┤
│  We Provide:                                       │
│  • Signal distribution infrastructure              │
│  • Performance tracking & analytics                │
│  • Broker connection tools (OAuth)                 │
│  • Risk management features                        │
│                                                    │
│  We Do NOT:                                        │
│  • Hold customer funds                             │
│  • Execute trades directly                         │
│  • Provide personalized investment advice          │
│  • Recommend specific strategies                   │
└────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ Strategy Manager │  │ Strategy Manager │
│   (Hunter/Team)  │  │    (Future)      │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
┌────────────────────────────────────────┐
│         TRADIER (or other broker)       │
│            (Regulated Broker)           │
│                                         │
│  They Handle:                           │
│  • Order execution                      │
│  • Custody of funds                     │
│  • Regulatory compliance                │
│  • Trade confirmations                  │
└────────────────────────────────────────┘
```

**Why This Structure:**
1. **Lowest regulatory burden** - Technology platform, not investment advisor
2. **Tradier handles compliance** - They're the regulated entity
3. **User control** - Users connect their own accounts, make their own decisions
4. **Scalable** - Can add more strategy managers, brokers, features

**Registration Considerations:**
- **If equities only:** May not need federal registration (consult attorney)
- **If futures/commodities:** May need NFA registration (like Collective2)
- **State registration:** Check state-level requirements

### 2. Best Technical Approach

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CORTEX CAPITAL PLATFORM                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐      ┌─────────────────┐              │
│  │  Master Account │      │  Signal Engine  │              │
│  │   Connection    │─────>│  (Detect Trades)│              │
│  └─────────────────┘      └────────┬────────┘              │
│                                    │                        │
│                                    ▼                        │
│                         ┌─────────────────┐                 │
│                         │  Copy Manager   │                 │
│                         │  (Scale + Route)│                 │
│                         └────────┬────────┘                 │
│                                  │                          │
│           ┌──────────────────────┼──────────────────────┐   │
│           ▼                      ▼                      ▼   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │ Follower Acct 1 │  │ Follower Acct 2 │  │ Follower Acct N │
│  │ (via Tradier)   │  │ (via Tradier)   │  │ (via Broker X)  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Node.js or Python (async for concurrent API calls)
- **Database:** PostgreSQL (accounts, trades, audit log)
- **Cache:** Redis (token storage, rate limiting)
- **Message Queue:** Redis or RabbitMQ (trade distribution)
- **Broker API:** Tradier (OAuth 2.0, REST API)

**Implementation Phases:**

**Phase 1: Core Copy Trading**
- [ ] Master account trade detection (WebSocket)
- [ ] Follower account management
- [ ] Basic percentage-based scaling
- [ ] Tradier API integration
- [ ] Trade execution logging

**Phase 2: Risk Management**
- [ ] Per-follower risk limits
- [ ] Max position sizes
- [ ] Daily loss limits
- [ ] Stop-loss propagation

**Phase 3: Platform Features**
- [ ] Performance dashboard
- [ ] Follower onboarding flow
- [ ] Multi-strategy support
- [ ] Additional broker integrations

### 3. Disclaimers Needed

**Required Disclaimer Package:**

```markdown
## RISK DISCLOSURE

Trading securities involves substantial risk of loss and is not suitable 
for all investors. Past performance is not indicative of future results. 
You may lose more than your initial investment.

## NOT INVESTMENT ADVICE

Cortex Capital is a technology platform that facilitates trade automation. 
We do not provide personalized investment advice, recommendations, or 
financial planning services. We are not a registered investment advisor.

All trading decisions are made by you. The decision to follow any trading 
strategy is solely your responsibility. You should consult with a qualified 
financial advisor before making investment decisions.

## SOFTWARE/TECHNOLOGY SERVICE

Cortex Capital provides software tools for trade signal distribution and 
automation. We do not:
- Hold or have custody of your funds
- Execute trades directly (your broker does)
- Guarantee any specific trading results
- Provide tax, legal, or financial advice

## USER ACKNOWLEDGMENTS

By using this service, you acknowledge that:
- You are connecting your own brokerage account
- You control your own trading parameters
- You can stop copying at any time
- You are responsible for monitoring your account
- Technical issues may affect trade execution
- Slippage and latency may result in different execution prices

## HYPOTHETICAL PERFORMANCE DISCLAIMER

Any performance data shown may include hypothetical or simulated results. 
Hypothetical performance has many inherent limitations including:
- It is prepared with the benefit of hindsight
- It does not reflect actual trading
- It cannot account for all market conditions
- Actual results may differ substantially

## NO GUARANTEES

We do not guarantee any level of performance, profit, or protection 
from losses. Market conditions can change rapidly and without warning.
```

### 4. Compliance Requirements

**Minimum Compliance Checklist:**

**Legal:**
- [ ] Form LLC or corporation
- [ ] Terms of Service (reviewed by attorney)
- [ ] Privacy Policy (CCPA/GDPR compliant)
- [ ] Risk disclosures on website and in app
- [ ] User agreement before connecting account

**Operational:**
- [ ] Secure token storage (encryption at rest)
- [ ] Audit logging of all trades
- [ ] Data backup procedures
- [ ] Incident response plan

**Regulatory Monitoring:**
- [ ] Stay updated on SEC/CFTC guidance
- [ ] Monitor state-level requirements
- [ ] Consider compliance consultation quarterly

**If Trading Futures/Options:**
- [ ] Consider NFA registration (consult attorney)
- [ ] Additional risk disclosures required
- [ ] May need Series 3 or similar license

**Recommended: Legal Consultation**
Before launch, get legal review from attorney specializing in:
- Securities law
- Investment adviser regulations
- Fintech compliance

**Budget:** $2,000 - $10,000 for initial legal review and documentation

---

## SUMMARY

**Legal:** Technology platform model is safest. Avoid discretionary management. Users connect their own brokers and make their own decisions.

**Technical:** OAuth broker connections, WebSocket for real-time detection, parallel execution for followers, percentage-based scaling.

**Models to Follow:** Collective2 (platform approach), with inspiration from Kinfo (verification) and eToro (UX).

**Action Items:**
1. Legal consultation on structure
2. Build MVP with Tradier API
3. Create comprehensive disclaimers
4. Test with internal accounts first
5. Gradual rollout to external users

---

*Research compiled: 2026-03-21*
*Sources: SEC/CFTC guidance, fintech regulation guides, platform documentation, industry analysis*
