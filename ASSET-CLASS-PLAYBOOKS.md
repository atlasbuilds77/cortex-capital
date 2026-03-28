# Cortex Capital - Asset Class Playbooks
## The Foundation: Same Agents, Different Rules

**Philosophy:** A real trading desk doesn't swap traders when switching from stocks to options. The same people apply different frameworks depending on what they're trading. Cortex works the same way.

**How it works:** When agents discuss or evaluate a position, they receive a `strategy_context` that defines the rules for that specific asset class. The agents' personalities and expertise stay constant - the playbook they follow changes.

---

## PLAYBOOK 1: Options — Scalp / Day Trade (0-1 DTE)

### Identity
**Tempo:** Fast. Every minute matters.
**Mindset:** "Get in, get paid, get out."
**Theta impact:** EXTREME (-$5 to -$50+/day depending on position size)

### Entry Rules
- **Strike validation:** Max $5 OTM for scalps. If strike is >3% from current price, REJECT.
- **Liquidity check:** Min 500 OI at strike, bid-ask spread <$0.10
- **Time window:** First 2 hours of market preferred (9:30-11:30 ET). Avoid lunch chop (11:30-1:00 ET).
- **Catalyst required:** Need a reason (level break, volume surge, news). No "it might go up."
- **Max position:** 5% of portfolio per trade

### Management Rules
- **Hard stop:** -35% from entry (no exceptions)
- **Scaling exits:**
  - +30% → sell 1/3
  - +50% → sell 1/2 (stop moves to breakeven)
  - +75% → sell 2/3 (stop moves to +25%)
  - +100% → sell ALL
- **Stepped floor stops (from entry, not trailing):**
  - At +50% profit → stop floor = breakeven
  - At +75% profit → stop floor = +25%
  - At +100% profit → stop floor = +50%
- **Runner rules:** Max 20-30% of original position as runners
  - Runner stops (from peak): +100-300% = 40% pullback, +300-500% = 12%, +500%+ = 8%

