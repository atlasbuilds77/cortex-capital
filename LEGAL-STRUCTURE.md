# CORTEX CAPITAL - Legal Structure

## THE KEY QUESTION: Do We Need RIA Registration?

### Short Answer: **Probably Not (If Structured Correctly)**

## Two Legal Paths

### PATH 1: Software/Signals Service (RECOMMENDED)
**Structure:** We sell SOFTWARE that provides trading signals and educational content.
- Users make their own decisions
- We don't manage their money
- We don't have discretionary authority
- Signals are "for educational purposes"

**Legal Basis:**
- Trading signals are legal to sell (they're suggestions, not advice)
- Software automation is legal
- Key: User must approve/execute trades themselves

**Examples Who Do This:**
- TradingView (signals, alerts)
- Trade Ideas (AI scanner)
- Collective2 (user chooses to follow)

**Required Disclaimers:**
```
"Cortex Capital provides algorithmic trading signals for educational 
and informational purposes only. This is not personalized investment 
advice. Past performance does not guarantee future results. You are 
solely responsible for your trading decisions. Consult a qualified 
financial advisor before making investment decisions."
```

### PATH 2: Registered Investment Advisor (RIA)
**When Required:**
- You have discretionary authority over client accounts
- You provide personalized investment advice for a fee
- You manage >$100M AUM (SEC) or <$100M (state registration)

**Why We Avoid This (For Now):**
- Expensive ($10K-$50K setup)
- Compliance burden (Form ADV, annual audits)
- Fiduciary duty to clients
- Can add later when we scale

---

## Our Recommended Structure

### Tier 1: SCOUT ($49/mo) ✅ NO RIA NEEDED
- Signals only (email/push notifications)
- User must manually execute trades
- Educational content
- "Paper trading mode"

### Tier 2: OPERATOR ($99/mo) ✅ GRAY AREA
- Signals + API automation
- User connects their own broker
- User APPROVES each trade (one-click)
- We don't have discretionary control

**Key Safeguard:** Require explicit approval for each trade.

### Tier 3: PARTNER ($249/mo) ⚠️ CLOSER TO RIA
- Full automation (auto-execute)
- This is where it gets tricky
- Options:
  1. Require user to toggle "auto-execute" themselves
  2. Partner with existing RIA
  3. Get our own RIA registration

---

## Disclaimers We MUST Have

### Website Footer
```
Cortex Capital is a financial technology company providing algorithmic 
trading software. We are not a registered investment advisor, broker-dealer,
or financial planner. Our services are for informational and educational 
purposes only. Trading involves substantial risk of loss and is not suitable 
for all investors. Past performance is not indicative of future results.
```

### Before Signup
```
☐ I understand that Cortex Capital provides trading signals for 
  educational purposes only.
☐ I am solely responsible for my trading decisions.
☐ I have read and agree to the Terms of Service and Risk Disclosure.
☐ I understand that trading involves risk of loss.
```

### On Every Signal
```
⚠️ This is not investment advice. Do your own research. 
   Past performance ≠ future results.
```

---

## Compliance Checklist

### Required Documents
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Risk Disclosure Statement
- [ ] Disclaimer (on every page)
- [ ] Refund Policy

### Required Practices
- [ ] No guarantees of profit
- [ ] No specific return promises
- [ ] Clear risk warnings
- [ ] User acknowledgment before signup
- [ ] Audit trail of all signals sent
- [ ] No testimonials with specific returns (SEC rules)

### State-Specific Issues
- Some states have "investment advisor" definitions broader than federal
- California, New York have stricter rules
- Consider: Limiting service to certain states initially

---

## When to Get RIA Registration

**Triggers:**
1. We want full discretionary management
2. We hit $25M+ AUM under management
3. We want to market as "investment advisor"
4. Institutional clients require it

**Cost:** $10K-$50K initial + $5K-$20K/year compliance
**Timeline:** 3-6 months

**Option:** Partner with existing RIA who handles compliance, we provide tech.

---

## Copy Trading Specifically

### How Others Do It

**Collective2:**
- Users "subscribe" to a strategy
- Users connect their own broker (via AutoTrade)
- Collective2 is NOT an RIA
- Trades execute automatically BUT user opted in

**eToro:**
- Registered in multiple jurisdictions
- Different structure per country
- US: Limited features due to regulations

### Our Approach (Copy Collective2)
1. User subscribes to our strategy
2. User connects their Tradier/Alpaca account (OAuth)
3. User enables "auto-sync" toggle
4. Trades copy automatically
5. User can disable anytime

**Key Differentiator:** User has control, not us.

---

## Bottom Line

**START WITH:**
- Signals-only service (Tier 1)
- Strong disclaimers
- User approval required
- No discretionary authority

**ADD LATER:**
- Auto-execution (with user toggle)
- RIA registration when scale justifies
- International expansion (different rules)

**CONSULT:** A securities attorney before launch ($1K-$3K for review)

---

*Last updated: 2026-03-21*
*This is not legal advice. Consult a qualified attorney.*
