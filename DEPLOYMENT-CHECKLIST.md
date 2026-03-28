# Tier Gating System - Deployment Checklist

## Pre-Deployment (Dev Environment)

- [x] Database table created (`broker_credentials`)
- [x] All API routes implemented
- [x] Encryption system tested
- [x] Tier gating middleware functional
- [x] Build passes (`npm run build`)
- [x] Verification script passes (`npx tsx scripts/verify-tier-system.ts`)

## Security Setup (CRITICAL)

### 1. Encryption Key Rotation
- [ ] Generate new 32+ character encryption key
- [ ] Store in production environment variables
- [ ] **NEVER commit to git**
```bash
# Generate key
openssl rand -base64 32
# Set in Vercel/production
BROKER_ENCRYPTION_KEY=<generated_key>
```

### 2. JWT Secret Rotation
- [ ] Generate new JWT secret for production
- [ ] Different from dev/staging
```bash
JWT_SECRET=<production_secret>
```

### 3. Guardian Secret
- [ ] Generate guardian cron secret
- [ ] Share with cron service only
```bash
GUARDIAN_SECRET=<guardian_secret>
```

## OAuth App Setup

### Alpaca (Production)
- [ ] Create OAuth app at https://alpaca.markets/developers
- [ ] Set redirect URI: `https://yourdomain.com/api/broker/callback`
- [ ] Copy client ID and secret to env vars
```bash
ALPACA_CLIENT_ID=...
ALPACA_CLIENT_SECRET=...
ALPACA_REDIRECT_URI=https://yourdomain.com/api/broker/callback
```

### Tradier (Production)
- [ ] Create OAuth app at https://tradier.com/api/developers
- [ ] Set redirect URI: `https://yourdomain.com/api/broker/callback`
- [ ] Copy client ID and secret to env vars
```bash
TRADIER_CLIENT_ID=...
TRADIER_CLIENT_SECRET=...
TRADIER_REDIRECT_URI=https://yourdomain.com/api/broker/callback
```

## Database Verification

- [ ] Verify `broker_credentials` table exists in production DB
- [ ] Run migration if needed:
```bash
DATABASE_URL=<prod_url> npx tsx scripts/setup-broker-table.ts
```

## Environment Variables (Vercel)

Set these in Vercel dashboard → Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=<production_secret>
BROKER_ENCRYPTION_KEY=<32_char_key>
GUARDIAN_SECRET=<guardian_secret>

# Alpaca OAuth
ALPACA_CLIENT_ID=...
ALPACA_CLIENT_SECRET=...
ALPACA_REDIRECT_URI=https://yourdomain.com/api/broker/callback

# Tradier OAuth
TRADIER_CLIENT_ID=...
TRADIER_CLIENT_SECRET=...
TRADIER_REDIRECT_URI=https://yourdomain.com/api/broker/callback

# Demo Alpaca (Paper account for fallback)
ALPACA_API_KEY=PKXPAHHSVOFCAXOXINQXP6UXST
ALPACA_SECRET_KEY=4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV
```

## Cron Setup (Expiry Guardian)

### Option A: Vercel Cron
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/guardian",
      "schedule": "*/15 9-16 * * 1-5"
    }
  ]
}
```

### Option B: External Cron
Set up cron to call:
```bash
curl -X POST https://yourdomain.com/api/guardian \
  -H "x-guardian-secret: YOUR_SECRET"
```
Schedule: Every 15 minutes, 9:30 AM - 4:00 PM ET, weekdays

## Deployment Steps

1. **Staging First**
   - [ ] Deploy to staging environment
   - [ ] Test OAuth flow end-to-end
   - [ ] Test tier gating (all 4 tiers)
   - [ ] Test portfolio endpoint (demo + real data)
   - [ ] Verify encryption/decryption works
   - [ ] Check guardian endpoint

2. **Production Deploy**
   - [ ] Set all production env vars
   - [ ] Deploy to production
   - [ ] Smoke test: health check
   - [ ] Test OAuth with test account
   - [ ] Monitor logs for errors

3. **Post-Deploy Verification**
   - [ ] Test broker connection flow
   - [ ] Verify encrypted tokens in database
   - [ ] Test portfolio fetch (real vs demo)
   - [ ] Check guardian cron runs
   - [ ] Monitor Sentry/error tracking

## Frontend Integration Checklist

- [ ] "Connect Broker" button added to settings
- [ ] OAuth redirect handling on `/api/broker/callback`
- [ ] Tier badges shown on restricted features
- [ ] Upgrade prompts for insufficient tier
- [ ] Portfolio page shows `isDemo` flag
- [ ] Real-time portfolio updates for connected users

## Testing Checklist

### Tier Gating
- [ ] Free user blocked from scout features
- [ ] Scout user blocked from operator features
- [ ] Operator user can access all features
- [ ] 403 responses include tier upgrade info

### OAuth Flow
- [ ] Alpaca OAuth works end-to-end
- [ ] Tradier OAuth works end-to-end
- [ ] Tokens encrypted in database
- [ ] Disconnect removes credentials
- [ ] Re-connect updates existing credentials

### Portfolio Data
- [ ] Unauthenticated users see demo data
- [ ] Recovery/scout users see demo data
- [ ] Operator users (no broker) see demo data
- [ ] Operator users (broker connected) see real data
- [ ] Dashboard reflects real vs demo correctly

### Security
- [ ] No plaintext tokens in database
- [ ] Encryption key not in code/git
- [ ] OAuth secrets not exposed
- [ ] Guardian endpoint requires secret

## Monitoring

Set up alerts for:
- [ ] OAuth failures (Sentry/DataDog)
- [ ] Encryption errors
- [ ] Tier gating 403s (spike detection)
- [ ] Portfolio fetch failures
- [ ] Guardian cron failures

## Rollback Plan

If issues arise:
1. **OAuth Issues:**
   - Disable "Connect Broker" button in frontend
   - All users fall back to demo data

2. **Encryption Issues:**
   - Check `BROKER_ENCRYPTION_KEY` in env
   - Verify DB schema matches code

3. **Tier Gating Issues:**
   - Temporarily remove tier gates (comment out `requireTier`)
   - Deploy hotfix with tier gates disabled
   - Fix underlying issue
   - Redeploy with tier gates enabled

## Documentation

- [x] `TIER-GATING-SETUP.md` - Full system docs
- [x] `SUBAGENT-SUMMARY.md` - Quick summary
- [x] `.env.example` - Environment template
- [x] `DEPLOYMENT-CHECKLIST.md` - This file

## Support Contact

If issues arise during deployment:
- Review logs in Vercel dashboard
- Check database connection
- Verify environment variables
- Test OAuth apps in sandbox mode first

---

**Ready for deployment:** When all checkboxes above are completed ✅

**Last updated:** 2026-03-27
