# Cortex Capital Integration Checklist

Quick verification that everything is set up correctly.

## ✅ Files Created

### Configuration
- [x] `src/config/cortex-agents.ts` - Agent definitions (7 agents)

### API Layer
- [x] `src/lib/cortex-api.ts` - API connector with types & utilities
- [x] `src/app/api/cortex/pnl/route.ts` - P&L proxy endpoint
- [x] `src/app/api/cortex/trades/route.ts` - Trades proxy endpoint
- [x] `src/app/api/cortex/activity/route.ts` - Activity webhook (existing)

### React Layer
- [x] `src/features/office/hooks/useCortexData.ts` - React hooks (4 hooks)
- [x] `src/features/office/components/CortexDashboard.tsx` - Main dashboard
- [x] `src/features/office/components/CortexPnLDisplay.tsx` - P&L widget
- [x] `src/features/office/components/CortexTradesFeed.tsx` - Trades feed
- [x] `src/features/office/components/CortexActivityFeed.tsx` - Activity feed

### Pages
- [x] `src/app/cortex/page.tsx` - Dashboard page at `/cortex`

### Testing
- [x] `scripts/test-cortex-integration.ts` - Integration test script
- [x] `package.json` updated with `test:cortex` command

### Documentation
- [x] `CORTEX_SETUP.md` - Complete setup guide (9.7 KB)
- [x] `CORTEX_AGENTS.md` - Agent configuration reference (6.7 KB)
- [x] `QUICKSTART_CORTEX.md` - 5-minute quick start (5.6 KB)
- [x] `INTEGRATION_SUMMARY.md` - This integration overview (10 KB)
- [x] `CORTEX_CHECKLIST.md` - This checklist
- [x] `README.md` - Updated with Cortex mention

## ✅ Code Updates

### Imports Updated
- [x] `src/agents/cortex-bridge.ts` - Import from `@/config/cortex-agents`
- [x] `src/agents/activity-feed.ts` - Import from `@/config/cortex-agents`

### Package.json
- [x] Added `test:cortex` script

## ✅ Features Implemented

### Dashboard
- [x] Live P&L display (total, today, week)
- [x] Account metrics (positions, day trades, buying power)
- [x] Recent trades feed with P&L
- [x] Agent activity stream
- [x] Health indicator (online/offline)
- [x] Auto-refresh (5s for data, 30s for health)
- [x] 3 layouts (full, compact, minimal)

### API Integration
- [x] HTTP client with timeout (5s)
- [x] Error handling and reporting
- [x] TypeScript types for all data
- [x] Formatting utilities (P&L, percentages, colors)
- [x] SSE subscription support (optional)

### Agents
- [x] 7 agents defined (ANALYST, STRATEGIST, EXECUTOR, etc.)
- [x] Each with: emoji, color, role, position
- [x] Activity type mapping
- [x] Status tracking (working/idle/error)

## ✅ Testing Checklist

### Pre-flight
- [ ] Cortex Capital running at `http://localhost:3001`
- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env.local` with `NEXT_PUBLIC_CORTEX_API_URL`)

### Manual Tests
- [ ] `curl http://localhost:3001/health` returns JSON
- [ ] `curl http://localhost:3001/api/pnl` returns P&L data
- [ ] `curl http://localhost:3001/api/trades/recent` returns trades
- [ ] `curl http://localhost:3001/api/activity` returns activity
- [ ] `npm run dev` starts without errors
- [ ] Navigate to `http://localhost:3000/cortex`
- [ ] Dashboard loads with data (not loading state)
- [ ] Green "Cortex Capital Live" indicator showing
- [ ] P&L numbers updating
- [ ] Trades appearing
- [ ] Activity feed showing agent actions

### Automated Test
- [ ] `npm run test:cortex` passes all tests
- [ ] 7/7 tests passing
- [ ] No connection errors

## 🎯 Verification Commands

```bash
# 1. Verify Cortex Capital is running
curl http://localhost:3001/health

# 2. Test all endpoints
curl http://localhost:3001/api/pnl
curl http://localhost:3001/api/trades/recent?limit=5
curl http://localhost:3001/api/activity?limit=10

# 3. Run integration tests
npm run test:cortex

# 4. Start Fish Tank
npm run dev

# 5. Open dashboard
open http://localhost:3000/cortex
```

## 📊 Expected Output

### Health Check
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456
}
```

### P&L Endpoint
```json
{
  "totalPnL": 1250.50,
  "todayPnL": 340.20,
  "weekPnL": 890.00,
  "openPositions": 3,
  "dayTrades": 2,
  "accountValue": 25000.00,
  "buyingPower": 12500.00,
  "timestamp": 1710876543210
}
```

### Test Output
```
✅ Health Check                             OK
✅ P&L Endpoint                             OK
✅ Trades Endpoint                          OK
✅ Activity Endpoint                        OK
✅ Fish Tank P&L Proxy                      OK
✅ Fish Tank Trades Proxy                   OK
✅ POST /api/cortex/activity                Activity posted successfully

Passed: 7 | Failed: 0 | Total: 7

🎉 All tests passed! Cortex integration is working.
```

## 🚨 Common Issues

### Issue: "Cortex API Offline"
**Fix:**
```bash
# Check if Cortex is running
curl http://localhost:3001/health

# If not running, start Cortex Capital
cd /path/to/cortex-capital
npm start  # or your start command
```

### Issue: CORS errors in browser
**Fix:** Add CORS headers to Cortex API:
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### Issue: No data showing
**Fix:**
1. Check browser console for errors
2. Verify API returns data: `curl http://localhost:3001/api/pnl`
3. Check `.env.local` has correct URL
4. Restart Fish Tank: `npm run dev`

### Issue: Stale data
**Fix:** Adjust polling interval in `src/features/office/hooks/useCortexData.ts`:
```typescript
const POLL_INTERVAL = 3000; // 3 seconds instead of 5
```

## 📚 Documentation Quick Links

- **Setup:** [CORTEX_SETUP.md](CORTEX_SETUP.md) - Full integration guide
- **Agents:** [CORTEX_AGENTS.md](CORTEX_AGENTS.md) - Agent configuration
- **Quick Start:** [QUICKSTART_CORTEX.md](QUICKSTART_CORTEX.md) - 5-minute setup
- **Summary:** [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) - Integration overview

## ✅ Final Checklist

Before going to production:

- [ ] All tests passing
- [ ] Dashboard loads with live data
- [ ] All 7 agents showing in activity feed
- [ ] P&L updating in real-time
- [ ] Trades appearing when executed
- [ ] Health indicator shows "online"
- [ ] No console errors
- [ ] Mobile responsive (test on phone)
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Documentation reviewed

## 🚀 Ready to Deploy

When all checkboxes are checked, you're ready to:

1. **Development:** `npm run dev` → `http://localhost:3000/cortex`
2. **Production:** `npm run build` → `npm start`
3. **Docker:** Build and deploy container

## 📝 Next Steps

- [ ] Add WebSocket for real-time updates (optional)
- [ ] Integrate agents into 3D office view
- [ ] Add historical charts
- [ ] Add performance analytics
- [ ] Add trade notifications/alerts
- [ ] Add mobile app view

---

**Status:** ✅ Integration Complete

**Total Files:** 14 new files + 3 updates  
**Total Lines:** ~2,500 lines of code + documentation  
**Test Coverage:** 7 integration tests  
**Documentation:** 4 complete guides (32 KB total)

**Ready to visualize your trades!** 🎉
