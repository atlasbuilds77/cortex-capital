# Hybrid Architecture - IMPLEMENTED ✅

**Status:** Complete and ready for production  
**Date:** 2026-03-21  
**Version:** 2.0

---

## Overview

The hybrid architecture enables Cortex Capital to operate in **two modes**:

### 1. LOCAL MODE (Your Portfolio)
- Run agents directly via CLI
- Full control and transparency
- Perfect for personal trading

### 2. PRODUCTION MODE (Multi-Tenant SaaS)
- Automated portfolio management for ANY user
- LLM-powered agents with SOUL.md personalities
- Scheduled operations (daily checks, rebalancing, reports)
- Database-backed state management

---

## Core Components

### 1. Portfolio Engine (`/services/portfolio-engine.ts`)

**The heart of the multi-tenant system.**

Processes ANY user's portfolio through the agent workflow:

```typescript
import { createPortfolioEngine } from './services/portfolio-engine';

const engine = createPortfolioEngine();

// Load user
const user = await engine.loadUser(userId);

// Analyze portfolio (calls ANALYST with LLM)
const analysis = await engine.analyzePortfolio(userId);

// Generate rebalancing plan (calls STRATEGIST with LLM)
const plan = await engine.generatePlan(userId);

// Execute approved trades (calls EXECUTOR)
const result = await engine.executePlan(userId, planId);

// Send report (calls REPORTER with LLM)
await engine.sendReport(userId, 'monthly');
```

**Key Features:**
- ✅ Loads user from Supabase
- ✅ Calls agents via `llm-agent-wrapper.ts`
- ✅ Agents use SOUL.md personalities
- ✅ Stores results to database
- ✅ Executes trades through broker APIs
- ✅ Multi-tenant safe (isolated by user_id)

### 2. Scheduler (`/services/scheduler.ts`)

**Automated operations for all users.**

Uses `node-cron` to run scheduled jobs:

```typescript
import { createScheduler } from './services/scheduler';

const scheduler = createScheduler();
scheduler.start();

// Jobs run automatically:
// - Daily portfolio checks (9 AM)
// - Weekly rebalancing (Monday 8 AM)
// - Monthly reports (1st of month, 8 AM)
// - Weekly reports (Monday 6 PM)
```

**Scheduled Jobs:**

| Job | Schedule | Action |
|-----|----------|--------|
| Daily Check | 9:00 AM daily | Analyze all portfolios, create plans if needed |
| Weekly Rebalance | 8:00 AM Monday | Rebalance ultra_aggressive users |
| Monthly Reports | 8:00 AM 1st | Send monthly performance reports |
| Weekly Reports | 6:00 PM Monday | Send weekly summaries |

**Key Features:**
- ✅ Processes ALL users automatically
- ✅ Respects each user's risk profile
- ✅ Timezone-aware (PST by default)
- ✅ Graceful shutdown on SIGINT/SIGTERM
- ✅ Manual job triggers for testing

### 3. LLM Agent Wrapper (`/agents/llm-agent-wrapper.ts`)

**Gives agents LLM reasoning powers.**

Wraps deterministic agents with LLM intelligence:

```typescript
import { LLMAgent } from './agents/llm-agent-wrapper';

const analyst = new LLMAgent('ANALYST', {
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY
});

const decision = await analyst.decide(task, context);
// Returns: { action, confidence, reasoning, details }
```

**Features:**
- ✅ Loads SOUL.md personality files
- ✅ Supports DeepSeek, OpenAI, Claude
- ✅ Structured decision output (JSON)
- ✅ Context-aware (portfolio, market data, user profile)
- ✅ Audit trail logging

---

## Database Schema

New tables for production mode:

### `analysis_results`
Stores ANALYST outputs:
```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(20), -- hold, rebalance, urgent_action
  confidence INTEGER, -- 0-100
  reasoning TEXT,
  metrics JSONB, -- drift, volatility, sharpe
  details JSONB,
  created_at TIMESTAMP
);
```

### `reports`
Stores REPORTER outputs:
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  report_type VARCHAR(20), -- daily, weekly, monthly
  content TEXT,
  created_at TIMESTAMP
);
```

**Run migration:**
```bash
npm run db:migrate:engine
# or directly:
psql -d cortex_capital -f migrations/004_engine_tables.sql
```

---

## Setup & Configuration

### 1. Environment Variables

Add to `.env`:

```bash
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# LLM Provider (choose one)
LLM_PROVIDER=deepseek  # or 'openai' or 'anthropic'
DEEPSEEK_API_KEY=sk-...
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Optional
LLM_MODEL=deepseek-chat  # default model
TIMEZONE=America/Los_Angeles  # scheduler timezone
```

### 2. Install Dependencies

```bash
npm install
```

New dependencies:
- `node-cron` - Scheduled jobs
- `@types/node-cron` - TypeScript types

### 3. Run Database Migration

```bash
npm run db:migrate:engine
```

Creates `analysis_results` and `reports` tables.

---

## Testing

### Test Portfolio Engine

**Creates a test user and runs the full workflow:**

```bash
npm run test:engine
```

**What it does:**
1. Creates test user (moderate risk profile)
2. Adds portfolio snapshot ($50K)
3. Runs portfolio analysis (ANALYST)
4. Generates rebalancing plan (STRATEGIST)
5. Generates monthly report (REPORTER)

**Expected output:**
```
🚀 Testing Portfolio Engine

