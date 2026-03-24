# Deployment Checklist

Quick reference for deploying Cortex Capital to production.

---

## Pre-Deployment

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.errors in production code
- [ ] Environment variables documented

### Security
- [ ] Secrets moved to environment variables
- [ ] No hardcoded API keys
- [ ] JWT_SECRET generated (`openssl rand -hex 64`)
- [ ] ENCRYPTION_KEY generated (`openssl rand -hex 32`)
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled

### Database
- [ ] Migrations tested locally
- [ ] Render Postgres database provisioned
- [ ] Database credentials secured
- [ ] Connection string includes `?sslmode=require`
- [ ] Backup strategy confirmed

---

## Backend Deployment (Railway)

### Setup
- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] Project created from repo
- [ ] `railway.json` committed to repo

### Environment Variables
- [ ] DATABASE_URL (from Render)
- [ ] TRADIER_TOKEN (production key)
- [ ] TRADIER_BASE_URL (https://api.tradier.com)
- [ ] JWT_SECRET (generated)
- [ ] ENCRYPTION_KEY (generated)
- [ ] RESEND_API_KEY (from Resend dashboard)
- [ ] SUPPORT_EMAIL (your email)
- [ ] APP_URL (https://app.cortexcapital.ai)
- [ ] ALLOWED_ORIGINS (frontend URLs)
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info

### Verification
- [ ] Build completes successfully
- [ ] Health check passes: `curl https://[railway-url]/health`
- [ ] Logs show no errors
- [ ] Database connection works
- [ ] Tradier API responds

---

## Frontend Deployment (Vercel)

### Setup
- [ ] Vercel account created
- [ ] GitHub repo connected
- [ ] Project created (root: `frontend/`)
- [ ] Framework detected as Next.js

### Environment Variables
- [ ] NEXT_PUBLIC_API_URL (Railway backend URL)

### Verification
- [ ] Build completes successfully
- [ ] Site loads at preview URL
- [ ] API requests reach backend (check Network tab)
- [ ] No console errors
- [ ] Security headers present

---

## Custom Domains

### Backend (api.cortexcapital.ai)
- [ ] Domain added in Railway
- [ ] CNAME record created: `api → [railway-url]`
- [ ] DNS propagated (check with `dig api.cortexcapital.ai`)
- [ ] SSL certificate provisioned
- [ ] HTTPS enforced

### Frontend (app.cortexcapital.ai)
- [ ] Domain added in Vercel
- [ ] CNAME record created: `app → cname.vercel-dns.com`
- [ ] DNS propagated
- [ ] SSL certificate provisioned
- [ ] HTTPS enforced

---

## Database Setup

### Migrations
- [ ] Connect to Render Postgres: `psql $DATABASE_URL`
- [ ] Run migrations:
  - [ ] `npm run db:migrate`
  - [ ] `npm run db:migrate:engine`
- [ ] Verify tables exist: `\dt`
- [ ] Verify schema: `\d users`, `\d positions`, etc.

### Backups
- [ ] Render auto-backup enabled
- [ ] Manual backup tested: `pg_dump $DATABASE_URL > backup.sql`
- [ ] Restore procedure documented

---

## Post-Deployment Testing

### Smoke Tests
- [ ] Frontend loads: https://app.cortexcapital.ai
- [ ] Backend health: https://api.cortexcapital.ai/health
- [ ] API endpoints respond:
  - [ ] GET /api/tradier/profile
  - [ ] GET /api/tradier/accounts
  - [ ] POST /api/analyze (with test data)
- [ ] Database queries work
- [ ] Email sending works (test REPORTER)

### Integration Tests
- [ ] User can authenticate
- [ ] Portfolio analysis completes
- [ ] ANALYST agent returns recommendations
- [ ] STRATEGIST agent generates rebalance plan
- [ ] EXECUTOR agent validates trades
- [ ] REPORTER agent sends email summary

### Performance
- [ ] Page load < 2s (Lighthouse)
- [ ] API response < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks (check Railway metrics)

### Security
- [ ] HTTPS enforced
- [ ] Security headers present:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Strict-Transport-Security
- [ ] CORS limited to frontend domain
- [ ] Rate limiting active
- [ ] No secrets in client code

---

## Monitoring Setup

### Railway
- [ ] Deployment notifications enabled
- [ ] Resource usage alerts configured
- [ ] Log retention understood (7 days free tier)

### Vercel
- [ ] Web Analytics enabled
- [ ] Build notifications enabled
- [ ] Error alerts configured

### External (Optional)
- [ ] Sentry integrated for error tracking
- [ ] Uptime monitoring (UptimeRobot/Pingdom)
- [ ] Performance monitoring (DataDog/New Relic)

---

## DNS Configuration Summary

### Required Records

| Record | Type | Name | Value | TTL |
|--------|------|------|-------|-----|
| Backend | CNAME | api | cortex-capital.up.railway.app | 3600 |
| Frontend | CNAME | app | cname.vercel-dns.com | 3600 |

### Verification

```bash
# Check DNS propagation
dig api.cortexcapital.ai
dig app.cortexcapital.ai

# Check SSL
curl -I https://api.cortexcapital.ai
curl -I https://app.cortexcapital.ai
```

---

## Rollback Plan

### If Backend Fails
1. Railway Dashboard → Deployments
2. Find last working deployment
3. Click **⋯ → Redeploy**
4. Verify health check passes

### If Frontend Fails
1. Vercel Dashboard → Deployments
2. Find last working deployment
3. Click **⋯ → Promote to Production**
4. Verify site loads

### If Database Issue
1. Check Render Postgres status
2. Review connection string
3. Restore from backup if needed:
   ```bash
   psql $DATABASE_URL < backup.sql
   ```

---

## Support & Documentation

### Internal Docs
- [ ] README.md updated
- [ ] API docs published
- [ ] Architecture diagrams current
- [ ] Runbooks created

### External Resources
- Backend: `/Users/atlasbuilds/clawd/cortex-capital/DEPLOYMENT.md`
- Frontend: `/Users/atlasbuilds/clawd/cortex-capital/frontend/DEPLOYMENT.md`
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs

---

## Final Checklist

- [ ] All smoke tests pass
- [ ] All integration tests pass
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring active
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Team notified
- [ ] Docs updated
- [ ] Rollback plan tested

---

## Launch Announcement

Once all checks pass:

1. [ ] Update status page (if you have one)
2. [ ] Announce to stakeholders
3. [ ] Monitor closely for 24-48 hours
4. [ ] Gather initial user feedback
5. [ ] Schedule post-launch retrospective

---

**Estimated deployment time: 30-60 minutes**

**Post-deployment monitoring: 24-48 hours**
