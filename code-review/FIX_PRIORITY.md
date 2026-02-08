# Fix Priority List - Autonomous Trading Company

**Total Issues:** 18  
**Estimated Total Fix Time:** 16-24 hours  
**Order:** By risk × impact × ease of fix

---

## 🔥 CRITICAL - Fix in Next 2 Hours

### 1. Worker Step Claiming Race Condition (15 min)
**Risk:** 🔴🔴🔴🔴🔴 CRITICAL - Financial loss  
**File:** `integration/db-adapter.ts:163-171`  
**Impact:** Duplicate trades, position tracking corruption  
**Difficulty:** Easy

```typescript
// Change return type and use RETURNING
const result = await db.queryOne<{ id: string }>(`
  UPDATE ops_mission_steps 
  SET status = 'running', assigned_to = $1, started_at = CURRENT_TIMESTAMP
  WHERE id = $2 AND status = 'queued'
  RETURNING id
`, [workerId, stepId]);

return result !== null;
```

**Test:** Start 2 workers, verify no duplicate claims in logs

---

### 2. Heartbeat Deadlock Protection (10 min)
**Risk:** 🔴🔴🔴🔴 HIGH - System stops working  
**File:** `integration/heartbeat.ts:54-60`  
**Impact:** One stuck heartbeat = no more heartbeats ever  
**Difficulty:** Easy

```typescript
if (this.isRunning && this.runStartTime) {
  const runDuration = Date.now() - this.runStartTime;
  if (runDuration > this.MAX_HEARTBEAT_DURATION) {
    console.error('[Heartbeat] DEADLOCK: Forcing reset');
    this.isRunning = false;
    this.runStartTime = null;
  }
}
```

**Test:** Manually trigger heartbeat, verify timeout recovery

---

### 3. Dashboard Memory Leak (20 min)
**Risk:** 🔴🔴🔴 MEDIUM - UX degradation  
**File:** `dashboard/app/page.tsx:18-30`  
**Impact:** Dashboard crashes after 10-15 minutes  
**Difficulty:** Medium

**See:** `QUICK_WINS.md` section 3 for full code

**Test:** Chrome DevTools memory profiler, run for 10 min

---

### 4. Database Pool Configuration (20 min)
**Risk:** 🔴🔴🔴🔴 HIGH - Data loss, hung queries  
**File:** `integration/db-adapter.ts:91-97`  
**Impact:** Connection leaks, silent failures  
**Difficulty:** Easy

**See:** `QUICK_WINS.md` section 4 for full code

**Test:** Start worker, send SIGTERM, verify graceful shutdown

---

### 5. Trade Execution Rollback (30 min)
**Risk:** 🔴🔴🔴🔴🔴 CRITICAL - Financial inconsistency  
**File:** `workers/crypto-worker/index.ts:73-116`  
**Impact:** Trade executes but DB doesn't know → P&L wrong  
**Difficulty:** Medium

```typescript
// Phase 1: Mark as executing
await db.execute(`UPDATE ops_mission_steps SET status = 'executing' WHERE id = $1`, [stepId]);

try {
  // Phase 2: Execute on blockchain
  const txid = await executeSwap(quote);
  
  // Phase 3: Confirm in DB
  await db.completeStep(stepId, { txid });
} catch (error) {
  // Mark for reconciliation if blockchain might have succeeded
  await db.execute(`
    UPDATE ops_mission_steps 
    SET status = 'needs_reconciliation', 
        metadata = jsonb_set(metadata, '{error}', to_jsonb($1::text))
    WHERE id = $2
  `, [error.message, stepId]);
}
```

**Test:** Simulate DB failure after trade, verify reconciliation flag

---

**After these 5 fixes (95 minutes total):**
- ✅ No race conditions in critical paths
- ✅ System recovers from deadlocks
- ✅ Dashboard stable for hours
- ✅ Database connections managed properly
- ✅ Trade execution is safe

**→ System is safe for staging deployment**

---

## ⚠️ HIGH PRIORITY - Fix Before Production (4-6 hours)

### 6. Add Input Validation (20 min)
**Risk:** 🔴🔴🔴 MEDIUM - Security  
**File:** `core/proposal-service.ts:37-49`  
**Impact:** SQL injection, XSS, invalid data  
**Difficulty:** Easy

Install zod, add schema validation (see `QUICK_WINS.md` section 6)

---

### 7. Add Health Check Endpoint (10 min)
**Risk:** 🔴🔴 LOW - Production requirement  
**File:** `dashboard/app/api/health/route.ts` (new)  
**Impact:** Load balancers can't verify service health  
**Difficulty:** Very Easy

See `QUICK_WINS.md` section 5 for full code

---

### 8. Add Retry Logic to External APIs (15 min)
**Risk:** 🔴🔴🔴 MEDIUM - Reliability  
**File:** `workers/crypto-worker/index.ts:59-71`  
**Impact:** Transient network errors cause trade failures  
**Difficulty:** Easy

See `QUICK_WINS.md` section 7 for full code

---

### 9. Replace console.log with Structured Logger (2-3 hours)
**Risk:** 🔴🔴 LOW - Operational  
**File:** All files (349 instances!)  
**Impact:** Can't debug production issues effectively  
**Difficulty:** Medium (tedious)

```bash
npm install pino pino-pretty

# Create utils/logger.ts
# Find and replace all console.log → logger.info/error/debug
```

---