1️⃣ Creating test user...
✅ User created: test-1234567890@cortexcapital.dev

2️⃣ Creating portfolio snapshot...
✅ Portfolio snapshot created

3️⃣ Running portfolio analysis...
✅ Analysis complete:
   Action: rebalance
   Confidence: 85%
   Reasoning: Portfolio drift detected...
   Drift: 5.23%
   Issues: 0

4️⃣ Generating rebalancing plan...
✅ Plan generated:
   Plan ID: abc123...
   Status: pending
   Trades: 3
   Expected cost: $150

5️⃣ Generating monthly report...
✅ Report generated and stored

✨ Test complete!
```

### Test Scheduler

**Demonstrates scheduled jobs:**

```bash
npm run test:scheduler
```

**To actually run a job (for testing):**
```bash
npm run test:scheduler -- --run-job
```

**Expected output:**
```
⏰ Testing Portfolio Scheduler

1️⃣ Scheduler status (before start):
   Running: false
   Jobs: 0

2️⃣ Starting scheduler...
✅ Scheduler started
   Jobs: 4
   Timezone: America/Los_Angeles

   Scheduled jobs:
   • daily_check: 9 AM daily ✓
   • weekly_rebalance: 8 AM Monday ✓
   • monthly_report: 8 AM 1st of month ✓
   • weekly_report: 6 PM Monday ✓

📅 In production, these jobs run automatically
...
```

---

## Production Deployment

### Option 1: Standalone Scheduler Process

Run scheduler as a separate process:

```bash
npm run scheduler
```

This runs the scheduler continuously, executing jobs at scheduled times.

**For production:**
```bash
NODE_ENV=production npm run scheduler
```

**With PM2:**
```bash
pm2 start "npm run scheduler" --name cortex-scheduler
pm2 save
```

### Option 2: Integrated with Main Server

Add to your `server.ts`:

```typescript
import { createScheduler } from './services/scheduler';

// After server starts
const scheduler = createScheduler();
scheduler.start();
console.log('✅ Scheduler started');

// Graceful shutdown
process.on('SIGINT', () => {
  scheduler.stop();
  server.close(() => process.exit(0));
});
```

### Option 3: Serverless/Cloud Functions

Deploy each job as a separate cloud function:

**Daily Check (`/api/cron/daily-check`):**
```typescript
import { createScheduler } from './services/scheduler';

export default async function handler(req, res) {
  const scheduler = createScheduler();
  await scheduler.triggerJob('daily');
  res.json({ success: true });
}
```

Then use Vercel Cron, AWS EventBridge, or similar to trigger.

---

## API Integration

### Manual Job Triggers

Add endpoints to your API for manual control:

```typescript
// POST /api/jobs/trigger
fastify.post('/api/jobs/trigger', async (request, reply) => {
  const { job } = request.body;
  
  const scheduler = createScheduler();
  await scheduler.triggerJob(job);
  
  return { success: true, job };
});

// GET /api/jobs/status
fastify.get('/api/jobs/status', async (request, reply) => {
  const scheduler = createScheduler();
  return scheduler.getStatus();
});
```

### User-Specific Operations

```typescript
// POST /api/portfolio/:userId/analyze
fastify.post('/api/portfolio/:userId/analyze', async (request, reply) => {
  const { userId } = request.params;
  const engine = createPortfolioEngine();
  
  const analysis = await engine.analyzePortfolio(userId);
  return analysis;
});

// POST /api/portfolio/:userId/rebalance
fastify.post('/api/portfolio/:userId/rebalance', async (request, reply) => {
  const { userId } = request.params;
  const engine = createPortfolioEngine();
  
  const plan = await engine.generatePlan(userId);
  return plan;
});

