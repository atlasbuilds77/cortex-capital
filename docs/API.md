# Cortex Capital API Documentation

**Version:** 1.0  
**Base URL:** `http://localhost:3000` (development)

---

## Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-17T20:25:10.785Z"
}
```

---

### Get User Profile

```http
GET /api/tradier/profile
```

**Description:** Fetch Tradier user profile

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "id-abc123",
    "name": "John Doe",
    "account": {
      "account_number": "6YB12345",
      "classification": "individual",
      "date_created": "2024-01-15T00:00:00.000Z",
      "day_trader": false,
      "option_level": 2,
      "status": "active",
      "type": "margin"
    }
  }
}
```

---

### Get Accounts

```http
GET /api/tradier/accounts
```

**Description:** List all account IDs for authenticated user

**Response:**
```json
{
  "success": true,
  "data": ["6YB12345"]
}
```

---

### Analyze Portfolio

```http
GET /api/portfolio/analyze/:accountId
```

**Description:** Run ANALYST agent on portfolio

**Parameters:**
- `accountId` (string, required): Tradier account ID

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_health": 73,
    "total_value": 52340.0,
    "metrics": {
      "sharpe_ratio": 1.2,
      "beta": 0.95,
      "volatility": 18.4,
      "max_drawdown": -12.3
    },
    "concentration_risk": {
      "top_holding_pct": 22.5,
      "sector_exposure": {
        "tech": 45.0,
        "healthcare": 20.0,
        "finance": 15.0,
        "other": 20.0
      }
    },
    "tax_loss_candidates": [
      {
        "ticker": "ARKK",
        "unrealized_loss": -1200.0
      }
    ],
    "positions": [
      {
        "ticker": "AAPL",
        "shares": 50,
        "value": 8500.0,
        "cost_basis": 7500.0,
        "current_price": 170.0,
        "unrealized_pnl": 1000.0,
        "unrealized_pnl_pct": 13.33
      }
    ]
  }
}
```

**Health Score Calculation:**
- Starts at 100
- Penalized for:
  - Top holding > 20% (−2 per % over)
  - Sector > 40% (−1.5 per % over)
  - Volatility > 25% (−1.5 per % over)
  - Max drawdown < −15% (−2 per % below)
- Bonus for:
  - Sharpe ratio > 1.5 (+10 per point over)

---

### Create User

```http
POST /api/users
```

**Description:** Register new user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secure_password",
  "tier": "scout",
  "risk_profile": "moderate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john@example.com",
    "tier": "scout",
    "risk_profile": "moderate",
    "created_at": "2026-03-17T20:30:00.000Z"
  }
}
```

**Validation:**
- `tier`: 'scout' | 'operator' | 'partner'
- `risk_profile`: 'conservative' | 'moderate' | 'aggressive'

---

### Save Portfolio Snapshot

```http
POST /api/portfolio/snapshot
```

**Description:** Store portfolio state for historical tracking

**Request Body:**
```json
{
  "user_id": "uuid-here",
  "total_value": 52340.0,
  "positions": [...],
  "metrics": {
    "sharpe_ratio": 1.2,
    "beta": 0.95,
    "volatility": 18.4,
    "max_drawdown": -12.3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "snapshot-uuid",
    "created_at": "2026-03-17T20:35:00.000Z"
  }
}
```

---

### Get Portfolio Snapshots

```http
GET /api/portfolio/snapshots/:userId
```

**Description:** Retrieve historical portfolio snapshots

