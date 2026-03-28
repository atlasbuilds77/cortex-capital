# Multi-User Portfolio & Tier Gating System

✅ **Complete** - Built 2026-03-27

## What Was Built

### 1. Database Schema
✅ `broker_credentials` table exists (verified)
- Stores encrypted broker tokens per user
- Format: `encrypted_api_key` contains "encrypted:authTag", `encryption_iv` stored separately
- Supports Alpaca and Tradier

### 2. Encryption System
✅ `lib/broker-credentials.ts`
- AES-256-GCM encryption for all broker tokens
- Key derivation via scrypt
- Two formats: compact (single string) and split (DB storage)

### 3. Tier Gating Middleware
✅ `lib/tier-gate.ts`
- 4 tiers: free, recovery, scout, operator
- Permission system with hierarchy
- Middleware wrapper: `requireTier(minTier)`
- Helper: `hasPermission(userTier, permission)`

### 4. Broker OAuth Flow
✅ Complete 3-step OAuth implementation:

**Step 1: Initiate Connection**
- `POST /api/broker/connect`
- Body: `{ broker: "alpaca"|"tradier" }`
- Returns OAuth URL with state = userId
- **Requires operator tier**

**Step 2: OAuth Callback**
- `GET /api/broker/callback?code=...&state=...&broker=...`
- Exchanges code for access token
- Encrypts and stores in database
- Redirects to `/dashboard?broker=connected`

**Step 3: Disconnect**
- `POST /api/broker/disconnect`
- Body: `{ broker: "alpaca"|"tradier" }`
- Deletes credentials from database

### 5. Per-User Portfolio Endpoint
✅ `GET /api/portfolio`
- **Requires recovery tier minimum**
- Operator tier + connected broker → fetches THEIR data
- Everyone else → demo data (shared paper account)
- Supports Alpaca and Tradier
- Returns: equity, cash, buying_power, positions[], broker, account_id, isDemo flag

### 6. Tier Gating Applied
✅ Routes now protected:
- `/api/phone-booth/chat` → scout tier
- `/api/trade/signal` → operator tier
- `/api/broker/connect` → operator tier
- `/api/portfolio` → recovery tier

### 7. Dashboard Integration
✅ `GET /api/fishtank/live`
- If authenticated + broker connected → their real data
- Otherwise → demo data
- Returns: pnl, pnl_pct, total_value, agents_active, trades_today, win_rate, sharpe_ratio, isDemo flag

### 8. Guardian Endpoint
✅ `/api/guardian`
- `GET` → status check
- `POST` → start expiry guardian cron
- Protected by `x-guardian-secret` header

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Critical - rotate in production
BROKER_ENCRYPTION_KEY=your-32-char-key-here

# Alpaca OAuth (get from https://alpaca.markets)
ALPACA_CLIENT_ID=your_client_id
ALPACA_CLIENT_SECRET=your_client_secret
ALPACA_REDIRECT_URI=https://yourdomain.com/api/broker/callback

# Tradier OAuth (get from https://tradier.com)
TRADIER_CLIENT_ID=your_client_id
TRADIER_CLIENT_SECRET=your_client_secret
TRADIER_REDIRECT_URI=https://yourdomain.com/api/broker/callback

# Guardian protection
GUARDIAN_SECRET=your-guardian-secret
```

## User Flow

### Operator Tier User Connects Broker

1. User clicks "Connect Alpaca" in UI
2. Frontend: `POST /api/broker/connect { broker: "alpaca" }`
3. API returns OAuth URL
4. Frontend redirects to OAuth URL
5. User authorizes on Alpaca
6. Alpaca redirects to `/api/broker/callback?code=...&state=userId&broker=alpaca`
7. API exchanges code → encrypts token → stores in DB → redirects to `/dashboard?broker=connected`
8. Dashboard now shows THEIR portfolio

### Portfolio Access

**Recovery/Scout Tier:**
- `GET /api/portfolio` → returns demo data
- `GET /api/fishtank/live` → returns demo data

**Operator Tier (no broker):**
- `GET /api/portfolio` → returns demo data
- `GET /api/fishtank/live` → returns demo data

**Operator Tier (broker connected):**
- `GET /api/portfolio` → returns THEIR real data (isDemo: false)
- `GET /api/fishtank/live` → returns THEIR real data (isDemo: false)

## Tier Permissions

```typescript
free: ['view_discussions', 'view_demo']

recovery: [
  'view_discussions',
  'view_demo',
  'alerts',
  'analytics',
  'view_portfolio' // Demo data only
]

scout: [
  'view_discussions',
  'view_demo',
  'alerts',
  'analytics',
  'view_portfolio',
  'phone_booth', // ← NEW ACCESS
  'signals',
  'priority_support'
]

