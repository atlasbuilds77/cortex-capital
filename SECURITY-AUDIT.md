# Cortex Capital - Security Audit

**Auditor:** Atlas (Opus)  
**Date:** 2026-03-17  
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Summary

Found **8 security vulnerabilities**. This code handles **real money and personal financial data**. Fix ALL critical issues before any production deployment.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. No Authentication (CRITICAL)

**Location:** All API endpoints  
**CVE Category:** CWE-306 (Missing Authentication for Critical Function)

**Current State:**
```typescript
// Anyone can hit any endpoint
server.get('/api/portfolio/analyze/:accountId', async (request, reply) => {
  // No auth check
  const { accountId } = request.params;
  const report = await analyzePortfolio(accountId);
  return { success: true, data: report };
});
```

**Attack Vector:** 
- Enumerate account IDs
- Access anyone's portfolio data
- Execute trades on any account

**Remediation:**
```typescript
// Add to every endpoint
const authenticateRequest = async (request: FastifyRequest): Promise<User> => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('Missing token');
  
  const decoded = await verifyJWT(token);
  const user = await getUserById(decoded.userId);
  if (!user) throw new UnauthorizedError('Invalid user');
  
  return user;
};

// Verify ownership
const verifyAccountOwnership = async (user: User, accountId: string): Promise<void> => {
  const connection = await query(
    'SELECT * FROM brokerage_connections WHERE user_id = $1',
    [user.id]
  );
  // Verify the user owns this account
};
```

**Priority:** FIX IMMEDIATELY - P0

---

### 2. Plaintext Password Storage (CRITICAL)

**Location:** `server.ts:96`  
**CVE Category:** CWE-256 (Plaintext Storage of Password)

**Current State:**
```typescript
const passwordHash = password; // Placeholder - STORES PLAINTEXT
```

**Attack Vector:** 
- Database breach exposes all passwords
- Users often reuse passwords

**Remediation:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Increase for more security (slower)

// On registration
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// On login
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Priority:** FIX BEFORE ANY USER DATA - P0

---

### 3. Potential SQL Injection (HIGH)

**Location:** `server.ts:161-170`  
**CVE Category:** CWE-89 (SQL Injection)

**Current State:**
```typescript
// Query uses parameterized queries BUT pattern is inconsistent
let queryStr = `SELECT ... WHERE user_id = $1`;
if (status) {
  queryStr += ` AND status = $2`;
  params.push(status);
}
queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
```

**Risk:** 
- Current code is safe due to parameterization
- Pattern encourages string concatenation which leads to injection
- Junior devs may copy-paste incorrectly

**Remediation:**
```typescript
// Use query builder or explicit sanitization
import { z } from 'zod';

const PlanQuerySchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected', 'executed']).optional(),
  limit: z.number().int().min(1).max(100).default(10),
});

// Validate before use
const validated = PlanQuerySchema.parse(request.query);
```

**Priority:** HIGH - P1

---

### 4. API Key in Memory (MEDIUM)

**Location:** `integrations/tradier.ts`  
**CVE Category:** CWE-312 (Cleartext Storage of Sensitive Information)

**Current State:**
```typescript
const TRADIER_TOKEN = process.env.TRADIER_TOKEN;
// Token stays in memory, could leak via core dumps or memory inspection
```

**Remediation:**
- Use secrets manager (AWS Secrets Manager, Vault)
- Don't log request headers
- Clear sensitive data after use when possible

**Priority:** MEDIUM (acceptable for MVP with proper access controls)

---

### 5. CORS Configuration Too Permissive (MEDIUM)

**Location:** `server.ts:23`  
**CVE Category:** CWE-942 (Permissive CORS Policy)

**Current State:**
```typescript
server.register(cors, {
  origin: true, // Allow ALL origins
});
```

**Attack Vector:**
- Malicious site can make requests to API
- Combined with auth issues = complete compromise

