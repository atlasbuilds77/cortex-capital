# API Routes Testing Checklist

After starting the dev server (`npm run dev`), test these endpoints:

## ✅ Phone Booth
```bash
# Get available agents
curl http://localhost:3000/api/phone-booth/agents

# Chat with an agent
curl -X POST http://localhost:3000/api/phone-booth/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ANALYST","userId":"test","message":"What do you think about NVDA?"}'
```

## ✅ Auth
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Get current user (needs token from login)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ✅ Fishtank
```bash
# Get live data
curl http://localhost:3000/api/fishtank/live

# Get trades
curl http://localhost:3000/api/fishtank/trades

# Get discussions
curl http://localhost:3000/api/fishtank/discussions

# Stream discussions (SSE)
curl http://localhost:3000/api/fishtank/discussions/stream

# Trigger a discussion
curl -X POST http://localhost:3000/api/fishtank/discussions/trigger \
  -H "Content-Type: application/json" \
  -d '{"type":"briefing"}'
```

## ✅ User (requires auth token)
```bash
# Get profile
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Update profile
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"risk_profile":"aggressive"}'

# Update risk profile (onboarding)
curl -X PUT http://localhost:3000/api/profile/select \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"risk_profile":"moderate"}'
```

## ✅ Trade
```bash
# Submit trade signal
curl -X POST http://localhost:3000/api/trade/signal \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TSLA","direction":"long","thesis":"Breakout setup","source":"MOMENTUM","confidence":75}'

# Trigger morning routine
curl -X POST http://localhost:3000/api/trade/morning

# Trigger end of day routine
curl -X POST http://localhost:3000/api/trade/eod
```

---

## Frontend Testing

### Visit these pages in browser:
1. http://localhost:3000/login - Should work
2. http://localhost:3000/signup - Should work
3. http://localhost:3000/dashboard - Should show fishtank data
4. http://localhost:3000/demo/2d - Should show agents and discussions
5. http://localhost:3000/office - Should load 3D office with phone booth

### Check console for errors:
- Open DevTools (F12)
- Look for 404s on `/api/*` endpoints
- Should see NO `localhost:3001` references
- All API calls should be relative (`/api/...`)

---

## Success Criteria

✅ All API endpoints respond (not 404)
✅ No CORS errors in console
✅ No `localhost:3001` references anywhere
✅ Login/signup flow works
✅ Agent chat works in phone booth
✅ Fishtank displays live data
✅ Discussions stream in real-time

---

## If Something Fails

### Check environment variables:
```bash
cat .env.local
```

Should have:
- `DATABASE_URL` (for Postgres)
- `JWT_SECRET` (for auth)
- `ALPACA_API_KEY` (for trading data)
- `ALPACA_SECRET_KEY`

### Check agent files were copied:
```bash
ls lib/agents/
ls agents/souls/
```

### Check for TypeScript errors:
```bash
npm run build
```

### Check logs:
```bash
npm run dev
# Watch the console for errors
```
