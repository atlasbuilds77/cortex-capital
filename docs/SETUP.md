# Cortex Capital - Setup Guide

**Complete setup instructions for Phase 1 MVP**

---

## Prerequisites

1. **Node.js** (v18+)
2. **npm** (v9+)
3. **Supabase account** (free tier works)
4. **Tradier account** (sandbox or live)

---

## Step 1: Clone & Install

```bash
cd /Users/atlasbuilds/clawd/cortex-capital

# Install backend dependencies
npm install

# Install frontend dependencies
cd dashboard
npm install
cd ..
```

---

## Step 2: Set Up Supabase

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project (free tier)
3. Copy your project URL and anon key
4. Save these for `.env` configuration

### Run Database Migration

1. Open Supabase dashboard
2. Navigate to SQL Editor
3. Copy contents of `migrations/001_initial_schema.sql`
4. Paste and execute

**Or use psql:**
```bash
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[REGION].supabase.co:5432/postgres" \
  < migrations/001_initial_schema.sql
```

### Verify Tables Created

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected output:
- users
- brokerage_connections
- portfolio_snapshots
- rebalancing_plans
- trades

---

## Step 3: Get Tradier API Token

### Sandbox (Testing)
1. Sign up at [developer.tradier.com](https://developer.tradier.com)
2. Create sandbox application
3. Copy access token
4. **Base URL:** `https://sandbox.tradier.com`

### Live (Production)
1. Open Tradier brokerage account
2. Go to Settings → API Access
3. Generate personal access token
4. **Base URL:** `https://api.tradier.com`

**Note:** Use Aman's token for testing (has positions):
```
Token: madEKNKYeffHuxcHfBGoZSIKXywO
Account: 6YB71689
```

---

## Step 4: Configure Environment

### Backend (.env)

Create `/Users/atlasbuilds/clawd/cortex-capital/.env`:

```env
# Supabase
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Tradier API
TRADIER_TOKEN=your_tradier_token_here
TRADIER_BASE_URL=https://api.tradier.com
TRADIER_ACCOUNT_ID=6YB71689

# Encryption
ENCRYPTION_KEY=cortex_capital_2026_encryption

# Server
PORT=3000
NODE_ENV=development

# Auth (placeholder for MVP)
JWT_SECRET=cortex_jwt_secret_2026
```

### Frontend (.env.local)

Create `dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Step 5: Start Services

### Terminal 1: Backend API

```bash
cd /Users/atlasbuilds/clawd/cortex-capital
npm run dev
```

**Expected output:**
```
🚀 Cortex Capital API running on http://localhost:3000
[INFO] Server listening at http://127.0.0.1:3000
```

**Test:**
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-03-17T20:25:10.785Z"}
```

### Terminal 2: Frontend Dashboard

```bash
cd /Users/atlasbuilds/clawd/cortex-capital/dashboard
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3001
- Network:      http://192.168.x.x:3001
```

**Open:** http://localhost:3001

---

## Step 6: Test Integration

### Test Tradier Connection

```bash
cd /Users/atlasbuilds/clawd/cortex-capital
npm run tsx scripts/test-tradier.ts
```

**Expected output:**
```
🔬 Testing Tradier API integration...

1️⃣ Fetching user profile...
✅ Profile: { id: 'id-xxx', name: 'aman patel', account_number: '6YB71689' }

2️⃣ Fetching accounts...
✅ Accounts: [ '6YB71689' ]

...

🎉 All tests passed!
```

### Test ANALYST Agent (Mock Data)

```bash
npm run tsx scripts/test-mock-portfolio.ts
```

**Expected output:**
```
🧪 Mock Portfolio Analysis

{
  "portfolio_health": 15,
  "total_value": 55500,
  ...
}

✅ ANALYST agent logic validated with mock data
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get Tradier profile
curl http://localhost:3000/api/tradier/profile | jq

# Analyze portfolio
curl http://localhost:3000/api/portfolio/analyze/6YB71689 | jq
```

---

## Step 7: Use Dashboard

1. Open http://localhost:3001
2. Enter Tradier account ID: `6YB71689`
3. Click "Analyze Portfolio"
4. View portfolio health score, metrics, positions

**Accounts to test:**
- Aman: `6YB71689` (has cash balance)
- Carlos: `6YB71747` (has cash balance)
- Rohrz: `6YB72868` (may have positions)

---

## Troubleshooting

### Error: "No positions found in account"

**Cause:** Account is 100% cash (no stock positions)

**Fix:** Account will show health score 100 with all-cash allocation. This is normal for empty accounts.

### Error: "TRADIER_TOKEN not set in environment"

**Cause:** Missing `.env` file or token not set

**Fix:** 
1. Create `.env` in project root
2. Add `TRADIER_TOKEN=your_token_here`
3. Restart backend API

### Error: "Cannot connect to database"

**Cause:** Invalid Supabase credentials

**Fix:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check project is active in Supabase dashboard
3. Ensure tables were created (run migration)

### Dashboard shows "Failed to fetch"

**Cause:** Backend API not running or CORS issue

**Fix:**
1. Ensure backend is running on port 3000
2. Check console for errors
3. Verify `NEXT_PUBLIC_API_URL` in `.env.local`

### API returns 500 error

**Cause:** Server-side error (check backend logs)

**Fix:**
1. Check backend terminal for error stack trace
2. Verify database connection
3. Ensure Tradier token is valid
4. Check account ID exists

---

## Development Workflow

### Recommended Setup

**Terminal 1:** Backend API
```bash
cd /Users/atlasbuilds/clawd/cortex-capital
npm run dev
```

**Terminal 2:** Frontend Dashboard
```bash
cd /Users/atlasbuilds/clawd/cortex-capital/dashboard
npm run dev
```

**Terminal 3:** Testing/Scripts
```bash
cd /Users/atlasbuilds/clawd/cortex-capital
# Run tests, execute scripts, etc
```

### Hot Reload

Both backend and frontend support hot reload:
- Backend: `tsx watch` auto-reloads on file changes
- Frontend: Next.js fast refresh

### Logging

**Backend logs:**
- All HTTP requests (Fastify logger)
- Database queries (custom query logger)
- Errors with stack traces

**Frontend logs:**
- Browser console (React errors)
- Network tab (API calls)

---

## Next Steps (After Setup)

1. ✅ Verify Tradier integration works
2. ✅ Test ANALYST agent with real account
3. ✅ View portfolio in dashboard
4. 🔜 Create test user in database
5. 🔜 Save portfolio snapshots
6. 🔜 Build STRATEGIST agent (Phase 2)
7. 🔜 Build EXECUTOR agent (Phase 2)

---

## Production Deployment (Future)

### Backend (Render / Railway)

1. Create new web service
2. Connect GitHub repo
3. Set environment variables
4. Deploy

### Frontend (Vercel)

1. Import Next.js project
2. Set `NEXT_PUBLIC_API_URL` to backend URL
3. Deploy

### Database (Supabase)

Already hosted - no changes needed

---

## Security Checklist

- [x] Database credentials in environment variables
- [x] Tradier token encrypted in transit (HTTPS)
- [x] Supabase Row Level Security (RLS) enabled
- [ ] User password hashing (bcrypt - Phase 2)
- [ ] JWT authentication (Phase 2)
- [ ] API rate limiting (Phase 2)
- [ ] Input validation on all endpoints (Phase 2)

---

## Support

**Issues?** Check:
1. This guide (SETUP.md)
2. API documentation (docs/API.md)
3. README.md for architecture overview
4. credentials.json for Tradier tokens

**Still stuck?** Contact Atlas (subagent) or Orion (owner)

---

**Setup Guide Version:** 1.0  
**Last Updated:** 2026-03-17  
**Author:** Atlas (Subagent)