**Remediation:**
```typescript
server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

**Priority:** MEDIUM - P2 (Fix before production)

---

### 6. Missing Input Validation (HIGH)

**Location:** All POST endpoints  
**CVE Category:** CWE-20 (Improper Input Validation)

**Current State:**
```typescript
server.post('/api/users', async (request, reply) => {
  const { email, password, tier, risk_profile } = request.body;
  // No validation - could be null, wrong type, malicious
});
```

**Attack Vector:**
- Type confusion attacks
- XSS in email field
- Invalid enum values bypass database constraints

**Remediation:**
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  tier: z.enum(['scout', 'operator', 'partner']),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive']),
});

server.post('/api/users', async (request, reply) => {
  const validated = CreateUserSchema.parse(request.body);
  // Now safe to use
});
```

**Priority:** HIGH - P1

---

### 7. Error Messages Leak Information (LOW)

**Location:** Multiple files  
**CVE Category:** CWE-209 (Information Exposure Through Error Message)

**Current State:**
```typescript
throw new Error('TRADIER_TOKEN not set in environment');
// Reveals environment variable name to attackers
```

**Remediation:**
```typescript
// Log detailed error server-side
logger.error('Missing required environment variable', { var: 'TRADIER_TOKEN' });

// Return generic error to client
throw new Error('Service configuration error');
```

**Priority:** LOW - P3

---

### 8. Missing Rate Limiting (MEDIUM)

**Location:** All endpoints  
**CVE Category:** CWE-770 (Allocation of Resources Without Limits)

**Attack Vector:**
- Brute force password attempts
- API abuse / resource exhaustion
- Cost explosion on Tradier API calls

**Remediation:**
```typescript
import rateLimit from '@fastify/rate-limit';

server.register(rateLimit, {
  max: 100, // requests
  timeWindow: '1 minute',
  // Per-route overrides
});

// Stricter for sensitive endpoints
server.post('/api/executor/execute', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
}, handler);
```

**Priority:** MEDIUM - Before production

---

## Security Checklist for Production

### Before First User

- [ ] Implement JWT authentication
- [ ] Hash passwords with bcrypt (cost factor ≥ 12)
- [ ] Add input validation (Zod) on all endpoints
- [ ] Restrict CORS to dashboard domain
- [ ] Enable HTTPS only
- [ ] Audit all environment variables

### Before Real Money

- [ ] Add idempotency keys for trade execution
- [ ] Implement rate limiting
- [ ] Add request logging (excluding sensitive data)
- [ ] Set up error monitoring (Sentry)
- [ ] Configure database connection encryption
- [ ] Add IP allowlisting for admin operations

### Ongoing

- [ ] Regular dependency audits (`npm audit`)
- [ ] Rotate API keys quarterly
- [ ] Review access logs weekly
- [ ] Penetration testing annually

---

## Environment Variables Security

**Required secrets (never commit to git):**
```
DATABASE_URL       # Postgres connection string
TRADIER_TOKEN      # Brokerage API key
JWT_SECRET         # JWT signing key (generate: openssl rand -hex 64)
ENCRYPTION_KEY     # For credential storage
RESEND_API_KEY     # Email service (Phase 2)
```

**Generate secure secrets:**
```bash
# JWT Secret
openssl rand -hex 64

# Encryption Key
openssl rand -hex 32

# Database Password
openssl rand -base64 24
```

---

## Data Classification

| Data Type | Classification | Protection Required |
|-----------|---------------|---------------------|
| User passwords | RESTRICTED | Bcrypt, never log |
| Tradier tokens | RESTRICTED | Encrypted at rest |
| Portfolio data | CONFIDENTIAL | Access controls |
| Email addresses | PII | Encryption optional |
| Trade history | CONFIDENTIAL | Audit logging |

---

## Incident Response

If security breach detected:

1. **CONTAIN:** Revoke all API tokens immediately
2. **ASSESS:** Check audit logs for scope
3. **NOTIFY:** Users within 24 hours if data exposed
4. **FIX:** Patch vulnerability before service restore
5. **DOCUMENT:** Post-mortem within 48 hours

---

**This audit covers code-level security only. Infrastructure security (AWS, Supabase) requires separate review.**

