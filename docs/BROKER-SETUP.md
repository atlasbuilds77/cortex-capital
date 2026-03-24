# Cortex Capital - Broker Setup Guide

## Quick Start

### 1. Alpaca (RECOMMENDED)

**Status:** ✅ Fully Working

**Paper Trading:**
```env
ALPACA_KEY=your_paper_key
ALPACA_SECRET=your_paper_secret
ALPACA_PAPER=true
```

**Live Trading:**
```env
ALPACA_KEY=your_live_key
ALPACA_SECRET=your_live_secret
ALPACA_PAPER=false
```

**Test:**
```bash
curl http://localhost:3001/api/broker/alpaca/account
```

---

### 2. Tradier

**Status:** ✅ Read + Trade Working

```env
TRADIER_TOKEN=your_token
TRADIER_BASE_URL=https://api.tradier.com
TRADIER_ACCOUNT_ID=your_account_id
```

**Sandbox:**
```env
TRADIER_BASE_URL=https://sandbox.tradier.com
```

---

### 3. Robinhood

**Status:** ⚠️ Unofficial API

**WARNINGS:**
- Uses unofficial `robin_stocks` library
- Can break if Robinhood changes their internal API
- Requires storing username/password
- MFA handling is complex

```env
ROBINHOOD_USERNAME=your_email
ROBINHOOD_PASSWORD=your_password
```

**MFA Options:**
1. **SMS/Email:** Must handle interactively
2. **Authenticator App:** Can use TOTP code
3. **Store Session:** First login interactive, then sessions persist

**Test:**
```bash
curl http://localhost:3001/api/broker/robinhood/account
```

---

## Feature Comparison

| Feature | Alpaca | Tradier | Robinhood |
|---------|--------|---------|-----------|
| **API Type** | Official | Official | Unofficial |
| **Stocks** | ✅ | ✅ | ✅ |
| **Options** | ❌ | ✅ | ✅ |
| **Crypto** | ✅ | ❌ | ✅ |
| **Paper Trading** | ✅ Free | ✅ Sandbox | ❌ |
| **Fractional Shares** | ✅ | ❌ | ✅ |
| **OAuth** | ✅ | ✅ | ❌ |
| **Commission** | $0 | $0 | $0 |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Recommendations

1. **For Development/Testing:** Use Alpaca paper trading
2. **For Options Trading:** Use Tradier
3. **For Robinhood Users:** Only if they MUST use Robinhood

---

## Current Configuration

Check `.env` for current broker setup:
```bash
grep -E "ALPACA|TRADIER|ROBINHOOD" .env
```

---

## API Endpoints

### Alpaca
- `GET /api/broker/alpaca/account` - Account info + positions
- `POST /api/execute/trade` - Execute trade (uses Alpaca by default)

### Tradier
- `GET /api/tradier/accounts` - Account list
- `GET /api/tradier/profile` - User profile
- `GET /api/portfolio/analyze/:accountId` - Portfolio analysis

### Robinhood
- `GET /api/broker/robinhood/account` - Account info (requires login)
- `POST /api/broker/robinhood/trade` - Execute trade
