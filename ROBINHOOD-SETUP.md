# Robinhood Integration Setup

## Overview
Cortex Capital uses **robin_stocks** - the most popular Python library for Robinhood trading.

- **Library:** [robin_stocks](https://robin-stocks.readthedocs.io/)
- **PyPI:** https://pypi.org/project/robin-stocks/
- **GitHub:** https://github.com/jmfernandes/robin_stocks

## Installation

### 1. Install robin_stocks
```bash
pip3 install robin-stocks
```

### 2. Test Login
```bash
python3 -c "
import robin_stocks.robinhood as r
r.login('YOUR_USERNAME', 'YOUR_PASSWORD')
print('Login successful!')
"
```

## How It Works

### Authentication
Cortex stores Robinhood credentials in `broker_credentials` table:
- `encrypted_api_key` = Robinhood username
- `encrypted_api_secret` = Robinhood password (encrypted)
- `broker_type` = 'robinhood'

### Position Fetching
```typescript
const data = await robinhood.getPositions(username, password);
// Returns: { positions: [...], balance: {...} }
```

Uses `r.build_holdings()` and `r.load_account_profile()` from robin_stocks.

### Order Execution
```typescript
const result = await robinhood.placeOrder(username, password, {
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  type: 'market'
});
```

Uses `r.order_market_buy()` / `r.order_market_sell()` from robin_stocks.

## MFA (Two-Factor Authentication)

If you have MFA enabled on Robinhood:

```python
import robin_stocks.robinhood as r

# Robinhood will send SMS code
r.login('username', 'password')
# Enter code when prompted
```

For automated trading with MFA, you'll need to:
1. Store MFA secret during initial login
2. Generate TOTP codes programmatically
3. Or disable MFA (not recommended)

## Credential Storage

**When user connects Robinhood:**
```sql
INSERT INTO broker_credentials (
  user_id,
  broker_type,
  encrypted_api_key,    -- Username (encrypted)
  encrypted_api_secret, -- Password (encrypted with AES-256-GCM)
  encryption_iv,
  is_active
) VALUES (
  'user_id',
  'robinhood',
  encrypt(username),
  encrypt(password),
  iv,
  true
);
```

## Supported Operations

✅ **Get Positions** - `r.build_holdings()`
✅ **Get Account** - `r.load_account_profile()`
✅ **Market Orders** - `r.order_market_buy()` / `r.order_market_sell()`
✅ **Limit Orders** - `r.order_limit_buy()` / `r.order_limit_sell()`
✅ **Get Quotes** - `r.get_latest_price()`

⚠️ **Options Trading** - Supported but requires additional setup
⚠️ **Crypto** - robin_stocks has crypto support via `robin_stocks.crypto`

## Error Handling

Common errors:
- **Invalid credentials** - Check username/password
- **MFA required** - Need to handle 2FA flow
- **Rate limiting** - Robinhood may throttle API calls
- **Account locked** - Too many failed login attempts

## Security Notes

1. **Never store plaintext passwords** - Always encrypt with AES-256-GCM
2. **Use environment variables** for credentials during testing
3. **Implement rate limiting** to avoid Robinhood API bans
4. **Log all trades** for audit trail
5. **Handle MFA properly** - Don't skip 2FA for convenience

## Testing

Test Robinhood integration:
```bash
cd ~/clawd/cortex-capital

# Test login
node -e "
const rh = require('./integrations/robinhood');
rh.default.login({ username: 'test', password: 'test' })
  .then(r => console.log('Result:', r));
"

# Test positions
node -e "
const rh = require('./integrations/robinhood');
rh.default.getPositions('username', 'password')
  .then(d => console.log(JSON.stringify(d, null, 2)));
"
```

## Production Checklist

- [ ] robin_stocks installed (`pip3 install robin-stocks`)
- [ ] Python 3.x available on server
- [ ] Credentials properly encrypted in database
- [ ] MFA flow handled (if enabled)
- [ ] Rate limiting implemented
- [ ] Error logging configured
- [ ] Trade history logging enabled
- [ ] Tested with paper money first

## Links

- **Documentation:** https://robin-stocks.readthedocs.io/
- **GitHub Issues:** https://github.com/jmfernandes/robin_stocks/issues
- **AlgoTrading101 Guide:** https://algotrading101.com/learn/robinhood-api-guide/

---

**Status:** ✅ Integrated
**Library:** robin_stocks (Python)
**Maintained:** Yes (active development)
**Used By:** Thousands of algo traders