### Exit Rules
- **0 DTE emergency:** If position is losing at 2:00 PM ET, SELL. No hoping.
- **Never hold 0DTE overnight** (they don't exist tomorrow)
- **Time decay acceleration:** After 12:00 PM ET on 0DTE, theta accelerates. Get out unless deep ITM.
- **Close by:** 3:30 PM ET absolute latest (30 min before close)

### Agent Behavior
- **ANALYST:** Must state current price vs strike distance. "SPY $645, this $660 call is $15 OTM (2.3%) — unlikely to hit today."
- **RISK:** Must calculate theta cost and breakeven. "Theta is -$12/day. Need +$12 just to stay flat."
- **STRATEGIST:** Must define exact exit plan before entry. No open-ended "let's see."
- **EXECUTOR:** Must set stops immediately on fill. No delay.

### Red Flags (Auto-reject)
- Strike >5% OTM on 0DTE
- VIX >35 (premiums too expensive, decay too fast)
- No volume at strike (<500 OI)
- Entering after 1:00 PM ET on 0DTE
- No clear thesis beyond "it's oversold"

---

## PLAYBOOK 2: Options — Swing (2-14 DTE)

### Identity
**Tempo:** Medium. Days to develop, but clock is ticking.
**Mindset:** "Thesis-driven with a deadline."
**Theta impact:** MODERATE (-$2 to -$15/day)

### Entry Rules
- **Strike validation:** Max $10 OTM or 5% from current price
- **Liquidity check:** Min 1,000 OI at strike
- **Catalyst alignment:** Earnings, Fed, macro event within DTE window
- **Theta check:** Daily theta cost must be <2% of position value
- **Max position:** 5% of portfolio per trade
- **Prefer:** Slightly ITM or ATM for swing trades (lower theta burn)

### Management Rules
- **Hard stop:** -35% from entry
- **Scaling exits:**
  - +30% → sell 1/4
  - +50% → sell 1/3 (stop to breakeven)
  - +75% → sell 1/2 (stop to +25%)
  - +100%+ → sell 2/3, keep runners
- **Daily check-in:** Is the thesis still valid? If not, close regardless of P&L.
- **Theta checkpoint:** Every morning, calculate remaining theta cost vs expected move. If theta will eat >50% of remaining value before expiry → close.

### Exit Rules
- **DTE countdown:** At 2 DTE remaining, position becomes Playbook 1 (scalp rules apply)
- **Thesis invalidation:** If the setup breaks (support lost, catalyst missed), close immediately
- **Never hold through earnings** unless that WAS the thesis
- **Max hold:** If position hasn't moved in 5 days, re-evaluate. Dead money = opportunity cost.

### Agent Behavior
- **ANALYST:** Must state thesis with timeframe. "NVDA to $180 by Friday based on AI spending data."
- **RISK:** Must calculate total theta cost over expected hold. "5-day hold, theta $8/day = $40 decay. Need +$40 move to break even."
- **STRATEGIST:** Must define thesis invalidation point. "Below $168 support, thesis is dead."
- **EXECUTOR:** Review stops daily. Adjust based on playbook rules.

### Red Flags (Auto-reject)
- No specific thesis (just "bullish")
- Theta cost >3% of position per day
- Earnings within DTE window (unless that's the play)
- Strike >7% OTM
- Low liquidity (<500 OI)

---

## PLAYBOOK 3: Options — LEAPS (45+ DTE)

### Identity
**Tempo:** Slow. This is a strategic position.
**Mindset:** "Leveraged conviction bet."
**Theta impact:** LOW daily, but cumulative over months

### Entry Rules
- **Strike selection:** ATM or slightly ITM (delta 0.50-0.70)
- **Why LEAPS:** Strong fundamental thesis that takes time to play out
- **Liquidity:** Less critical (not day-trading these), but min 200 OI
- **Max position:** 3% of portfolio (leveraged = smaller size)
- **Entry timing:** On pullbacks to support, not at highs

### Management Rules
- **Hard stop:** -40% from entry (wider than short-term, thesis needs time)
- **Scaling:** Less aggressive
  - +50% → sell 1/4
  - +100% → sell 1/3
  - +200%+ → sell 1/2, hold runners
- **Monthly review:** Is the fundamental thesis intact?
- **Roll window:** When <45 DTE remaining, evaluate rolling forward
- **Never let LEAPS become short-dated** — roll or close before 30 DTE

### Exit Rules
- **Thesis change:** Company fundamentals shift (earnings miss, sector rotation) → close
- **At 30 DTE:** Position auto-converts to Playbook 2 (swing rules). Roll or close.
- **Target reached:** If thesis plays out early, take profits. Don't get greedy.

### Agent Behavior
- **ANALYST:** Must present fundamental case. Not just technicals.
- **RISK:** Must calculate total capital at risk including time. "6-month LEAP, $500 invested, max loss $500."
- **STRATEGIST:** Monthly thesis review. Written assessment.
- **VALUE:** Gets heavier weighting — LEAPS are value plays, not momentum.

### Red Flags (Auto-reject)
- No fundamental thesis (pure technical LEAP = bad idea)
- OTM LEAPS (delta <0.40) — too speculative
- Position >5% of portfolio (leverage makes this dangerous)
- No clear catalyst within timeframe

---

## PLAYBOOK 4: Stocks — Active / Swing (Days to Weeks)

### Identity
**Tempo:** Medium. No expiry pressure, but still time-sensitive.
**Mindset:** "Ride the trend, cut the losers."

### Entry Rules
- **Technical setup:** Breakout, pullback to support, or momentum continuation
- **Volume confirmation:** Above average volume on entry day
- **Sector check:** Is the sector strong or rotating in?
- **Max position:** 5% of portfolio per stock
- **Risk/reward:** Minimum 2:1 (target 2x the stop distance)

### Management Rules
- **Hard stop:** -8% from entry (stocks move slower, tighter percentage stop)
- **Trailing stop:** After +10%, trail at 50% of gains
  - Example: Stock up 20% → stop at +10%
- **Add to winners:** Can add 50% more at +5% if thesis strengthening
- **No averaging down** on losers (this isn't investing, it's trading)

### Exit Rules
- **Target hit:** Sell at predefined target
- **Trailing stop hit:** Sell, no questions
- **Sector rotation:** If sector weakens, reduce exposure regardless of individual stock
- **Time stop:** If flat after 10 days, re-evaluate. Close or adjust thesis.
- **Earnings:** Decide BEFORE earnings: hold or close. No last-minute decisions.

### Agent Behavior
- **ANALYST:** Technical + fundamental quick check. Support/resistance levels.
- **RISK:** Position sizing based on stop distance. "$200 stock, 8% stop = $16 risk per share."
- **GROWTH:** Gets heavier weighting — momentum and sector rotation focus.
- **EXECUTOR:** Set stops on entry. Trail automatically.

---

## PLAYBOOK 5: Stocks — Long-term / Portfolio (Months to Years)

### Identity
**Tempo:** Slow. This is wealth building.
**Mindset:** "Own great businesses. Let compounding work."

### Entry Rules
- **Fundamental strength:** Strong earnings, moat, cash flow
- **Valuation:** Not absurdly overvalued (P/E vs sector average)
- **Diversification:** No single stock >10% of portfolio. No single sector >30%.
- **Entry timing:** Dollar-cost average in. Don't YOLO full position at once.
  - Tranche 1: 40% initial
  - Tranche 2: 30% on pullback or after 2 weeks
  - Tranche 3: 30% on confirmation or after 4 weeks

### Management Rules
- **No hard stop** (conviction positions, ride through volatility)
- **Rebalance trigger:** If position grows to >12% of portfolio, trim to 8%
- **Dividend reinvestment:** Auto if available
- **Quarterly review:** Is the thesis still intact? Earnings growing? Moat widening?
- **Add on weakness:** Can add to winners that pull back (opposite of swing trading)

### Exit Rules
- **Thesis broken:** Fundamental deterioration (3+ quarters declining revenue, management crisis)
- **Overvaluation:** P/E >2x sector average with no growth justification
- **Better opportunity:** Only sell to fund a significantly better position
- **Tax awareness:** Prefer holding >1 year for long-term capital gains rate
- **Never panic sell** on a red day. This isn't that kind of trading.

### Agent Behavior
- **VALUE:** Primary driver. Fundamental analysis, valuation metrics, moat assessment.
- **ANALYST:** Quarterly earnings review, competitor analysis.
- **RISK:** Portfolio-level risk (sector concentration, correlation).
- **GROWTH:** Identifies when a long-term hold becomes a growth story (or vice versa).
- **STRATEGIST:** Rebalancing decisions, sector allocation.

---

## POSITION CLASSIFIER

**How agents determine which playbook to use:**

```
INPUT: Symbol, asset type, DTE (if options)
↓
Is it an option?
├── YES → Check DTE
│   ├── 0-1 DTE → PLAYBOOK 1 (Scalp)
│   ├── 2-14 DTE → PLAYBOOK 2 (Swing Options)
│   └── 15+ DTE → PLAYBOOK 3 (LEAPS — but 15-44 DTE is gray zone, lean Playbook 2)
│       └── 45+ DTE → PLAYBOOK 3 (true LEAPS)
│
└── NO (Stock) → Check intent
    ├── Swing setup (technical entry, catalyst) → PLAYBOOK 4
    └── Portfolio position (fundamental, long-term) → PLAYBOOK 5
```

**DTE transitions (critical):**
- Options auto-downgrade as they approach expiry
- A LEAP (Playbook 3) at 30 DTE remaining → becomes Playbook 2
- A swing option (Playbook 2) at 1 DTE → becomes Playbook 1
- Each transition triggers an agent review: "This position is now short-dated. Re-evaluate."

**Gray zones:**
- 15-44 DTE options: Default Playbook 2, but agents can argue for Playbook 3 if thesis is long-term
- Stock swing vs long-term: Entry thesis determines. If bought for a catalyst → Playbook 4. If bought for growth → Playbook 5.

---

## EXPIRY GUARDIAN (Background Process)

**Runs every 15 minutes during market hours.**

**Hard rules (no agent override):**

1. **0 DTE + OTM + after 2 PM ET** → AUTO-SELL (no discussion)
2. **0 DTE + losing >50%** → AUTO-SELL
3. **1 DTE + OTM + losing >35%** → FLAG for agent review (sell if no strong thesis)
4. **Any option at 0 DTE** → Alert agents at market open: "These expire today."
5. **Any option transitioning DTE category** → Alert: "Playbook upgrade required."
6. **Strike >10% OTM at any DTE** → Flag: "This is extremely unlikely to hit."
7. **Theta eating >5% of remaining value per day** → Flag: "Theta is destroying this position."

**The guardian doesn't ask permission.** Rules 1 and 2 are automatic. The SPY $660 call would have been sold days ago.

---

## AGENT CONTEXT INJECTION

**Before any discussion, agents receive:**

```json
{
  "position": {
    "symbol": "SPY260328C00650000",
    "asset_class": "option",
    "type": "call",
    "strike": 650,
    "expiry": "2026-03-28",
    "dte": 1,
    "current_price": 1.25,
    "entry_price": 2.50,
    "unrealized_pnl_pct": -50,
    "theta_daily": -0.85,
    "delta": 0.25,
    "underlying_price": 645.09
  },
  "playbook": "SCALP_0DTE",
  "rules": {
    "hard_stop": -35,
    "scaling": [30, 50, 75, 100],
    "max_hold_time": "3:30 PM ET",
    "theta_warning": "Theta is -$0.85/day. Need +$0.85 move just to stay flat."
  },
  "alerts": [
    "⚠️ This option expires TOMORROW",
    "⚠️ Currently -50% from entry (at hard stop)",
    "⚠️ Strike is $5 OTM (0.8% from current price)"
  ]
}
```

**This changes EVERYTHING about how agents discuss the position.** Instead of "should we hold?" they see "this expires tomorrow, we're at the stop, theta is eating us alive, and we're OTM."

The data forces better decisions.

---

## IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Day 1-2)
- [ ] Position classifier (determine playbook from position data)
- [ ] Context injection (feed playbook rules to agents)
- [ ] Expiry guardian (background hard-rule enforcer)

### Phase 2: Agent Behavior (Day 2-3)
- [ ] Update agent prompts to use playbook context
- [ ] Add DTE transition logic
- [ ] Add theta calculation to position data

### Phase 3: Testing (Day 3-4)
- [ ] Backtest against current portfolio (would SPY $660 have been caught?)
- [ ] Paper trade with new playbooks for 3 days
- [ ] Verify guardian auto-sells work

### Phase 4: Polish (Day 4-5)
- [ ] Dashboard shows which playbook each position is using
- [ ] Agent discussions reference playbook rules
- [ ] User can see why decisions were made

---

## THE SPY $660 CALL POST-MORTEM

**What happened:**
- Agents bought SPY $660 calls (SPY was ~$645, strike 2.3% OTM)
- Nobody checked if this was realistic
- Nobody tracked theta decay
- Nobody sold before expiry
- Lost 100% ($3,640)

**What would have happened with playbooks:**
1. **Entry:** Position classifier → Playbook 1 (0DTE) or 2 (swing)
2. **ANALYST red flag:** "SPY $660 is $15 OTM (2.3%). On a 0-3 DTE option, this needs a massive move."
3. **RISK rejection:** "Theta is -$X/day. SPY would need to move +$15 in [DTE] days. Historical probability: <10%."
4. **If somehow entered:** Expiry Guardian catches it at -35% → auto-sell. Loss: ~$1,274 instead of $3,640.
5. **At 0 DTE:** Guardian sees OTM option → auto-sell regardless.

**Savings:** ~$2,366 on this one trade alone.

---

**This is the foundation. Everything else builds on these playbooks.**

*"The agents don't change - their context changes."*

**Created:** 2026-03-27 12:59 PDT
**Author:** Atlas ⚡
**Status:** APPROVED — Ready for implementation