**Parameters:**
- `userId` (string, required): User UUID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "snapshot-uuid-1",
      "snapshot_date": "2026-03-17T20:35:00.000Z",
      "total_value": 52340.0,
      "positions": [...],
      "metrics": {...}
    }
  ]
}
```

**Notes:** Returns last 30 snapshots ordered by date (newest first)

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (validation error)
- `404` - Resource not found
- `500` - Server error

---

## Rate Limiting

**Current:** No rate limiting (MVP)

**Production:** TBD (likely 100 requests/minute per user)

---

## Authentication

**Current:** No authentication (MVP - single test user)

**Phase 2:** JWT-based auth with NextAuth.js

---

## CORS

**Current:** All origins allowed (`origin: true`)

**Production:** Restrict to dashboard domain only

---

## Database Schema Reference

### Users
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
tier VARCHAR(20) NOT NULL -- 'scout' | 'operator' | 'partner'
risk_profile VARCHAR(20) NOT NULL -- 'conservative' | 'moderate' | 'aggressive'
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Brokerage Connections
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
broker VARCHAR(50) NOT NULL -- 'tradier' | 'webull'
credentials_encrypted TEXT NOT NULL -- AES-256 encrypted
connected_at TIMESTAMP DEFAULT NOW()
last_sync TIMESTAMP
```

### Portfolio Snapshots
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
snapshot_date TIMESTAMP DEFAULT NOW()
total_value DECIMAL(15,2)
positions JSONB -- Array of position objects
metrics JSONB -- {sharpe_ratio, beta, volatility, max_drawdown}
created_at TIMESTAMP DEFAULT NOW()
```

### Rebalancing Plans
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
status VARCHAR(20) NOT NULL -- 'pending' | 'approved' | 'rejected' | 'executed'
trades JSONB -- Array of {action, ticker, quantity, reasoning}
created_at TIMESTAMP DEFAULT NOW()
approved_at TIMESTAMP
executed_at TIMESTAMP
```

### Trades
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
plan_id UUID REFERENCES rebalancing_plans(id)
ticker VARCHAR(10) NOT NULL
action VARCHAR(10) NOT NULL -- 'buy' | 'sell'
quantity DECIMAL(15,4)
price DECIMAL(15,2)
executed_at TIMESTAMP DEFAULT NOW()
```

---

## Testing Examples

### Analyze Portfolio (Bash)
```bash
curl -s http://localhost:3000/api/portfolio/analyze/6YB71689 | jq
```

### Create User (Bash)
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "tier": "scout",
    "risk_profile": "moderate"
  }' | jq
```

### Save Snapshot (Bash)
```bash
curl -X POST http://localhost:3000/api/portfolio/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid-here",
    "total_value": 50000,
    "positions": [],
    "metrics": {
      "sharpe_ratio": 1.2,
      "beta": 0.95,
      "volatility": 18,
      "max_drawdown": -10
    }
  }' | jq
```

---

**Last Updated:** 2026-03-17  
**Maintained by:** Atlas (Opus)

---

## Phase 2 Endpoints

### STRATEGIST: Generate Rebalancing Plan

```http
POST /api/strategist/generate-plan
```

**Description:** Generate a rebalancing plan based on user preferences and market conditions

**Request Body:**
```json
{
  "user_id": "uuid-here",
  "account_id": "6YB12345",
  "risk_profile": "moderate",
  "constraints": {
    "never_sell": ["AAPL", "MSFT"],
    "max_position_size": 25,
    "max_sector_exposure": 40
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan_id": "plan_1710700000_abc123",
    "db_id": "uuid-here",
    "status": "pending",
    "trades": [
      {
        "ticker": "NVDA",
        "action": "sell",
        "quantity": 5,
        "reason": "Position size exceeds maximum allowed (30.2% > 25%)",
        "priority": "high"
      }
    ],
    "reasoning": {
      "market_analysis": "Market volatility is medium with neutral economic outlook.",
      "risk_assessment": "Current portfolio health: 65/100. Expected improvement: +10 points.",
      "tax_considerations": "Estimated tax impact: $245.00. 1 tax-loss harvesting opportunities identified.",
      "expected_improvement": "Rebalancing will improve diversification, align with moderate risk profile."
    },
    "estimated_execution_cost": 12.50,
    "estimated_tax_impact": 245.00
  }
}
```