### 10. Add Error Boundaries to React (30 min)
**Risk:** 🔴🔴 LOW - UX  
**File:** `dashboard/app/components/ErrorBoundary.tsx` (new)  
**Impact:** White screen on component error  
**Difficulty:** Easy

See `CODE_REVIEW.md` P1 issue #7 for full code

---

### 11. Fix Cap Gate Concurrency (1 hour)
**Risk:** 🔴🔴🔴 MEDIUM - Policy enforcement  
**File:** `core/cap-gates.ts:48-92`  
**Impact:** Daily limits can be exceeded  
**Difficulty:** Medium

Use database functions for atomic increment (see `CODE_REVIEW.md` P1 issue #13)

---

### 12. Add CORS Configuration (10 min)
**Risk:** 🔴 LOW - Deployment config  
**File:** `dashboard/next.config.js`  
**Impact:** Cross-origin requests fail  
**Difficulty:** Very Easy

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      ],
    },
  ];
}
```

---

### 13. Add API Rate Limiting (20 min)
**Risk:** 🔴🔴 LOW - Security  
**File:** `dashboard/middleware.ts` (new)  
**Impact:** API abuse, DoS  
**Difficulty:** Easy

See `CODE_REVIEW.md` P2 issue #16 for implementation

---

**After these 8 fixes (6-8 hours total):**
- ✅ Production-grade logging
- ✅ Input validation prevents attacks
- ✅ Health checks for monitoring
- ✅ Resilient to network failures
- ✅ UI doesn't crash on errors
- ✅ Policy limits enforced correctly

**→ System is ready for production deployment**

---

## 📝 NICE TO HAVE - Post-Launch (4-6 hours)

### 14. Fix TypeScript `any` Types (1 hour)
**Risk:** 🟡 VERY LOW - Code quality  
**Files:** Various (20+ instances)  
**Impact:** Lost type safety benefits  
**Difficulty:** Easy

Replace `any` with proper types:
```typescript
// Before
private pool: any;

// After
import { Pool } from 'pg';
private pool: Pool;
```

---

### 15. Extract Magic Numbers to Config (1 hour)
**Risk:** 🟡 VERY LOW - Maintainability  
**Files:** Multiple  
**Impact:** Hard to tune parameters  
**Difficulty:** Easy

```typescript
// Before
.slice(0, 5)
setTimeout(120)

// After
config.heartbeat.maxOutcomesPerCycle
config.roundtable.maxResponseChars
```

---

### 16. Add Database Query Optimization (2 hours)
**Risk:** 🟡 VERY LOW - Performance  
**File:** `database/schema.sql`  
**Impact:** Slow queries at scale  
**Difficulty:** Medium

```sql
-- Add composite indexes
CREATE INDEX idx_mission_steps_status_kind ON ops_mission_steps(status, kind);
CREATE INDEX idx_agent_memory_agent_type_conf ON ops_agent_memory(agent_id, type, confidence DESC);
```

Run `EXPLAIN ANALYZE` on common queries, add indexes

---

### 17. Add Docker Health Checks (30 min)
**Risk:** 🟡 VERY LOW - Ops  
**File:** `docker-compose.yml`  
**Impact:** Container orchestration  
**Difficulty:** Easy

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

### 18. Write Tests (4-6 hours)
**Risk:** 🟡 VERY LOW - Long-term quality  
**Files:** New test files  
**Impact:** Regression prevention  
**Difficulty:** Hard

```bash
npm install --save-dev jest @types/jest ts-jest

# Write tests for:
# - Step claiming (race condition)
# - Trade execution (rollback)
# - Cap gates (concurrency)
# - Heartbeat (timeout recovery)
```

---

## Summary by Phase

### Phase 1: Critical Fixes (95 minutes)
**Must do before staging:**
1. Worker step claiming (15 min)
2. Heartbeat deadlock (10 min)
3. Dashboard memory leak (20 min)
4. DB pool config (20 min)
5. Trade execution rollback (30 min)

### Phase 2: Production Hardening (6-8 hours)
**Must do before production:**
6. Input validation (20 min)
7. Health check (10 min)
8. API retry logic (15 min)
9. Structured logging (2-3 hours)
10. Error boundaries (30 min)
11. Cap gate concurrency (1 hour)
12. CORS config (10 min)
13. Rate limiting (20 min)

### Phase 3: Post-Launch (4-6 hours)
**Do after initial deployment:**
14. Fix `any` types (1 hour)
15. Extract magic numbers (1 hour)
16. Query optimization (2 hours)
17. Docker health checks (30 min)
18. Write tests (4-6 hours)

---

## Recommended Schedule

**Day 1 (Morning):**
- Fix issues #1-5 (critical) → 95 minutes
- Test in local environment → 1 hour
- **Total: 2-3 hours**

**Day 1 (Afternoon):**
- Fix issues #6-8 (health check, validation, retry) → 45 minutes
- Fix issue #9 (logging) → 2-3 hours
- **Total: 3-4 hours**

**Day 2 (Morning):**
- Fix issues #10-13 (error boundaries, cap gates, CORS, rate limit) → 2 hours
- Deploy to staging → 1 hour
- **Total: 3 hours**

**Day 2 (Afternoon):**
- Monitor staging for issues
- Fix any bugs found
- Load testing

**Day 3:**
- Final review
- Production deployment
- Post-launch monitoring

**Day 4+:**
- Fix issues #14-18 (nice to have)
- Write comprehensive tests
- Performance tuning

---

**Last Updated:** February 7, 2026  
**Next Review:** After Phase 1 fixes completed