operator: [
  'view_discussions',
  'view_demo',
  'alerts',
  'analytics',
  'view_portfolio',
  'phone_booth',
  'signals',
  'priority_support',
  'auto_execute', // ← NEW ACCESS
  'broker_connect', // ← NEW ACCESS
  'portfolio_management' // ← NEW ACCESS
]
```

## Security Notes

1. **Encryption Key Rotation:**
   - Change `BROKER_ENCRYPTION_KEY` before production
   - Use 32+ character random string
   - Store securely (env var, not in code)

2. **OAuth Secrets:**
   - Never commit OAuth secrets to repo
   - Rotate if exposed
   - Use different keys for dev/staging/prod

3. **Guardian Secret:**
   - Used to protect guardian cron endpoint
   - Set in cron service (Vercel Cron, external cron)
   - Header: `x-guardian-secret: your-secret`

4. **Token Storage:**
   - All tokens encrypted at rest
   - IV and authTag stored separately for added security
   - No plaintext tokens in database

## Testing

### Test Broker OAuth (Dev)

1. Set up Alpaca Paper OAuth app:
   - Go to https://app.alpaca.markets/paper/developers
   - Create OAuth app
   - Set redirect URI: `http://localhost:3000/api/broker/callback`
   - Copy client ID and secret to `.env.local`

2. Test flow:
   ```bash
   curl -X POST http://localhost:3000/api/broker/connect \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"broker":"alpaca"}'
   ```

3. Visit returned `authUrl` in browser
4. After OAuth → check database for encrypted credentials
5. Test portfolio fetch:
   ```bash
   curl http://localhost:3000/api/portfolio \
     -H "Authorization: Bearer YOUR_JWT"
   ```

### Test Tier Gating

```bash
# Free tier (should fail)
curl -X POST http://localhost:3000/api/phone-booth/chat \
  -H "Authorization: Bearer FREE_USER_JWT" \
  -d '{"agentId":"SAGE","message":"test"}'
# Expected: 403 Insufficient tier

# Scout tier (should succeed)
curl -X POST http://localhost:3000/api/phone-booth/chat \
  -H "Authorization: Bearer SCOUT_USER_JWT" \
  -d '{"agentId":"SAGE","message":"test"}'
# Expected: 200 OK
```

## Next Steps

### Frontend Integration

1. **Settings Page - Connect Broker:**
   ```typescript
   const connectBroker = async (broker: 'alpaca' | 'tradier') => {
     const res = await fetch('/api/broker/connect', {
       method: 'POST',
       headers: { 
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ broker })
     });
     const { authUrl } = await res.json();
     window.location.href = authUrl; // Redirect to OAuth
   };
   ```

2. **Dashboard - Show User Portfolio:**
   ```typescript
   const { data } = useSWR('/api/portfolio', fetcher);
   
   // Show badge if demo
   {data?.isDemo && (
     <Badge variant="warning">Demo Account</Badge>
   )}
   ```

3. **Tier Upgrade Prompt:**
   ```typescript
   const handleFeatureClick = async () => {
     try {
       await fetch('/api/phone-booth/chat', { ... });
     } catch (error) {
       if (error.status === 403) {
         // Show upgrade modal
         showUpgradeModal('scout');
       }
     }
   };
   ```

### Deployment Checklist

- [ ] Rotate `BROKER_ENCRYPTION_KEY` in production
- [ ] Set up Alpaca Live OAuth app (production domain)
- [ ] Set up Tradier OAuth app (production domain)
- [ ] Configure `GUARDIAN_SECRET` for cron
- [ ] Set up Vercel Cron or external cron to call `/api/guardian`
- [ ] Test OAuth flow on staging
- [ ] Test tier gating on staging
- [ ] Monitor encrypted credential storage

## Files Created

```
lib/broker-credentials.ts           # Encryption utilities
lib/tier-gate.ts                    # Tier gating middleware
app/api/broker/connect/route.ts     # OAuth initiation
app/api/broker/callback/route.ts    # OAuth callback handler
app/api/broker/disconnect/route.ts  # Disconnect broker
app/api/portfolio/route.ts          # Per-user portfolio endpoint
app/api/guardian/route.ts           # Guardian cron endpoint
.env.example                        # Environment template
TIER-GATING-SETUP.md               # This file
```

## Files Modified

```
app/api/phone-booth/chat/route.ts   # Added scout tier requirement
app/api/trade/signal/route.ts       # Added operator tier requirement
app/api/fishtank/live/route.ts      # Per-user portfolio integration
```

---

**Status:** ✅ Ready for frontend integration and deployment

**Built:** 2026-03-27
**By:** Atlas (Subagent)