**Validation:**
- `user_id`: UUID required
- `account_id`: Non-empty string required
- `risk_profile`: 'conservative' | 'moderate' | 'aggressive'
- `constraints.never_sell`: Array of ticker strings (optional)
- `constraints.max_position_size`: 1-100 (default: 25)
- `constraints.max_sector_exposure`: 1-100 (default: 40)

---

### STRATEGIST: Get Rebalancing Plans

```http
GET /api/strategist/plans/:userId?status=pending&limit=10
```

**Description:** List rebalancing plans for a user

**Parameters:**
- `userId` (path, required): User UUID
- `status` (query, optional): Filter by status ('pending', 'approved', 'rejected', 'executed')
- `limit` (query, optional): Max results (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "status": "pending",
      "trades": [...],
      "created_at": "2026-03-17T20:30:00.000Z",
      "approved_at": null,
      "executed_at": null
    }
  ]
}
```

---

### EXECUTOR: Execute Trades

```http
POST /api/executor/execute
```

**Description:** Execute an approved rebalancing plan

**Request Body:**
```json
{
  "plan_id": "uuid-here",
  "account_id": "6YB12345",
  "user_id": "uuid-here",
  "dry_run": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_1710700000_abc123",
    "plan_id": "uuid-here",
    "total_trades_requested": 3,
    "total_trades_executed": 3,
    "total_shares_traded": 25,
    "total_value_traded": 4250.00,
    "total_commission": 4.25,
    "total_slippage": 0.0012,
    "execution_time_ms": 3500,
    "summary": {
      "success_rate": 100.0,
      "average_slippage": 0.0004,
      "largest_trade": {...},
      "failed_trades": []
    },
    "results": [
      {
        "trade_id": "order_1710700001_xyz",
        "ticker": "AAPL",
        "action": "buy",
        "requested_quantity": 10,
        "filled_quantity": 10,
        "average_price": 175.25,
        "status": "filled",
        "commission": 1.75,
        "slippage": 0.0003
      }
    ]
  }
}
```

**IMPORTANT:**
- `dry_run: true` (default) simulates execution without placing real orders
- Plan must have status 'approved' to execute
- Idempotency: Same plan cannot be executed twice

---

### REPORTER: Send Email

```http
POST /api/reporter/send-email
```

**Description:** Generate and send an email report

**Request Body:**
```json
{
  "user_id": "uuid-here",
  "email": "user@example.com",
  "name": "John Doe",
  "report_type": "performance",
  "data": {
    "portfolio_report": {...},
    "performance_metrics": {...}
  }
}
```

**Report Types:**
- `performance`: Monthly/weekly performance summary
- `alert`: Portfolio alert (concentration, drawdown, tax-loss)
- `confirmation`: Trade execution confirmation
- `market_update`: Market update newsletter

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": false,
    "email_template": {
      "subject": "Portfolio Performance Report - 03/17/2026",
      "body": "...",
      "html_body": "..."
    },
    "preview": "Dear John Doe, Your portfolio return..."
  }
}
```

**Note:** In MVP, emails are generated but not actually sent. Set `RESEND_API_KEY` for production email delivery.

---

### REPORTER: Get Email Preferences

```http
GET /api/reporter/preferences/:userId
```

**Description:** Get user's email notification preferences

**Response:**
```json
{
  "success": true,
  "data": {
    "report_frequency": "weekly",
    "notification_types": ["trade_execution", "portfolio_alert", "market_update"],
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Error Codes (Phase 2)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| INSUFFICIENT_FUNDS | 400 | Not enough cash for trades |
| TRADE_EXECUTION_ERROR | 400 | Trade execution failed |
| MARKET_CLOSED | 400 | Market is closed |
| UNAUTHORIZED | 401 | Missing or invalid auth |
| FORBIDDEN | 403 | User doesn't own resource |
| NOT_FOUND | 404 | Plan/resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| EXTERNAL_API_ERROR | 502 | Tradier/Resend API error |
| INTERNAL_ERROR | 500 | Unexpected error |
