# OPUS Security & Code Audit Report
**Cortex Capital - Pre-Deployment Audit**  
**Date:** 2026-03-21  
**Auditor:** Atlas (Opus)  
**Scope:** Full codebase security review

---

## Executive Summary

**VERDICT: CONDITIONAL PASS ⚠️**

The codebase demonstrates good security practices overall, but has **2 MEDIUM** severity issues that should be addressed before production deployment with real money. No CRITICAL or HIGH severity issues were found.

---

## 1. Security Findings

### ✅ CRITICAL: None Found

### ✅ HIGH: None Found

### ⚠️ MEDIUM (2 Issues)

#### M-1: SQL Injection via Template Literal in INTERVAL Clause
**Files:** 
- `agents/day-trader.ts:497`
- `services/options-pricing.ts:293`

**Description:**  
The `days` parameter in `getPerformanceStats()` and `cleanupCache()` is interpolated directly into SQL queries using template literals:

```typescript
// day-trader.ts:497
AND exit_time >= NOW() - INTERVAL '${days} days'

// options-pricing.ts:293
WHERE fetched_at < NOW() - INTERVAL '${daysToKeep} days'
```

**Risk:** While `days` is typed as `number`, TypeScript types are erased at runtime. If a caller passes a string like `"1 day; DROP TABLE users; --"`, SQL injection could occur.

**Recommendation:**
```typescript
// Use parameterized query with concatenation
AND exit_time >= NOW() - ($2 || ' days')::interval

// Or validate input explicitly
const safeDays = Math.max(1, Math.min(365, parseInt(String(days)) || 30));
```

**CVSS:** 5.3 (Medium)

---

#### M-2: Password Stored in Plaintext (MVP Placeholder)
**File:** `server.ts:80`

```typescript
// TODO: Hash password (use bcrypt in production)
const passwordHash = password; // Placeholder
```

**Description:**  
User passwords are stored directly without hashing. While clearly marked as a TODO, this MUST be fixed before any user signups.

**Recommendation:**
```typescript
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../lib/constants'; // Already defined as 12

const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
```

**CVSS:** 6.1 (Medium)

---

### ℹ️ LOW (3 Issues)

#### L-1: Missing Rate Limiting on Endpoints
**File:** `server.ts`

**Description:**  
Rate limit constants are defined in `lib/constants.ts` but not implemented on API routes:
- `RATE_LIMIT_GENERAL = 100`
- `RATE_LIMIT_TRADES = 5`
- `RATE_LIMIT_AUTH = 10`

**Recommendation:** Use `@fastify/rate-limit`:
```typescript
import rateLimit from '@fastify/rate-limit';

server.register(rateLimit, {
  max: RATE_LIMIT_GENERAL,
  timeWindow: '1 minute'
});
```

---

#### L-2: CORS Allows All Origins
**File:** `server.ts:18`

```typescript
server.register(cors, {
  origin: true, // Allow all origins for MVP
});
```

**Description:**  
Open CORS allows any domain to make API requests. Fine for development, must be restricted in production.

**Recommendation:**
```typescript
origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://cortexcapital.io']
```

---

#### L-3: Some `any` Types in Core Logic
**Files:** Various

**Description:**  
Found 50+ uses of `: any` or `as any`, some in critical paths:
- `agents/strategist.ts:903-906` (plan types)
- `agents/executor.ts:841` (spread result calculation)
- `agents/llm-agent-wrapper.ts:31-33` (context types)

**Impact:** Reduces type safety in financial calculations.

**Recommendation:**  
Create proper interfaces for these types. Most are in agent context objects that should have defined schemas.

---

## 2. Security Strengths ✅

### Credentials & Secrets
- ✅ **No hardcoded API keys** - All credentials from environment variables
- ✅ **Token never logged** - Tradier integration explicitly notes this
- ✅ **Generic error messages** - ConfigurationError doesn't expose variable names in production
- ✅ **API key validation at startup** - Fails fast if TRADIER_TOKEN missing

### Trade Execution Safety
- ✅ **Dry run by default** - `ExecutionConfig.dry_run` defaults to true unless `ENABLE_REAL_TRADES=true`
- ✅ **Idempotency tracking** - `executedTrades` Set prevents duplicate order placement
- ✅ **Buying power buffer** - 10% buffer (`BUYING_POWER_BUFFER = 0.9`)
- ✅ **Pre-execution validation** - Checks balances, positions before trade
- ✅ **Rollback on spread failure** - Multi-leg orders roll back if any leg fails

