# PRE-FLIGHT CHECKLIST - Cortex Capital
**Before you go live on Render**

## ✅ What's Ready

### Code
- [x] Backend serves frontend (unified deployment)
- [x] Auth system (signup, login, JWT)
- [x] Database migrations (password_hash, discord_id)
- [x] Discord Singularity tier override
- [x] Demo user with live Alpaca data
- [x] Fishtank real-time updates
- [x] Static export (Next.js → HTML)
- [x] Pushed to GitHub (atlasbuilds77/cortex-capital)

### Database
- [x] Render PostgreSQL running
- [x] 5 tables created (users, broker_credentials, portfolio_discussions, trades, positions)
- [x] Schema updated (password_hash, discord_id columns)
- [x] Demo user exists (8fc842af-fdbb-46b8-a800-0b3bd1d8d757)
- [x] Test user exists (hunter@test.com)

### Features Working Locally
- [x] Signup creates account
- [x] Login authenticates
- [x] Fishtank shows Alpaca demo data
- [x] Backend API responding
- [x] Frontend builds successfully

---

## 🚀 Deployment Steps (When Home)

### 1. Create Render Web Service

1. Go to: https://dashboard.render.com
2. Click: **New +** → **Web Service**
3. Connect repository: `atlasbuilds77/cortex-capital`
4. Settings:
   - **Name:** `cortex-capital`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Root Directory:** `./`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && cd frontend && npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Starter ($7/mo)` or `Free`

### 2. Add Environment Variables

Click "Advanced" → "Add Environment Variable"

**Required:**
```
DATABASE_URL=postgresql://cortex_capital_user:0IuRjWY7G7JwMmqak0x1m3VC5xqssYe1@dpg-d6vcdsqa214c7387nuu0-a.oregon-postgres.render.com/cortex_capital

JWT_SECRET=(click "Generate" button)

ENCRYPTION_KEY=2e3e0a8e18c0f9ee3cdeb4a90e7f18ec25e6f8b774aeba3e78d1bbbe87285b8a

NODE_ENV=production

PORT=3001
```

**Alpaca (demo):**
```
ALPACA_API_KEY=PKXPAHHSVOFCAXOXINQXP6UXST

ALPACA_SECRET_KEY=4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV

ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

**DeepSeek (agents):**
```
DEEPSEEK_API_KEY=sk-b6ac14a09f9f43c0b6be5fda2c78f3e1
```

**Optional (scheduler):**
```
ENABLE_SCHEDULER=true
```

### 3. Deploy

1. Click: **Create Web Service**
2. Wait 5-10 minutes for build
3. Render URL: `https://cortex-capital.onrender.com`

---

## 🧪 Testing Flow (When Deployed)

### Test 1: Health Check
```bash
curl https://cortex-capital.onrender.com/health
```
Expected: `{"status":"ok"}`

### Test 2: Homepage
Visit: `https://cortex-capital.onrender.com`

Should see:
- Cortex Capital branding
- Pricing tiers (Free, Recovery, Scout, Operator, Partner)
- "Try Demo" button
- "Get Started" button

### Test 3: Signup Flow
1. Visit: `https://cortex-capital.onrender.com/signup`
2. Enter email + password
3. Click "Create Account"
4. Should redirect to `/onboarding`
5. Check JWT token in localStorage

### Test 4: Login Flow
1. Visit: `https://cortex-capital.onrender.com/login`
2. Enter same email + password
3. Click "Log In"
4. Should redirect to `/dashboard`
5. Verify token persists

### Test 5: Demo Fishtank
1. Visit: `https://cortex-capital.onrender.com/fishtank`
2. Should see:
   - Portfolio value ($99,214)
   - P&L (+$351)
   - Stats (7 agents, 8 trades, 87.5% win rate)
   - Activity feed
   - Live Alpaca data