// POST /api/portfolio/:userId/execute/:planId
fastify.post('/api/portfolio/:userId/execute/:planId', async (request, reply) => {
  const { userId, planId } = request.params;
  const engine = createPortfolioEngine();
  
  const result = await engine.executePlan(userId, planId);
  return result;
});
```

---

## Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    PORTFOLIO ENGINE                       │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   ANALYST   │  │ STRATEGIST  │  │  EXECUTOR   │      │
│  │   (LLM)     │  │   (LLM)     │  │   (LLM)     │      │
│  └─────┬───────┘  └─────┬───────┘  └─────┬───────┘      │
│        │                 │                 │               │
│        │                 │                 │               │
│  ┌─────▼─────────────────▼─────────────────▼───────┐    │
│  │           LLM Agent Wrapper + SOUL.md            │    │
│  └──────────────────────┬───────────────────────────┘    │
│                         │                                 │
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────┐    │
│  │              Supabase Database                    │    │
│  │  • users                                          │    │
│  │  • portfolio_snapshots                           │    │
│  │  • analysis_results                              │    │
│  │  • rebalancing_plans                             │    │
│  │  • reports                                       │    │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
                         ▲
                         │
                         │
               ┌─────────┴─────────┐
               │                   │
         ┌─────▼──────┐    ┌──────▼──────┐
         │ Scheduler  │    │  REST API   │
         │ (Cron)     │    │ (Manual)    │
         └────────────┘    └─────────────┘

Daily:    9 AM → Analyze all users
Weekly:   8 AM Mon → Rebalance ultra_aggressive
Monthly:  1st → Send reports
On-demand: API calls from users/admin
```

---

## Risk Profile Behavior

Each risk profile has different scheduling:

### Conservative
- **Rebalance frequency:** Quarterly
- **Automated checks:** Daily (9 AM)
- **Reports:** Monthly + quarterly
- **Auto-rebalance:** No (requires approval)

### Moderate
- **Rebalance frequency:** Monthly
- **Automated checks:** Daily (9 AM)
- **Reports:** Weekly + monthly
- **Auto-rebalance:** No (requires approval)

### Ultra Aggressive
- **Rebalance frequency:** Weekly (Monday 8 AM)
- **Automated checks:** Daily (9 AM)
- **Reports:** Daily + weekly + monthly
- **Auto-rebalance:** Optional (can enable auto-approve)

---

## Next Steps

### 1. Test Locally ✅

```bash
npm run test:engine
npm run test:scheduler
```

### 2. Deploy to Production

Choose deployment strategy:
- Standalone scheduler process (PM2)
- Integrated with main server
- Serverless functions

### 3. Add Notification System

Users need to know when:
- Analysis finds issues
- Rebalancing plan ready for approval
- Trades executed
- Reports available

**Integration points:**
- Email (Resend, SendGrid)
- SMS (Twilio)
- Push notifications (Firebase)
- In-app notifications

### 4. Add Admin Dashboard

Monitor system health:
- Jobs running
- Users processed
- Errors/failures
- Performance metrics

### 5. Scale Up

As user base grows:
- Add job queues (BullMQ, Inngest)
- Rate limit LLM calls
- Parallelize user processing
- Add caching layer

---

## Files Created

✅ `/services/portfolio-engine.ts` - Core engine (482 lines)  
✅ `/services/scheduler.ts` - Scheduled operations (342 lines)  
✅ `/lib/logger.ts` - Logging utility (20 lines)  
✅ `/migrations/004_engine_tables.sql` - Database schema (44 lines)  
✅ `/test-engine.ts` - Engine test script (138 lines)  
✅ `/test-scheduler.ts` - Scheduler test script (96 lines)  
✅ `HYBRID-ARCHITECTURE.md` - This guide

**Dependencies added:**
- `node-cron` - Scheduled jobs
- `@types/node-cron` - TypeScript types

**Total:** ~1,100 lines of production-ready code

---

## Architecture Philosophy

**Local Mode (Your Portfolio):**
- Direct agent calls
- CLI-driven
- Immediate feedback
- Full transparency

**Production Mode (Multi-Tenant):**
- Database-driven
- LLM-powered agents
- Scheduled operations
- Scalable to thousands of users

**Both modes share:**
- Same agent logic
- Same SOUL.md personalities
- Same risk profile configs
- Same broker integrations

**The engine acts as a bridge:**
```
User → Engine → Agent → LLM → SOUL.md → Decision → Database
```

---

## Success Criteria ✅

- [x] Portfolio engine processes any user
- [x] Agents use LLM reasoning
- [x] SOUL.md personalities loaded
- [x] Results stored to database
- [x] Scheduler runs automated jobs
- [x] Test scripts demonstrate full flow
- [x] Database migrations complete
- [x] Documentation comprehensive
- [x] Ready for production deployment

---

**Status:** 🎯 COMPLETE AND PRODUCTION-READY

The hybrid architecture is fully implemented. You can now:
1. Run your own portfolio locally (existing CLI)
2. Deploy as SaaS for multiple users (new engine + scheduler)

Both modes coexist peacefully. Choose based on use case.

**Next:** Deploy, add notifications, scale up. ⚡
