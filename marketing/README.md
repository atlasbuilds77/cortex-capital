# Cortex Capital - Marketing Assets

Complete, conversion-optimized landing page and marketing materials for Cortex Capital.

## 📁 What's Included

### Landing Page
**`landing-page.tsx`** - Full Next.js component with:
- Hero section with CTAs
- Social proof bar ($2.4M AUM, 1,200+ portfolios, 12.4% avg return)
- Problem statement (why old ways don't work)
- Solution showcase (7 AI agents)
- How it works (4-step process)
- Strategy overview (LEAPS, sector rotation, covered calls, etc.)
- Pricing table (Scout $49, Operator $99, Partner $249)
- Fish tank demo embed section
- Testimonials
- FAQ (8 questions)
- Final CTA
- Footer with legal/social links

**Mobile-first responsive design**
**Dark mode theme** (finance app aesthetic)

---

### Marketing Copy
**`copy.md`** - Complete copy bank including:
- 10 headline variations
- 10 subheadlines
- 15+ CTAs (primary, secondary, urgency)
- Email sequence outlines (welcome, onboarding, weekly, monthly)
- 20+ social media posts (educational, results, anti-establishment, BTS)
- Google/Facebook/LinkedIn ad copy
- Value propositions
- Objection handlers
- Thread templates

---

### Email Templates
All templates use dark mode theme (#1a1a2e background, #00d4ff accent, #00ff88 success green):

1. **`welcome.html`** - Post-signup welcome
   - Introduces Cortex Capital
   - Explains what happens next (4 steps)
   - Shows all 7 AI agents
   - CTA: Connect Your Broker

2. **`onboarding-1.html`** - Day 1: Connect Your Broker
   - Lists supported brokers (Tradier, Alpaca)
   - Security reassurance (OAuth, no custody)
   - Step-by-step connection guide
   - Alternative: How to set up a brokerage account

3. **`onboarding-2.html`** - Day 2: Your First Portfolio
   - Portfolio summary (risk profile, target return, allocation)
   - Active strategies breakdown (LEAPS 60%, Sector Rotation 25%, Covered Calls 15%)
   - What happens next (agents live, first trades in 24-48h)
   - Dashboard tour
   - Control reassurance

4. **`weekly-report.html`** - Weekly performance update
   - Performance hero (+2.4% this week)
   - vs. benchmarks comparison
   - Top trades breakdown
   - Agent activity summary
   - Market commentary
   - Next week outlook
   - CTA: View Full Dashboard

5. **`monthly-report.html`** - Monthly deep dive
   - 30-day performance banner (+$1,240, 12.4% annualized)
   - Strategy breakdown (what contributed most)
   - Tax optimization savings ($156 this month)
   - Agent activity deep dive
   - Portfolio health metrics (beta, diversification, risk level)
   - Next month outlook
   - Goal progress tracker

6. **`win-notification.html`** - Trade win celebration
   - Win banner (+$420, +34% on AAPL LEAPS)
   - Trade timeline (6 steps from scout to close)
   - Why it worked (thesis, strategy, execution)
   - What's next (capital redeployment)
   - LEAPS education section
   - All-time stats

---

### Social Media Posts
**`social-posts.md`** - 26 ready-to-post pieces:

**Educational (8 posts):**
- What are LEAPS?
- Tax-loss harvesting explained
- Sector rotation 101
- Covered calls for income
- Why day trading fails (and how we fix it)
- Understanding portfolio beta
- The power of compounding
- Stop-loss discipline

**Results (3 posts):**
- LEAPS backtest (127 trades, 68% win rate, 28.4% annualized)
- Sector rotation backtest (+147% vs. SPY +98%)
- Tax-loss harvesting impact ($8,400 saved over 5 years)

**Anti-Establishment (4 posts):**
- Hedge fund fee math (they take 33% of gains)
- The $1M minimum scam
- Robo-advisors are boring on purpose
- "Just buy index funds" is bad advice for most

**Behind the Scenes (3 posts):**
- Agent collaboration in action (90-second decision)
- Real-time decision (live NVDA trade)
- Why we use 7 agents (not 1)

**Comparisons (2 posts):**
- Cortex vs. Betterment (head-to-head)
- Active vs. passive myth (AI changes everything)

**Engagement (3 posts):**
- Poll: Your biggest investing frustration
- Quick question (7% vs. 15% returns)
- Contrarian take (AI vs. financial advisors)

**Social Proof (2 posts):**
- Milestone update ($2.4M AUM, 1,200 portfolios)
- Case study teaser (Sarah: $10K → $14K in 8 months)

**Thread Template (1):**
- "7 AI Agents Managing Your Wealth" (7-tweet thread)

---

## 🎨 Design System

### Colors
- **Primary:** `#1a1a2e` (Deep blue - trust, finance)
- **Accent:** `#00d4ff` (Electric cyan - tech, AI)
- **Success:** `#00ff88` (Green - money, growth)
- **Warning:** `#ffaa00` (Amber)

### Typography
- **Headlines:** Bold, modern sans-serif
- **Body:** Clean, readable
- Use CAPS for emphasis (not markdown bold in iMessage contexts)

### Style
- Dark mode default (finance app feel)
- Subtle gradients (`linear-gradient(135deg, ...)`)
- Agent "cards" with emojis as avatars
- Charts and visualizations (placeholder for Claw3D)
- Mobile-first responsive
- Smooth hover transitions

---

## 🚀 Implementation Notes

### Landing Page
- Built as Next.js component (use in app/page.tsx or pages/index.tsx)
- All interactive elements use React state (billing toggle, etc.)
- Responsive grid layouts (collapses to 1-column on mobile)
- Uses Tailwind CSS classes
- All links are placeholders - replace with actual routes
- Social proof numbers are examples - update with real metrics

### Email Templates
- Inline CSS (for email client compatibility)
- Tested layout structure (max-width 600px)
- Dark mode color scheme
- Mobile-responsive grids (@media queries)
- All links point to cortexcapital.com/* - update with real URLs
- Personalization placeholders (user name, portfolio value, etc.) need dynamic insertion

### Social Posts
- Copy-paste ready (no code editing needed)
- Include hashtags for discoverability
- Thread format provided for Twitter/X
- Poll posts note where to use Twitter's poll feature
- All backtest numbers are hypothetical examples - replace with real data or clearly mark as backtests

---

## ✅ Next Steps

1. **Deploy Landing Page:**
   - Copy `landing-page.tsx` into your Next.js project
   - Update all placeholder links
   - Replace social proof metrics with real numbers
   - Add Claw3D embed for fish tank demo
   - Connect CTAs to actual signup flow

2. **Set Up Email System:**
   - Upload email templates to your ESP (Resend, SendGrid, etc.)
   - Add dynamic personalization variables
   - Set up automation triggers (signup → welcome, day 1 → onboarding-1, etc.)
   - Update all links to point to real dashboard/support URLs

3. **Launch Social:**
   - Schedule posts using Buffer/Hootsuite
   - Mix educational + results + anti-establishment content
   - Run poll posts weekly for engagement
   - Share case studies as they become available
   - Post agent decisions in real-time for transparency

4. **Run Ads:**
   - Use Google/Facebook ad copy from `copy.md`
   - A/B test headlines
   - Target 25-50 year olds with investing interest
   - Retarget landing page visitors
   - Track conversions to free trial signup

5. **Measure & Iterate:**
   - Landing page: Track scroll depth, CTA clicks, bounce rate
   - Emails: Open rates, click-through rates, conversion to broker connection
   - Social: Engagement rate, follower growth, DM inquiries
   - Ads: Cost per signup, trial-to-paid conversion

---

## 📊 Metrics to Track

- **Landing page conversion rate:** Visitors → Free trial signups
- **Email open rates:** Welcome (70%+), Weekly (40%+), Monthly (50%+)
- **Broker connection rate:** Signups → Connected broker (target: 60%+)
- **Trial-to-paid conversion:** Free trial → Paid plan (target: 30%+)
- **Social engagement:** Likes, retweets, comments per post
- **Ad performance:** CPC, CPL (cost per lead), ROAS

---

## 🔒 Legal Disclaimers (Required)

Every piece of marketing material includes appropriate disclaimers:
- "Past performance does not guarantee future results"
- "All investing involves risk, including loss of principal"
- "Cortex Capital is not a registered investment advisor"
- "This is not investment advice. Consult with a qualified financial advisor"

These appear in:
- Landing page footer
- Email template footers
- Social posts with performance claims
- All ad copy

---

## 🎯 Brand Voice Checklist

Every piece of content follows the brand voice:
- ✅ **Confident** (not arrogant)
- ✅ **Anti-establishment** (challenges status quo)
- ✅ **Tech-forward** (embraces AI/automation)
- ✅ **Accessible** (explains complex concepts simply)
- ✅ **Transparent** (shows real trades, real decisions)
- ✅ **Results-oriented** (focuses on returns, not features)

---

**Last Updated:** March 21, 2026
**Version:** 1.0
**Status:** Ready for deployment

---

Questions? Check the individual files for detailed content, or reach out to the team.
