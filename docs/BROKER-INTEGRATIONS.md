# Cortex Capital - Broker Integrations

## Current Status

| Broker | Read Data | Place Orders | Paper Trading | OAuth | Status |
|--------|-----------|--------------|---------------|-------|--------|
| **Tradier** | ✅ | ⚠️ Code exists | ✅ Sandbox | ✅ | Ready |
| **Alpaca** | ❌ | ❌ | ✅ Free | ✅ | TODO |
| **Webull** | ❌ | ❌ | ❌ | ❌ | Q1 2026 |
| **Robinhood** | ❌ | ❌ | ❌ | ❌ | Unofficial only |
| **IBKR** | ❌ | ❌ | ✅ | ❌ | Complex |

---

## Priority 1: Tradier Paper Trading

### Sandbox Setup
- **Sandbox Base URL:** `https://sandbox.tradier.com`
- **Paper Account:** Free signup at https://developer.tradier.com
- **API is identical** - just different base URL

### Implementation Steps
1. Add `TRADIER_SANDBOX_TOKEN` to .env
2. Add `TRADIER_USE_SANDBOX=true` flag
3. Execute trades against sandbox
4. Track P&L in our database

---

## Priority 2: Alpaca (Best for Paper Trading)

### Why Alpaca First
- **Free paper trading** with $100K virtual cash
- **Simple OAuth** flow
- **Modern REST API** 
- **Supports stocks AND crypto**
- **No minimum balance**

### API Endpoints
- Base: `https://paper-api.alpaca.markets` (paper)
- Base: `https://api.alpaca.markets` (live)

### Required Scopes
- `account:read` - View account info
- `trading` - Place orders
- `data` - Market data

### Implementation
```typescript
// integrations/alpaca.ts
const ALPACA_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET = process.env.ALPACA_SECRET;
const ALPACA_BASE = process.env.ALPACA_PAPER === 'true' 
  ? 'https://paper-api.alpaca.markets'
  : 'https://api.alpaca.markets';
```

---

## Implementation Plan

### Phase 1: Paper Trading Infrastructure (Today)
1. [x] DRY_RUN mode for simulated trades
2. [ ] Tradier sandbox integration
3. [ ] Alpaca paper trading integration
4. [ ] Trade logging to database
5. [ ] P&L tracking

### Phase 2: Order Execution (This Week)
1. [ ] Market orders
2. [ ] Limit orders
3. [ ] Stop orders
4. [ ] Options orders (Tradier only)
5. [ ] Position tracking

### Phase 3: OAuth Flows (Next Week)
1. [ ] Tradier OAuth callback
2. [ ] Alpaca OAuth callback
3. [ ] Token encryption/storage
4. [ ] Multi-account support

---

## Broker Feature Matrix

| Feature | Tradier | Alpaca | Webull | IBKR |
|---------|---------|--------|--------|------|
| Stocks | ✅ | ✅ | ✅ | ✅ |
| Options | ✅ | ❌ | ✅ | ✅ |
| Crypto | ❌ | ✅ | ✅ | ✅ |
| LEAPS | ✅ | ❌ | ✅ | ✅ |
| Paper Trading | ✅ | ✅ | ❌ | ✅ |
| Free Data | ✅ | ✅ | ❌ | ❌ |
| Commission | $0 | $0 | $0 | $0* |

*IBKR has minimums

---

## Recommendation

**Start with Alpaca for paper trading:**
- Free, instant setup
- Great API
- Perfect for testing the system

**Use Tradier for options:**
- Only broker with good options API
- Sandbox available

**Skip Webull/Robinhood for now:**
- No official API yet
- Unofficial = risk of breaking
