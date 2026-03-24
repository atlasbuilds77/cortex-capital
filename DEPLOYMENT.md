# Backend Deployment Guide - Railway

Production deployment for Cortex Capital backend API on Railway with Render Postgres.

---

## Prerequisites

- Railway account (free tier works for testing)
- Render Postgres database (already provisioned)
- GitHub repository
- API keys: Tradier, Resend

---

## Quick Start

### 1. Deploy to Railway

**Option A: Dashboard (Recommended)**

1. Go to https://railway.app/new
2. Click **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Node.js
5. Click **Deploy**

**Option B: CLI**

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

---

## Environment Variables

### Required Variables

Add these in **Railway Dashboard → Variables**:

```bash
# Database (Render Postgres)
DATABASE_URL=postgresql://user:password@host.render.com:5432/cortex_capital?sslmode=require

# Tradier API
TRADIER_TOKEN=your_tradier_token
TRADIER_BASE_URL=https://api.tradier.com  # or sandbox.tradier.com

# Security
JWT_SECRET=generate_with_openssl_rand_hex_64
ENCRYPTION_KEY=generate_32_character_key

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SUPPORT_EMAIL=support@cortexcapital.ai

# Application
APP_URL=https://app.cortexcapital.ai
PORT=3000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://app.cortexcapital.ai,https://cortex-capital-frontend.vercel.app

# Logging
LOG_LEVEL=info

# Optional: Monitoring
# SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Generate Secrets

```bash
# JWT Secret (64 bytes)
openssl rand -hex 64

# Encryption Key (32 bytes)
openssl rand -hex 32
```

### Railway-Specific Variables

Railway auto-injects:
- `PORT` (use `process.env.PORT` or default 3000)
- `RAILWAY_ENVIRONMENT` (production/staging)
- `RAILWAY_PUBLIC_DOMAIN` (your-app.up.railway.app)

---

## Database Setup (Render Postgres)

### 1. Render Postgres (Already Provisioned)

You mentioned you already have Render Postgres. Get credentials from:

**Render Dashboard → Database → Connection Info**

### 2. Connection String Format

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**IMPORTANT:** Include `?sslmode=require` for Render.

### 3. Run Migrations

**From your local machine:**

```bash
# Export DATABASE_URL from Render
export DATABASE_URL="postgresql://..."

# Run migrations
npm run db:migrate
npm run db:migrate:engine
```

**Or SSH into Railway container:**

```bash
railway run npm run db:migrate
railway run npm run db:migrate:engine
```

### 4. Verify Database

```bash
# Connect via psql
psql $DATABASE_URL

# Check tables
\dt

# Should see:
# - users
# - positions
# - agents
# - executions
# - scheduler_jobs
# - engine tables
```

---

## Build Configuration

Railway auto-detects Node.js. Verify settings:

### railway.json (Already Created)

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

### package.json Scripts

```json
{
  "build": "tsc",
  "start:prod": "NODE_ENV=production node dist/server.js"
}
```

---

## Custom Domain Setup

### 1. Add Domain in Railway

1. Project Settings → Domains
2. Click **+ Custom Domain**
3. Enter: `api.cortexcapital.ai`

### 2. DNS Configuration

Add CNAME record at your DNS provider:

```
CNAME  api  your-app.up.railway.app
```

Or use Railway's provided instructions.

### 3. SSL Certificate

- Auto-provisioned by Railway
- Takes ~2 minutes
- Auto-renews

---

## Deployment Flow

### Automatic Deployments

- **Production:** Push to `main` branch
- **Preview:** Create new Railway environment for other branches

### Manual Deploy

```bash
railway up          # Deploy current branch
railway up --detach # Deploy in background
```

---

## Health Checks

Railway pings `/health` endpoint every 30 seconds.

**Endpoint:**
```typescript
// server.ts
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

**Test:**
```bash
curl https://your-app.up.railway.app/health
# {"status":"ok","timestamp":"2026-03-21T12:00:00.000Z"}
```

---

## Post-Deployment Checklist

- [ ] Health endpoint responds: `curl https://api.cortexcapital.ai/health`
- [ ] Database migrations ran successfully
- [ ] Frontend can reach backend API
- [ ] Tradier API key works (check logs)
- [ ] Email sending works (Resend)
- [ ] CORS headers allow frontend domain
- [ ] No errors in Railway logs
- [ ] Custom domain resolves correctly
- [ ] SSL certificate valid

