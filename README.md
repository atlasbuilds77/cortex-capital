# 🏢 Autonomous Trading Company

A self-operating trading company with 6 AI agents that collaborate to trade crypto, options, and futures.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEARTBEAT (5min)                        │
│   evaluateTriggers → processReactions → promoteInsights → ...  │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│ PROPOSAL SVC  │◄────►│    DATABASE     │◄────►│   DASHBOARD    │
│  (Hub/Router) │      │  (PostgreSQL)   │      │   (Next.js)    │
└───────────────┘      └─────────────────┘      └────────────────┘
        │                                              ▲
        ▼                                              │
┌─────────────────────────────────────────────────────┴──────────┐
│                         WORKERS                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   CRYPTO    │  │   OPTIONS   │  │   FUTURES   │  ROUNDTABLE │
│  │  (Jupiter)  │  │  (Tradier)  │  │  (Nebula)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└────────────────────────────────────────────────────────────────┘
```

## The 6 Agents

| Agent | Role | Emoji | Color |
|-------|------|-------|-------|
| **Atlas** | Strategy / Coordinator | 👔 | Indigo |
| **Sage** | Risk Manager / Analyst | 🛡️ | Green |
| **Scout** | Executor / Market Monitor | ⚡ | Amber |
| **Growth** | Performance Analyst | 📊 | Purple |
| **Intel** | Research / Signal Scanner | 🔍 | Red |
| **Observer** | Quality Control | 👁️ | Gray |

## Quick Start

### 1. Install Dependencies

```bash
cd autonomous-trading-company
npm install

cd dashboard
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Initialize Database

```bash
# Using the schema
psql -d trading_company -f database/schema.sql
psql -d trading_company -f database/seeds/01_policies.sql
psql -d trading_company -f database/seeds/02_triggers.sql
psql -d trading_company -f database/seeds/03_relationships.sql
```

### 4. Start Workers

```bash
# Terminal 1: Crypto Worker
npm run worker:crypto

# Terminal 2: Options Worker
npm run worker:options

# Terminal 3: Futures Worker
npm run worker:futures

# Terminal 4: Roundtable Worker
npm run worker:roundtable
```

### 5. Start Dashboard

```bash
npm run dashboard
# Open http://localhost:3000
```

### 6. Run Heartbeat (Manual Test)

```bash
npm run heartbeat
```

## Components

### Integration Layer (`/integration/`)

- **config.ts** - Environment configuration, credentials loading
- **db-adapter.ts** - Real PostgreSQL queries (replaces mocks)
- **heartbeat.ts** - Main 5-minute loop orchestrator

### Workers (`/workers/`)

- **crypto-worker/** - Jupiter API integration (SOL ecosystem)
  - Position size: 0.23 SOL (~$20)
  - Take profit: +30%, Stop loss: -30%
  
- **options-worker/** - Tradier API integration
  - Stop loss: -35%
  - Scaling: 30% / 50% / 75% / 100%
  - 0DTE emergency protocol
  
- **futures-worker/** - Nebula webhook integration
  - **ALWAYS 10 CONTRACTS**
  - Trim 5 at TP1, run 5 to TP2
  - Account: TopstepX

### Dashboard (`/dashboard/`)

- **Office View** - Pixel art trading floor with animated agents
- **Live Feed** - Real-time SSE event stream
- **Mission Board** - Proposals and active/completed missions
- **Memory Wall** - Agent insights, patterns, lessons
- **Stats Panel** - Portfolio value, win rates, positions

### Deployment (`/deploy/`)

- **systemd/** - Service files for VPS deployment
- **docker-compose.yml** - Container orchestration
- **Dockerfile.worker** - Worker container image

## Heartbeat Loop

Every 5 minutes, the heartbeat runs 6 operations (15s budget):

1. **evaluateTriggers()** (4000ms) - Check reactive/proactive triggers
2. **processReactionQueue()** (3000ms) - Handle agent reactions
3. **promoteInsights()** (2000ms) - Elevate high-confidence memories
4. **learnFromOutcomes()** (3000ms) - Extract lessons from trades
5. **recoverStaleSteps()** (2000ms) - Clean up stuck tasks
6. **recoverStaleRoundtables()** (1000ms) - Clean up stuck conversations

## Critical Rules

1. **ALL workers route through proposal-service** - No bypasses
2. **Heartbeat budget: 15 seconds max** - Timeout handling per operation
3. **Workers use atomic claiming** - Prevent duplicate execution
4. **10 CONTRACTS for futures** - Always, no exceptions
5. **Dashboard is LIVE** - Real-time via SSE

## Deployment

### Vercel (Dashboard + Heartbeat Cron)

```bash
cd dashboard
vercel deploy
```

The heartbeat runs via Vercel Cron every 5 minutes.

### VPS (Workers)

```bash
# Copy service files
sudo cp deploy/systemd/*.service /etc/systemd/system/

# Enable and start
sudo systemctl enable crypto-worker options-worker futures-worker roundtable-worker
sudo systemctl start crypto-worker options-worker futures-worker roundtable-worker
```

### Docker Compose

```bash
docker compose up -d
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | SSE stream for live updates |
| `/api/proposals` | GET/POST | List/create proposals |
| `/api/missions` | GET | List missions |
| `/api/conversations` | GET | Conversation history |
| `/api/stats` | GET | Portfolio stats |
| `/api/heartbeat` | GET/POST | Trigger heartbeat |

## Success Criteria

✅ Run heartbeat and see triggers evaluate  
✅ Create a proposal and see it route correctly  
✅ Execute a trade via crypto worker  
✅ See a conversation in the dashboard  
✅ Watch agents learn from a trade outcome  

**If YES to all 5 → SYSTEM LIVE** 🔥

## File Structure

```
autonomous-trading-company/
├── ARCHITECTURE.md           # Full system design
├── README.md                 # This file
├── package.json              # Main project config
├── tsconfig.json             # TypeScript config
├── .env.example              # Environment template
│
├── integration/              # Integration layer
│   ├── config.ts             # Environment config
│   ├── db-adapter.ts         # Database queries
│   ├── heartbeat.ts          # Main heartbeat loop
│   └── index.ts              # Module exports
│
├── workers/                  # Execution workers
│   ├── crypto-worker/        # Jupiter integration
│   ├── options-worker/       # Tradier integration
│   └── futures-worker/       # Nebula integration
│
├── dashboard/                # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx          # Main page
│   │   ├── components/       # React components
│   │   └── api/              # API routes
│   └── vercel.json           # Vercel config
│
├── deploy/                   # Deployment configs
│   ├── systemd/              # Service files
│   ├── docker-compose.yml    # Docker config
│   └── Dockerfile.worker     # Worker image
│
├── core/                     # [Spark 2] Proposal service
├── triggers/                 # [Spark 3] Trigger system
├── events/                   # [Spark 4] Event stream
├── memory/                   # [Spark 5] Learning system
├── roundtable/               # [Spark 6] Conversation orchestrator
└── database/                 # [Spark 1] Schema & migrations
```

## Built With

- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Next.js 14** - Dashboard
- **Tailwind CSS** - Styling
- **Solana/Jupiter** - Crypto trading
- **Tradier** - Options trading
- **Nebula/TopstepX** - Futures trading

---

**Built:** Feb 7, 2026  
**Status:** Ready for deployment 🚀