### Test 6: Discord Singularity
```bash
curl https://cortex-capital.onrender.com/api/discord/check/1070789896204550174
```
Expected: `{"isSingularity":true,"tier":"partner"}`

---

## 📝 What to Check

### UI/UX
- [ ] Homepage loads fast
- [ ] Pricing cards display correctly
- [ ] "Try Demo" button works
- [ ] Login/signup forms work
- [ ] Redirects work correctly
- [ ] Mobile responsive

### Data
- [ ] Demo fishtank shows real Alpaca positions
- [ ] P&L updates correctly
- [ ] Activity feed shows recent trades
- [ ] Stats calculate properly

### Auth
- [ ] Signup creates user in database
- [ ] Login returns JWT token
- [ ] Token persists in localStorage
- [ ] Protected routes check token

### Performance
- [ ] Pages load < 2 seconds
- [ ] API responses < 500ms
- [ ] No console errors
- [ ] Images load properly

---

## 🐛 Common Issues & Fixes

### Build fails
**Error:** `npm install` fails
**Fix:** Check package.json dependencies, ensure all are listed

**Error:** Frontend build fails
**Fix:** Check frontend/package.json, ensure Next.js config is correct

### Frontend 404
**Error:** All routes return 404
**Fix:** Verify `frontend/out/` directory exists after build

### API calls fail
**Error:** CORS errors
**Fix:** Check CORS settings in server.ts, ensure origin matches

**Error:** 500 errors
**Fix:** Check Render logs for actual error

### Database connection fails
**Error:** "connection refused"
**Fix:** Verify DATABASE_URL has correct SSL settings

---

## 🔍 Where to Check Logs

**Render Dashboard:**
- Logs tab (real-time)
- Events tab (deploy history)
- Metrics tab (CPU/memory)

**Browser DevTools:**
- Console tab (JS errors)
- Network tab (API calls)
- Application tab (localStorage, JWT tokens)

---

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ Homepage loads with branding + pricing
2. ✅ Signup creates account (check database)
3. ✅ Login works (JWT token in localStorage)
4. ✅ Demo fishtank shows live Alpaca data
5. ✅ P&L updates correctly
6. ✅ No console errors
7. ✅ Mobile works
8. ✅ Discord Singularity gets Partner tier

---

## 📊 What Orion Needs to Test

### Full User Flow
1. Visit homepage
2. Click "Get Started"
3. Create account
4. Go through onboarding
5. Connect broker (skip for now)
6. Visit fishtank
7. See your own data (not demo)

### Edge Cases
- Try invalid login
- Try duplicate signup
- Try accessing /fishtank without login
- Try weak password
- Try malformed email

### Mobile
- Open on phone
- Test signup
- Test login
- Test fishtank scrolling
- Test responsive pricing cards

---

## 🚨 Things NOT Built Yet (Known TODOs)

- [ ] Onboarding flow (connects to signup but not functional)
- [ ] Broker OAuth (Robinhood, Tradier)
- [ ] Stripe checkout (tier upgrades)
- [ ] Email alerts (Recovery tier)
- [ ] Approval UI (Operator tier)
- [ ] Password reset
- [ ] Email verification
- [ ] Profile settings

These are EXPECTED gaps - not bugs. Document any others you find.

---

## 💰 Cost Estimate

**Monthly:**
- Web Service: $7 (Starter) or $0 (Free tier)
- Database: $7 (already deployed)
- **Total:** ~$14/month

**Per-Use:**
- Alpaca: Free (paper trading)
- DeepSeek: ~$5-20/month (based on usage)

---

## 🎬 Ready to Deploy?

1. Go to Render Dashboard
2. Follow steps above
3. Deploy
4. Test everything
5. Document issues
6. We'll fix tomorrow

**Deployment time:** ~10 minutes
**Testing time:** ~30 minutes

---

**Last updated:** 2026-03-24 17:00 PST
**Status:** Code ready, waiting for deployment
**Next:** Deploy to Render, test full flow, document issues

