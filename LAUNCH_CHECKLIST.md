# Launch Checklist - Cortex Capital

Comprehensive pre-launch checklist for production deployment.

---

## Phase 1: Pre-Launch Setup

### Infrastructure
- [ ] **Railway:** Backend deployed and healthy
- [ ] **Vercel:** Frontend deployed and building
- [ ] **Render:** Postgres database provisioned
- [ ] **DNS:** Records created (api.*, app.*)
- [ ] **SSL:** Certificates provisioned and valid

### Environment Variables
- [ ] All production secrets generated (JWT, encryption keys)
- [ ] Backend env vars set in Railway (12+ variables)
- [ ] Frontend env vars set in Vercel (API URL)
- [ ] No hardcoded secrets in code
- [ ] `.env.example` files updated

### Database
- [ ] Migrations run successfully
- [ ] All tables created (users, positions, agents, etc.)
- [ ] Indexes created
- [ ] Constraints validated
- [ ] Backup enabled (Render auto-backup)
- [ ] Connection pooling configured

---

## Phase 2: Code Quality

### Backend
- [ ] TypeScript compiles (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] ESLint clean (`npm run lint`)
- [ ] Health check endpoint works
- [ ] Error handling comprehensive
- [ ] Logging configured (Pino)
- [ ] Rate limiting active
- [ ] CORS restricted to frontend

### Frontend
- [ ] Next.js builds (`npm run build`)
- [ ] No console errors in production build
- [ ] TypeScript strict mode enabled
- [ ] Image optimization configured
- [ ] Security headers set
- [ ] Environment variables validated
- [ ] Error boundaries implemented

---

## Phase 3: Security Hardening

### Authentication & Authorization
- [ ] JWT implementation reviewed
- [ ] Token expiration set (reasonable time)
- [ ] Refresh token flow implemented
- [ ] Password hashing strong (bcrypt rounds ≥ 12)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)

### Network Security
- [ ] HTTPS enforced everywhere
- [ ] HSTS header set (Strict-Transport-Security)
- [ ] CORS restricted to known origins
- [ ] CSP headers configured (Content-Security-Policy)
- [ ] No mixed content warnings
- [ ] API rate limiting per IP/user

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Database connection uses SSL
- [ ] API keys in environment variables only
- [ ] No secrets in client-side code
- [ ] Encryption key rotation plan documented

---

## Phase 4: Performance Optimization

### Backend
- [ ] Database queries optimized (use EXPLAIN)
- [ ] Indexes on foreign keys and query columns
- [ ] Connection pooling enabled (pg pool)
- [ ] Response caching where appropriate
- [ ] Compression enabled (Fastify compress)
- [ ] Memory usage profiled

### Frontend
- [ ] Lighthouse score > 90
- [ ] Images optimized (AVIF/WebP)
- [ ] Code splitting configured
- [ ] Bundle size < 200KB initial
- [ ] Lazy loading for routes
- [ ] Fonts preloaded

### API Response Times
- [ ] `/health` < 50ms
- [ ] `/api/tradier/profile` < 300ms
- [ ] `/api/analyze` < 2s (complex operation)
- [ ] Database queries < 100ms average

---

## Phase 5: DNS & Domain Setup

### DNS Records
- [ ] `api.cortexcapital.ai` → Railway (CNAME)
- [ ] `app.cortexcapital.ai` → Vercel (CNAME)
- [ ] `cortexcapital.ai` → Landing page (A/CNAME)
- [ ] `www.cortexcapital.ai` → Redirect to apex (optional)

### Verification
```bash
# Verify DNS propagation
dig api.cortexcapital.ai
dig app.cortexcapital.ai

# Check SSL
curl -I https://api.cortexcapital.ai/health
curl -I https://app.cortexcapital.ai
```

- [ ] DNS propagated globally (check with https://dnschecker.org)
- [ ] SSL certificates valid (green padlock)
- [ ] No mixed content warnings
- [ ] Redirect HTTP → HTTPS works

---

## Phase 6: SSL Verification

### Certificates
- [ ] Backend SSL valid (Railway auto-provisioned)
- [ ] Frontend SSL valid (Vercel auto-provisioned)
- [ ] Certificate chain complete
- [ ] No expired certificates
- [ ] Auto-renewal enabled

### Testing
```bash
# Test SSL configuration
openssl s_client -connect api.cortexcapital.ai:443 -servername api.cortexcapital.ai
openssl s_client -connect app.cortexcapital.ai:443 -servername app.cortexcapital.ai

# Check SSL rating
# https://www.ssllabs.com/ssltest/
```

- [ ] SSL Labs grade A or better
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] HSTS enabled

---

## Phase 7: Monitoring Setup

### Application Monitoring
- [ ] Railway deployment alerts enabled
- [ ] Vercel build notifications enabled
- [ ] Render database alerts enabled
- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)

### Error Tracking (Sentry - Optional)
- [ ] Sentry project created
- [ ] Backend DSN configured
- [ ] Frontend DSN configured
- [ ] Source maps uploaded
- [ ] Alert rules set
- [ ] Slack/email notifications enabled

### Logging
- [ ] Railway logs accessible
- [ ] Vercel logs accessible
- [ ] Log level set appropriately (info/warn)
- [ ] PII not logged
- [ ] Structured logging format

### Metrics
- [ ] API response times tracked
- [ ] Error rates monitored
- [ ] Database connection pool stats
- [ ] Memory/CPU usage dashboards
- [ ] User activity metrics

---

