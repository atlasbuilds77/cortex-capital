# Cortex Capital - MVP Phase 1 🚀

**"Your Personal Hedge Fund"**

AI-driven portfolio management platform bringing hedge fund strategies to retail investors.

---

## 📊 Phase 1 Deliverables (COMPLETE)

### ✅ Infrastructure
- PostgreSQL database schema (Supabase)
- Fastify TypeScript backend API
- Environment configuration
- Database migrations

### ✅ ANALYST Agent
- Portfolio analysis from Tradier API
- Risk metrics calculation (Sharpe ratio, beta, volatility, max drawdown)
- Concentration risk detection (top holding %, sector exposure)
- Tax-loss harvest candidate identification
- Portfolio health scoring (0-100)

### ✅ Tradier Integration (Read-Only)
- User profile fetching
- Account positions reading
- Balance checking
- Live quote fetching
- Trade history retrieval

### ✅ Basic Dashboard (Next.js)
- Portfolio health overview
- Risk metrics display
- Position breakdown table
- Sector concentration visualization
- Tax-loss harvest alerts

### ✅ Testing & Validation
- Tradier API integration tests
- ANALYST agent unit tests
- Mock portfolio analysis
- API endpoint testing

---

## 🏗️ Tech Stack

**Backend:**
- Node.js + TypeScript
- Fastify (high-performance API)
- PostgreSQL (Supabase)
- Tradier API integration

**Frontend:**
- Next.js 14 (App Router)
- Tailwind CSS
- React 18

**Database:**
- Supabase PostgreSQL
- Tables: users, brokerage_connections, portfolio_snapshots, rebalancing_plans, trades

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd /Users/atlasbuilds/clawd/cortex-capital
npm install

# Frontend
cd dashboard
npm install
```

### 2. Set Up Environment

Copy `.env.example` to `.env` and configure:

```env
# Supabase
SUPABASE_URL=https://lbwbgbujgribraeluzuv.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Tradier API
TRADIER_TOKEN=your_tradier_token_here
TRADIER_BASE_URL=https://api.tradier.com

# Server
PORT=3000
NODE_ENV=development
```

### 3. Set Up Database

Run the SQL migration in Supabase SQL Editor:

```bash
cat migrations/001_initial_schema.sql
```

Copy and execute in Supabase dashboard.

### 4. Start Backend API

```bash
npm run dev
```

API runs on `http://localhost:3000`

### 5. Start Dashboard

```bash
cd dashboard
npm run dev
```

Dashboard runs on `http://localhost:3001`

---

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Tradier Integration
```bash
GET /api/tradier/profile        # Get user profile
GET /api/tradier/accounts       # Get account list
```

### Portfolio Analysis
```bash
GET /api/portfolio/analyze/:accountId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_health": 73,
    "total_value": 52340,
    "metrics": {
      "sharpe_ratio": 1.2,
      "beta": 0.95,
      "volatility": 18.4,
      "max_drawdown": -12.3
    },
    "concentration_risk": {
      "top_holding_pct": 22,
      "sector_exposure": {
        "tech": 45,
        "healthcare": 20,
        "finance": 15
      }
    },
    "tax_loss_candidates": [
      {
        "ticker": "ARKK",
        "unrealized_loss": -1200
      }
    ],
    "positions": [...]
  }
}
```

### User Management
```bash
POST /api/users                 # Create user
POST /api/portfolio/snapshot    # Save portfolio snapshot
GET /api/portfolio/snapshots/:userId  # Get snapshots
```

---

## 🧪 Testing

### Test Tradier Integration
```bash
npm run tsx scripts/test-tradier.ts
```

### Test ANALYST Agent (Mock Data)
```bash
npm run tsx scripts/test-mock-portfolio.ts
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Analyze portfolio
curl http://localhost:3000/api/portfolio/analyze/6YB71689 | jq
```

---

## 🏛️ Database Schema

### Users
```sql
id, email, password_hash, tier, risk_profile, created_at, updated_at
```

### Brokerage Connections
```sql
id, user_id, broker, credentials_encrypted, connected_at, last_sync
```

### Portfolio Snapshots
```sql
id, user_id, snapshot_date, total_value, positions (JSONB), metrics (JSONB)
```

### Rebalancing Plans
```sql
id, user_id, status, trades (JSONB), created_at, approved_at, executed_at
```

### Trades
```sql
id, user_id, plan_id, ticker, action, quantity, price, executed_at
```

---

## 📈 ANALYST Agent

### Metrics Calculated

**Portfolio Health Score (0-100):**
- Penalizes high concentration (>20% single holding)
- Penalizes sector concentration (>40% single sector)
- Penalizes high volatility (>25%)
- Penalizes large drawdowns (< -15%)
- Rewards high Sharpe ratio (>1.5)

**Risk Metrics:**
- Sharpe Ratio: Risk-adjusted return
- Beta: Market correlation
- Volatility: Annual price volatility
- Max Drawdown: Largest portfolio decline

**Concentration Risk:**
- Top holding percentage
- Sector exposure breakdown

**Tax Optimization:**
- Identifies positions with >$500 unrealized loss
- Flags for tax-loss harvesting

### Sector Mapping

Currently supports:
- Tech: AAPL, MSFT, GOOGL, NVDA, TSLA, META, AMZN
- Finance: JPM, BAC, WFC, GS, MS
- Healthcare: JNJ, UNH, PFE, ABBV
- Energy: XOM, CVX, COP

**TODO:** Expand to all S&P 500 + dynamic sector lookup

---

## 🔒 Security

- Brokerage credentials stored encrypted (AES-256)
- Environment variables for sensitive data
- Supabase Row Level Security (RLS) enabled
- Read-only Tradier integration (no trade execution in Phase 1)

---

## 📝 Next Steps (Phase 2)

### Week 5-8: STRATEGIST + EXECUTOR Agents

1. **STRATEGIST Agent:**
   - Target allocation based on risk profile
   - Monthly rebalancing plan generation
   - Sector rotation logic
   - Position sizing optimization

2. **EXECUTOR Agent:**
   - Trade execution (market/limit orders)
   - Order management
   - Execution quality tracking
   - Dividend reinvestment

3. **REPORTER Agent:**
   - Email notifications (trade confirmations)
   - Weekly performance reports
   - Decision reasoning transparency

4. **Enhanced Dashboard:**
   - Rebalancing plan approval flow
   - Trade history view
   - Performance charts
   - User settings (risk profile, constraints)

---

## 🎯 Success Criteria

- [x] Connect Tradier account and fetch positions
- [x] ANALYST generates accurate portfolio metrics
- [x] Dashboard displays portfolio health score
- [x] No errors on real account data (handles empty portfolios)
- [ ] User can approve/reject rebalancing plans (Phase 2)
- [ ] Trade execution working (Phase 2)

---

## 🛠️ Development

### Project Structure
```
cortex-capital/
├── agents/              # AI agents (ANALYST, STRATEGIST, etc)
├── integrations/        # External APIs (Tradier, Supabase)
├── migrations/          # Database schema
├── scripts/             # Testing & utilities
├── dashboard/           # Next.js frontend
├── server.ts            # Fastify API
└── README.md
```

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Consistent naming (camelCase for vars, PascalCase for types)

---

## 📞 Support

**Developer:** Atlas (Subagent)  
**Owner:** Orion (ZeroG Trading / Kronos)  
**Date:** 2026-03-17 12:52 PST  
**Status:** Phase 1 COMPLETE ✅

---

## 📄 License

Proprietary - Kronos / ZeroG Trading

---

**Built with ⚡ by Atlas**
