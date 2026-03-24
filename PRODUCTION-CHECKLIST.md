# Cortex Capital - Production Deployment Checklist

**Version:** 2.0 (Phase 2)  
**Last Updated:** 2026-03-17

---

## Pre-Deployment Checklist

### 🔐 Security (BLOCKING)

- [ ] **Authentication implemented** (JWT or session-based)
- [ ] **Password hashing** with bcrypt (salt rounds ≥ 12)
- [ ] **Input validation** with Zod on all endpoints
- [ ] **CORS restricted** to dashboard domain only
- [ ] **Rate limiting** enabled (100/min general, 5/min for trades)
- [ ] **HTTPS only** - redirect HTTP
- [ ] **Environment secrets** not in code or git
- [ ] **SQL queries** all use parameterized statements ✅

### 💾 Database (BLOCKING)

- [ ] Run migration 001: `psql -f migrations/001_initial_schema.sql`
- [ ] Run migration 002: `psql -f migrations/002_phase2_enhancements.sql`
- [ ] Verify all indexes created
- [ ] Test database connection from server
- [ ] Set up connection pooling (PgBouncer recommended)
- [ ] Configure SSL for database connections
- [ ] Set up automated backups

### 🔌 External APIs (BLOCKING)

- [ ] **Tradier API** token set and valid
- [ ] Verify sandbox vs production mode
- [ ] Test account access
- [ ] Test quote fetching
- [ ] **Resend API** key set (for REPORTER)
- [ ] Verify email domain configuration
- [ ] Send test email

### 🧪 Testing (RECOMMENDED)

- [ ] Run `test-phase2.ts` successfully
- [ ] Test STRATEGIST with edge cases (0 positions, 100% concentration)
- [ ] Test EXECUTOR dry run
- [ ] Test REPORTER email generation
- [ ] Load test endpoints (optional)

---

## Environment Variables

Create `.env` from template:

```bash
cp .env.example .env
```

**Required:**
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cortex_capital?sslmode=require

# Tradier (Brokerage)
TRADIER_TOKEN=your_tradier_sandbox_or_production_token
TRADIER_BASE_URL=https://api.tradier.com  # Use sandbox.tradier.com for testing

# Security
JWT_SECRET=<generate: openssl rand -hex 64>
ENCRYPTION_KEY=<generate: openssl rand -hex 32>

# Server
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://app.cortexcapital.ai

# Email (REPORTER)
RESEND_API_KEY=re_xxxxxxxxxx
SUPPORT_EMAIL=support@cortexcapital.ai
APP_URL=https://app.cortexcapital.ai
```

**Optional:**
```env
# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

---

## Deployment Steps

### 1. Server Setup

```bash
# Install Node.js 22+
nvm install 22
nvm use 22

# Clone and install
git clone <repo>
cd cortex-capital
npm install

# Install production dependencies
npm install --production
```

### 2. Database Setup

```bash
# Create database
createdb cortex_capital

# Run migrations
psql -d cortex_capital -f migrations/001_initial_schema.sql
psql -d cortex_capital -f migrations/002_phase2_enhancements.sql

# Verify
psql -d cortex_capital -c "\dt"
```

### 3. Build and Start

```bash
# Build TypeScript
npm run build

# Start with PM2 (recommended)
pm2 start dist/server.js --name cortex-api

# Or start directly
NODE_ENV=production node dist/server.js
```

### 4. Verify Deployment

```bash
# Health check
curl https://api.cortexcapital.ai/health

# Expected response:
# {"status":"ok","timestamp":"2026-03-17T..."}
```

---

## Post-Deployment

### Monitoring Setup

1. **Uptime monitoring** - UptimeRobot or Better Uptime
2. **Error tracking** - Sentry
3. **Log aggregation** - LogTail or Papertrail
4. **Performance** - Grafana + Prometheus (optional)

### Alerts to Configure

| Alert | Threshold | Severity |
|-------|-----------|----------|
| API 5xx errors | > 5/minute | HIGH |
| Response time | > 2s p95 | MEDIUM |
| Database connections | > 80% pool | HIGH |
| Disk usage | > 80% | MEDIUM |
| Trade execution failure | Any | CRITICAL |

### Scheduled Tasks (Cron)

```bash
# Daily portfolio snapshots (6:30 PM PT, after market close)
30 18 * * 1-5 curl -X POST https://api.cortexcapital.ai/internal/snapshot-all

# Weekly performance reports (Sunday 9 AM)
0 9 * * 0 curl -X POST https://api.cortexcapital.ai/internal/send-weekly-reports

# Monthly rebalancing analysis (1st of month, 9 AM)
0 9 1 * * curl -X POST https://api.cortexcapital.ai/internal/generate-rebalancing-plans
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop new version
pm2 stop cortex-api

# 2. Restore previous version
git checkout <previous-commit>
npm install
npm run build

# 3. Restart
pm2 start cortex-api

# 4. Verify
curl https://api.cortexcapital.ai/health
```

For database rollback, restore from backup (never write rollback migrations for financial data).

---

## Troubleshooting

### "TRADIER_TOKEN not set"
- Verify `.env` file exists in deployment directory
- Check environment variable is exported: `printenv | grep TRADIER`

### "Database connection refused"
- Check DATABASE_URL format
- Verify SSL mode: `?sslmode=require` for Supabase
- Check firewall/security group allows connection

### "CORS error in browser"
- Verify ALLOWED_ORIGINS includes your dashboard domain
- Check for trailing slashes (must match exactly)

### "Rate limit exceeded"
- Wait 1 minute and retry
- Check if legitimate traffic spike or attack
- Increase limits if needed for specific routes

### "Trade execution failed"
- Check Tradier API status: https://status.tradier.com
- Verify account has sufficient buying power
- Check market hours (trades fail outside 9:30-4 ET)

---

## Support Contacts

- **Technical issues:** dev@cortexcapital.ai
- **Tradier API:** support@tradier.com
- **Supabase:** support@supabase.io
- **Domain/DNS:** Check registrar

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-17 | Initial schema, ANALYST agent |
| 2.0 | 2026-03-17 | STRATEGIST, EXECUTOR, REPORTER agents |

---

**✅ Ready for production when all blocking items checked.**