### Database Security
- ✅ **Parameterized queries** - All user inputs use `$1, $2` placeholders (except INTERVAL noted above)
- ✅ **Connection pooling** - Proper pg Pool with timeout handling
- ✅ **SSL in production** - `ssl: { rejectUnauthorized: true }` when `NODE_ENV=production`
- ✅ **Transaction support** - Atomic operations with BEGIN/COMMIT/ROLLBACK

### Error Handling
- ✅ **Typed error classes** - ValidationError, TradeExecutionError, etc.
- ✅ **No sensitive data in logs** - Production mode excludes error details
- ✅ **Retry with backoff** - `withRetry()` for transient failures

---

## 3. Type Safety Audit

### TypeScript Compilation
```
$ npx tsc --noEmit
(no output)
```

**Result:** ✅ ZERO TypeScript errors

### Type Coverage
- Core agents: Strong typing with interfaces
- Database queries: Parameterized with type assertions on results
- API responses: Typed via Fastify generics

### `any` Usage Summary
- **Total occurrences:** ~52
- **In test files:** ~12 (acceptable)
- **In core logic:** ~40 (should be reduced)
- **Blocking issues:** None (all are castable)

---

## 4. Business Logic Review

### Trade Execution Safeguards ✅
| Safeguard | Status |
|-----------|--------|
| Dry run default | ✅ Enabled |
| Position size limits | ✅ Per-profile configs |
| Buying power validation | ✅ Pre-execution check |
| Stop loss enforcement | ✅ In DayTrader agent |
| Duplicate prevention | ✅ Idempotency keys |
| Force EOD exit | ✅ `forceExitEOD()` |
| Profile-based limits | ✅ Conservative: 5/mo, Moderate: 15/mo |

### Approval Flow ✅
1. Plans created with status `'pending'`
2. Executor checks `status === 'approved'` before execution
3. No auto-execution without explicit approval (except scheduler triggers)

### Multi-Tenant Isolation ✅
| Check | Status |
|-------|--------|
| User ID in all queries | ✅ `WHERE user_id = $1` |
| Cross-user data leakage | ✅ Not possible with current query patterns |
| Scheduler processes each user independently | ✅ `for (const user of users)` |

---

## 5. Architecture Review

### Scheduler Safety ✅
- Jobs run sequentially per user (no race conditions)
- Each user processed independently
- Error in one user doesn't halt others
- Proper signal handling for graceful shutdown

### LLM Integration
- ✅ Timeout via `maxTokens` parameter
- ⚠️ No explicit HTTP timeout on fetch calls (recommend adding `AbortController`)
- ✅ Fallback parsing if JSON extraction fails

### External API Calls
- ✅ Retry logic with exponential backoff
- ✅ Rate limit handling (429 detection)
- ✅ Timeout configured (`API_TIMEOUT_MS = 30000`)

---

## 6. Recommendations

### Before Production (Required)

1. **Fix SQL injection in INTERVAL clauses** (M-1)
   - Estimated effort: 30 minutes
   
2. **Implement password hashing** (M-2)
   - Estimated effort: 15 minutes
   - `bcrypt` already listed in dependencies

### Before Scale (Recommended)

3. **Add rate limiting** (L-1)
   - Use `@fastify/rate-limit` with defined constants
   
4. **Restrict CORS origins** (L-2)
   - Whitelist production domains
   
5. **Add HTTP timeouts to LLM calls**
   ```typescript
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 30000);
   const response = await fetch(url, { signal: controller.signal, ... });
   ```

6. **Reduce `any` usage in core agents**
   - Create proper interfaces for portfolio, marketData, userProfile

---

## 7. Files Reviewed

| Category | Files | Status |
|----------|-------|--------|
| Trade Execution | `agents/executor.ts` | ✅ Secure |
| Core Engine | `services/portfolio-engine.ts` | ✅ Secure |
| Scheduler | `services/scheduler.ts` | ✅ Secure |
| Broker API | `integrations/tradier.ts` | ✅ Secure |
| API Server | `server.ts` | ⚠️ Fix M-2 |
| Day Trading | `agents/day-trader.ts` | ⚠️ Fix M-1 |
| Options Pricing | `services/options-pricing.ts` | ⚠️ Fix M-1 |
| Database | `integrations/database.ts` | ✅ Secure |
| Error Handling | `lib/errors.ts` | ✅ Secure |
| LLM Wrapper | `agents/llm-agent-wrapper.ts` | ✅ Secure |

---

## Verdict

### CONDITIONAL PASS ⚠️

**Cortex Capital is safe to deploy for testing and paper trading.**

**Before deploying with REAL MONEY:**
1. Fix M-1 (SQL injection in INTERVAL)
2. Fix M-2 (Password hashing)

Both fixes are straightforward and require minimal code changes.

---

**Audit completed:** 2026-03-21 03:25 PST  
**Next audit recommended:** After fixes applied + before beta launch