---

## Monitoring & Logs

### View Logs

**Railway Dashboard:**
1. Click your deployment
2. **Deployments** tab → Click latest
3. **View Logs**

**CLI:**
```bash
railway logs
railway logs --follow  # Real-time
```

### Log Levels

```bash
# In .env or Railway variables
LOG_LEVEL=info  # debug | info | warn | error
```

### Error Tracking (Optional)

Add Sentry:

```bash
npm install @sentry/node

# In server.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Scaling

### Vertical Scaling

Railway Dashboard → Settings → Resources

- **Starter Plan:** 512 MB RAM, 1 vCPU
- **Pro Plan:** Up to 32 GB RAM, 8 vCPU

### Horizontal Scaling

Not available on Railway. For true horizontal scaling:
- Use Railway for database
- Deploy app to Kubernetes/ECS

---

## Troubleshooting

### Build Fails

**Check logs:**
```bash
railway logs --deployment
```

**Common issues:**
- TypeScript errors: `npm run build` locally
- Missing dependencies: Check `package.json`
- Node version: Railway uses Node 20 (matches local)

### Database Connection Fails

**Verify:**
```bash
# Test connection locally
psql $DATABASE_URL

# Check Railway env vars
railway variables
```

**Common fixes:**
- Add `?sslmode=require` to DATABASE_URL
- Whitelist Railway IP in Render (usually not needed)
- Verify credentials are correct

### Health Check Fails

**Reasons:**
- Server not binding to `0.0.0.0` (Railway requirement)
- Wrong PORT variable
- Server crashes on startup

**Fix server binding:**
```typescript
// server.ts
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Required for Railway

await server.listen({ port: PORT, host: HOST });
```

### CORS Errors

**Update ALLOWED_ORIGINS:**
```bash
# In Railway variables
ALLOWED_ORIGINS=https://app.cortexcapital.ai,https://cortex-capital-frontend.vercel.app
```

**Check server CORS config:**
```typescript
// server.ts
server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
});
```

---

## Rollback

### Via Dashboard

1. Deployments tab
2. Click previous successful deployment
3. **⋯ → Redeploy**

### Via CLI

```bash
railway rollback
```

---

## Maintenance

### Update Dependencies

```bash
npm update
npm audit fix
git commit -am "Update dependencies"
git push  # Auto-deploys
```

### Database Migrations

```bash
# Create new migration
# migrations/005_new_feature.sql

# Deploy
railway run psql $DATABASE_URL -f migrations/005_new_feature.sql
```

### Backup Database

**Render provides automatic backups.**

Manual backup:
```bash
pg_dump $DATABASE_URL > backup.sql
```

---

## Environment Management

### Multiple Environments

**Option 1: Railway Environments**

1. Dashboard → New Environment
2. Name it "staging"
3. Deploy different branch

**Option 2: Separate Projects**

- `cortex-capital-prod` (main branch)
- `cortex-capital-staging` (develop branch)

---

## Cost Optimization

### Free Tier Limits (Railway)

- $5 free credits/month
- Unused credits expire
- Execution time-based billing

### Tips

- Use single Railway project
- Render Postgres has free tier (512 MB)
- Upgrade only when needed

---

## Security Checklist

- [x] HTTPS enforced (automatic on Railway)
- [x] Secrets in environment variables (not code)
- [x] Database requires SSL
- [x] CORS limited to frontend domain
- [x] Rate limiting enabled (Fastify plugin)
- [ ] API authentication (add JWT middleware)
- [ ] Input validation (use Zod schemas)
- [ ] DDoS protection (consider Cloudflare)

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Fastify Docs:** https://www.fastify.io/docs/latest/

---

## Production Readiness

Before going live:

1. [ ] Load test with Artillery/k6
2. [ ] Set up monitoring (Sentry/DataDog)
3. [ ] Configure alerting (Railway webhooks)
4. [ ] Document runbooks for incidents
5. [ ] Set up staging environment
6. [ ] Enable database backups (Render auto)
7. [ ] Review security headers
8. [ ] Add API rate limiting per user
9. [ ] Set up log aggregation
10. [ ] Create disaster recovery plan

---

**Backend should be live at https://api.cortexcapital.ai within 10 minutes of setup.**