## Phase 8: Integration Testing

### API Endpoints
- [ ] `GET /health` → 200 OK
- [ ] `GET /api/tradier/profile` → Valid response
- [ ] `GET /api/tradier/accounts` → Returns accounts
- [ ] `POST /api/analyze` → Analysis completes
- [ ] Error responses return proper status codes
- [ ] Rate limiting triggers after threshold

### Agent System
- [ ] ANALYST agent analyzes portfolio
- [ ] STRATEGIST agent creates rebalance plan
- [ ] EXECUTOR agent validates trades
- [ ] REPORTER agent sends email (test to yourself)
- [ ] Scheduler runs jobs correctly
- [ ] Database transactions commit properly

### Frontend Integration
- [ ] API calls reach backend
- [ ] Authentication flow works
- [ ] Dashboard loads portfolio data
- [ ] Charts render correctly
- [ ] Error states display properly
- [ ] Loading states work

---

## Phase 9: Load Testing (Optional but Recommended)

### Tools
```bash
# Install Artillery
npm install -g artillery

# Create load test config
# artillery/load-test.yml

# Run test
artillery run artillery/load-test.yml
```

### Scenarios
- [ ] 10 concurrent users
- [ ] 100 requests/second
- [ ] Portfolio analysis under load
- [ ] Database handles concurrent queries
- [ ] No memory leaks
- [ ] Response times acceptable

---

## Phase 10: Backup & Recovery

### Database Backups
- [ ] Render auto-backup enabled (free tier: daily)
- [ ] Manual backup tested:
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```
- [ ] Restore procedure documented
- [ ] Backup restoration tested locally

### Application State
- [ ] Code in version control (GitHub)
- [ ] Environment variables documented
- [ ] Deployment configs committed
- [ ] Infrastructure as code (railway.json, vercel.json)

### Disaster Recovery Plan
- [ ] Rollback procedure documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined
- [ ] Team roles assigned
- [ ] Emergency contacts listed

---

## Phase 11: Documentation

### Internal Docs
- [ ] README.md complete
- [ ] DEPLOYMENT.md (backend) complete
- [ ] DEPLOYMENT.md (frontend) complete
- [ ] Architecture diagram created
- [ ] API documentation generated
- [ ] Runbooks for common issues

### External Docs
- [ ] User guide (if needed)
- [ ] API documentation published (if public API)
- [ ] Privacy policy (if collecting user data)
- [ ] Terms of service

---

## Phase 12: Final Pre-Launch Checks

### Smoke Tests
- [ ] Health checks pass on all services
- [ ] All critical user flows work end-to-end
- [ ] No JavaScript errors in browser console
- [ ] No server errors in Railway logs
- [ ] Database queries performant

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility (Optional)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] WCAG 2.1 Level AA compliance
- [ ] Color contrast sufficient

---

## Launch Day Checklist

### T-1 Hour
- [ ] Team on standby
- [ ] Monitoring dashboards open
- [ ] Rollback plan reviewed
- [ ] Final smoke test passed
- [ ] Database backup taken

### T-0 (Launch)
- [ ] DNS records updated (if needed)
- [ ] Announcement ready (email/social)
- [ ] Support email monitored
- [ ] Analytics tracking verified

### T+1 Hour
- [ ] No critical errors in logs
- [ ] Response times normal
- [ ] User signups working
- [ ] Email delivery working
- [ ] First user flows completed successfully

### T+24 Hours
- [ ] Error rates normal
- [ ] Performance metrics stable
- [ ] No critical bugs reported
- [ ] User feedback collected
- [ ] Team debrief scheduled

---

## Post-Launch Monitoring

### First Week
- [ ] Daily log reviews
- [ ] Error rate trending down
- [ ] Performance stable
- [ ] User feedback positive
- [ ] No security incidents

### First Month
- [ ] Weekly performance reviews
- [ ] Cost optimization opportunities
- [ ] Feature usage analytics
- [ ] User retention tracked
- [ ] Scaling needs assessed

---

## Rollback Triggers

Immediately rollback if:
- [ ] Error rate > 5%
- [ ] API response time > 3s average
- [ ] Database connection failures
- [ ] Security vulnerability discovered
- [ ] Data corruption detected

---

## Success Criteria

Launch is successful when:
- [ ] 99.9% uptime in first week
- [ ] < 1% error rate
- [ ] Average response time < 500ms
- [ ] Zero critical bugs
- [ ] Positive user feedback
- [ ] No security incidents

---

## Emergency Contacts

- **Infrastructure:** Railway, Vercel, Render support
- **DNS:** Domain registrar support
- **Team:** [Your team contacts]
- **On-call:** [Rotation schedule]

---

## Post-Launch Retrospective

After 1 week, review:
- What went well?
- What could be improved?
- What surprised us?
- What would we do differently?
- What should we monitor more closely?

---

**Estimated launch preparation time: 4-8 hours**

**Post-launch monitoring: Intensive for 48 hours, then weekly**

---

## Quick Command Reference

```bash
# Health checks
curl https://api.cortexcapital.ai/health
curl https://app.cortexcapital.ai

# View logs
railway logs --follow
vercel logs --follow

# Database backup
pg_dump $DATABASE_URL > backup.sql

# DNS verification
dig api.cortexcapital.ai
dig app.cortexcapital.ai

# SSL verification
openssl s_client -connect api.cortexcapital.ai:443

# Rollback
railway rollback
vercel rollback
```

---

**Good luck with the launch! 🚀**
