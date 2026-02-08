# Production Deployment Checklist
**System:** Autonomous Trading Company  
**Date:** February 7, 2026  
**Status:** ❌ NOT READY (5 P0 issues blocking)

---

## Pre-Deployment Validation

### Code Quality & Safety

- [ ] **All TypeScript compiles without errors**
  - Run: `npm run build` in all packages
  - Zero type errors
  - Zero lint errors

- [ ] **No console.logs in production code**
  - Current: 349 instances ❌
  - Replace all with structured logger (pino/winston)
  - Search: `grep -r "console.log" --include="*.ts"`

- [ ] **All secrets in environment variables**
  - Current: credentials.json ⚠️
  - Move to .env + AWS Secrets Manager / Vault
  - Verify: `grep -r "credentials.json"` returns 0 results in code

- [ ] **Critical race conditions fixed**
  - [ ] Worker step claiming (P0 #1)
  - [ ] Trade execution rollback (P0 #2)
  - [ ] Cap gate concurrency (P1 #13)

- [ ] **Database connection handling**
  - [ ] Pool properly configured with timeouts
  - [ ] Graceful shutdown on SIGTERM
  - [ ] Connection error handling
  - [ ] Query timeouts set (30s max)

---

## Infrastructure

### Database

- [ ] **PostgreSQL production instance provisioned**
  - Version: 14+ with JSONB support
  - Connection pooling: pgBouncer or RDS Proxy
  - Backup schedule: Daily snapshots + WAL archiving
  - Monitoring: CloudWatch / DataDog

- [ ] **Database migrations tested**
  - [ ] Schema migrations run successfully
  - [ ] Rollback tested for each migration
  - [ ] Indexes created (verify with `\d+` in psql)
  - [ ] Foreign key constraints enforced

- [ ] **Database indexes optimized**
  - [ ] Composite indexes for common queries
  - [ ] Analyze query plans: `EXPLAIN ANALYZE`
  - [ ] No full table scans on hot paths

- [ ] **Connection string secured**
  - No plaintext passwords in code
  - DATABASE_URL in environment only
  - SSL/TLS enabled for connections

### Health Checks

- [ ] **Health check endpoints implemented**
  - `/health` - Basic liveness check
  - `/health/ready` - Readiness check (DB connection, etc.)
  - Returns JSON with service status

- [ ] **Health checks configured in deployment**
  - Docker: `healthcheck` directive
  - Kubernetes: `livenessProbe` and `readinessProbe`
  - Load balancer: Health check target

- [ ] **Circuit breakers tested**
  - Workers fail gracefully after 3 consecutive errors
  - Auto-recovery after 5 minutes
  - Verified in staging

### Logging & Monitoring

- [ ] **Structured logging implemented**
  - Replace all console.log with logger
  - Log format: JSON for production, pretty for dev
  - Log levels: ERROR, WARN, INFO, DEBUG

- [ ] **Log aggregation configured**
  - CloudWatch Logs / DataDog / ELK
  - Retention: 30 days minimum
  - Searchable and filterable

- [ ] **Metrics & alerts configured**
  - [ ] Heartbeat execution time (alert if >10s)
  - [ ] Worker queue depth (alert if >50)
  - [ ] Database connection pool usage (alert if >80%)
  - [ ] Error rate (alert if >1% of requests)
  - [ ] Trade execution failures (alert immediately)

- [ ] **Distributed tracing (optional but recommended)**
  - OpenTelemetry / Jaeger / DataDog APM
  - Trace heartbeat → worker → trade execution flow

### Error Handling

- [ ] **All external API calls have retry logic**
  - Jupiter API: 3 retries with exponential backoff
  - Tradier API: 3 retries
  - Nebula API: 3 retries
  - Timeout: 10 seconds per request

- [ ] **Error boundaries in React components**
  - Wrap main views with ErrorBoundary
  - Graceful degradation on component failure

- [ ] **Uncaught exception handlers**
  ```typescript
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    // Alert on-call
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection');
    // Alert on-call
  });
  ```

---

## Security

### Authentication & Authorization

- [ ] **Dashboard API protected**
  - Authentication middleware on all `/api/*` routes
  - JWT or API key validation
  - Rate limiting: 100 req/min per IP

- [ ] **Heartbeat endpoint secured**
  - Bearer token required
  - Token stored in environment
  - Rotate token monthly

- [ ] **CORS configured correctly**
  - Allow only trusted origins
  - No `Access-Control-Allow-Origin: *` in production

### Secrets Management

- [ ] **No secrets in code or version control**
  - Verify: `git log -p | grep -i "api.*key"` returns nothing
  - Use `.gitignore` for `.env` files

- [ ] **Secrets in secure storage**
  - AWS Secrets Manager / HashiCorp Vault / GCP Secret Manager
  - Auto-rotation enabled where possible

- [ ] **Environment variables validated on startup**
  ```typescript
  const requiredEnvVars = [
    'DATABASE_URL',
    'ANTHROPIC_API_KEY',
    'SUPABASE_URL',
    // ...
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required env var: ${envVar}`);
    }
  }
  ```

### Input Validation

- [ ] **All user inputs validated**
  - Proposal creation: zod schema validation
  - API endpoints: request body validation
  - SQL injection protection: parameterized queries only

- [ ] **JSONB inputs sanitized**
  - No raw JSON.parse from user input
  - Schema validation before database insert

---

## Performance

### Load Testing

- [ ] **Heartbeat load tested**
  - Simulate 100 concurrent heartbeats
  - Verify no deadlocks
  - Verify no memory leaks
  - Monitor: CPU, memory, DB connections

- [ ] **Worker load tested**
  - 50+ queued steps
  - Multiple workers claiming simultaneously
  - Verify no duplicate claims
  - Verify no lost steps

- [ ] **Dashboard load tested**
  - 1000+ SSE events in 10 minutes
  - Verify no memory leaks in browser
  - Verify no UI freezes
  - Monitor: Memory usage, frame rate

### Optimization

- [ ] **Database query optimization**
  - Indexes on all foreign keys ✅
  - Composite indexes for complex queries
  - No N+1 queries
  - Query plans analyzed

- [ ] **React rendering optimized**
  - `React.memo` on expensive components
  - `useMemo` / `useCallback` where needed
  - No unnecessary re-renders (use React DevTools)

- [ ] **Bundle size optimized**
  - Code splitting for routes
  - Lazy loading for heavy components
  - Images optimized (WebP, compression)
  - Bundle size <500KB gzipped

---

## Deployment

### Build Process

- [ ] **Docker images build successfully**
  - Heartbeat service
  - Crypto worker
  - Options worker
  - Futures worker
  - Dashboard
  - Roundtable worker

- [ ] **Dependencies pinned**
  - No `^` or `~` in package.json versions
  - Lock files committed (package-lock.json, yarn.lock)
  - Security audit: `npm audit` shows 0 high/critical

- [ ] **Build reproducible**
  - Same source → same Docker image hash
  - No timestamp-based builds

### Deployment Strategy

- [ ] **Blue-green deployment configured**
  - Or: Rolling deployment with health checks
  - Zero downtime for dashboard
  - Workers drain gracefully (finish current step)

- [ ] **Rollback plan documented**
  - Steps to revert to previous version
  - Database migration rollback tested
  - Estimated rollback time: <5 minutes

- [ ] **Deployment runbook created**
  - Step-by-step deployment instructions
  - Environment variable checklist
  - Post-deployment verification steps

### Post-Deployment Verification

- [ ] **Smoke tests run successfully**
  - [ ] Dashboard loads and connects to SSE
  - [ ] Heartbeat runs without errors
  - [ ] Workers claim and process steps
  - [ ] Database queries succeed
  - [ ] API endpoints respond

- [ ] **Monitoring dashboards created**
  - System health overview
  - Trade execution metrics
  - Worker queue depths
  - Error rates

---

## Documentation

- [ ] **README.md updated**
  - Deployment instructions
  - Environment variable reference
  - Architecture overview

- [ ] **Runbooks created**
  - [ ] Emergency shutdown procedure
  - [ ] Database backup restoration
  - [ ] Worker failure recovery
  - [ ] Heartbeat failure recovery

- [ ] **API documentation**
  - OpenAPI/Swagger spec for dashboard API
  - Example requests/responses

- [ ] **On-call guide**
  - Common alerts and how to resolve
  - Escalation contacts
  - Incident response procedure

---

## Disaster Recovery

- [ ] **Backup strategy implemented**
  - Database: Daily snapshots + continuous WAL archiving
  - Configuration: Version controlled and backed up
  - Logs: Retained for 30 days

- [ ] **Recovery tested**
  - [ ] Database restore from backup (RTO: <1 hour)
  - [ ] Point-in-time recovery tested
  - [ ] Data integrity verified after restore

- [ ] **Failover plan**
  - Multi-AZ database deployment
  - Load balancer with health checks
  - Auto-scaling workers

---

## Compliance & Governance

- [ ] **Trading compliance reviewed**
  - Position limits enforced in code
  - Daily trade limits enforced
  - Audit trail for all trades (in database)

- [ ] **Data privacy**
  - No PII logged in plaintext
  - Sensitive data encrypted at rest
  - Access controls on database

- [ ] **Change management**
  - All changes reviewed by senior engineer
  - Critical changes require two approvers
  - Deployment window: Off-market hours preferred

---

## Sign-Off

### Engineering

- [ ] **Senior Engineer Review:** _________________ Date: _______
- [ ] **DevOps Review:** _________________ Date: _______
- [ ] **Security Review:** _________________ Date: _______

### Business

- [ ] **Product Owner Approval:** _________________ Date: _______
- [ ] **Risk Officer Approval:** _________________ Date: _______

### Final Checklist

- [ ] All P0 issues resolved
- [ ] All P1 issues resolved or documented as known limitations
- [ ] Staging environment running stable for 24+ hours
- [ ] Load testing passed
- [ ] Security scan passed
- [ ] Runbooks reviewed and accessible
- [ ] On-call rotation scheduled
- [ ] Deployment window scheduled
- [ ] Rollback plan tested

---

## Current Status: ❌ BLOCKED

**Blocking Issues:**
1. P0 #1: Race condition in worker step claiming
2. P0 #2: Missing transaction rollback in trade execution
3. P0 #3: Unbounded memory growth in dashboard
4. P0 #4: Database connection pool not configured
5. P0 #5: Heartbeat has no deadlock protection

**Estimated Time to Production Ready:** 16-24 hours

**Next Actions:**
1. Fix all P0 issues (4-6 hours)
2. Add tests for critical paths (4-6 hours)
3. Deploy to staging and monitor for 24 hours
4. Fix any issues found in staging
5. Re-run this checklist
6. Schedule production deployment

---

**Last Updated:** February 7, 2026  
**Reviewed By:** Codex (Senior Engineering Review)
