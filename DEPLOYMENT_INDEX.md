# Deployment Documentation Index

Quick navigation for all deployment resources.

---

## 🎯 Start Here

**First time deploying?**
1. Read: [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
2. Test locally: [deploy/README.md](deploy/README.md)
3. Deploy: Follow platform-specific guides below

---

## 📚 Main Guides

### [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
Overview of all deployment configuration, file structure, and quick start.

### [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
Comprehensive 12-phase pre-launch checklist covering:
- Infrastructure setup
- Code quality
- Security hardening
- Performance optimization
- DNS & SSL
- Monitoring
- Testing

---

## 🔧 Platform-Specific Guides

### Backend (Railway)
**File:** [DEPLOYMENT.md](DEPLOYMENT.md)

**Covers:**
- Railway deployment steps
- Render Postgres database setup
- Environment variables (12 required)
- Database migrations
- Custom domain setup
- Health checks
- Monitoring & logs
- Troubleshooting

### Frontend (Vercel)
**File:** [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

**Covers:**
- Vercel deployment steps
- Build configuration
- Environment variables (1 required)
- Custom domain setup
- SSL configuration
- Performance optimization
- Troubleshooting

---

## 🛠️ Configuration Files

### Backend
- [railway.json](railway.json) - Railway deployment config
- [Procfile](Procfile) - Alternative start command
- [Dockerfile](Dockerfile) - Production Docker build
- [.dockerignore](.dockerignore) - Docker exclusions

### Frontend
- [frontend/vercel.json](frontend/vercel.json) - Vercel config
- [frontend/next.config.mjs](frontend/next.config.mjs) - Next.js production config
- [frontend/Dockerfile.local](frontend/Dockerfile.local) - Local Docker testing

---

## 🧪 Local Testing

### [deploy/README.md](deploy/README.md)
Guide to using Docker Compose for local testing.

### [deploy/docker-compose.yml](deploy/docker-compose.yml)
Full-stack local environment:
- PostgreSQL database
- Backend API
- Frontend app

### [deploy/.env.example](deploy/.env.example)
Template for all environment variables across:
- Production
- Staging
- Local development

---

## ✅ Checklists

### [deploy/deployment-checklist.md](deploy/deployment-checklist.md)
Quick reference checklist for deployment day:
- Pre-deployment checks
- Backend deployment steps
- Frontend deployment steps
- Custom domain setup
- Post-deployment testing

### [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
Comprehensive pre-launch verification (12 phases):
- Infrastructure
- Code quality
- Security
- Performance
- DNS & SSL
- Monitoring
- Testing
- Post-launch procedures

---

## 🔍 Verification

### [deploy/verify-deployment.sh](deploy/verify-deployment.sh)
Automated deployment verification script.

**Tests:**
- Health endpoints
- DNS resolution
- SSL certificates
- Security headers
- CORS configuration

**Usage:**
```bash
cd deploy
./verify-deployment.sh
```

---

## 📋 Environment Variables

### Backend (12 required)
See: [DEPLOYMENT.md](DEPLOYMENT.md#environment-variables)

```bash
DATABASE_URL              # Render Postgres
TRADIER_TOKEN             # Tradier API
TRADIER_BASE_URL          # api.tradier.com
JWT_SECRET                # Generate with openssl
ENCRYPTION_KEY            # Generate with openssl
RESEND_API_KEY            # Resend dashboard
SUPPORT_EMAIL             # Your email
APP_URL                   # https://app.cortexcapital.ai
NODE_ENV                  # production
ALLOWED_ORIGINS           # Frontend URLs
LOG_LEVEL                 # info
PORT                      # 3000
```

### Frontend (1 required)
See: [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md#environment-variables)

```bash
NEXT_PUBLIC_API_URL       # https://api.cortexcapital.ai
```

### Full Reference
See: [deploy/.env.example](deploy/.env.example)

---

## 🚀 Deployment Flow

### 1. Local Testing (Optional)
```bash
cd deploy
cp .env.example .env
# Edit .env with your keys
docker-compose up
```

### 2. Deploy Backend
```bash
# Push to GitHub
git push origin main

# Railway auto-deploys
# Set env vars in Railway dashboard
# Run migrations
railway run npm run db:migrate
```

**Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

### 3. Deploy Frontend
```bash
# Connect Vercel to GitHub
# Vercel auto-deploys
# Set NEXT_PUBLIC_API_URL in Vercel
```

**Guide:** [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

### 4. Configure Domains
```bash
# Add domains in Railway + Vercel
# Set DNS CNAME records
# Wait for SSL provisioning
```

**Guide:** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md#phase-5-dns--domain-setup)

### 5. Verify
```bash
cd deploy
./verify-deployment.sh
```

---

## 🆘 Troubleshooting

### Build Fails
1. Check logs: `railway logs` or Vercel dashboard
2. Verify TypeScript: `npm run build`
3. Check dependencies: `npm ci`

**Backend:** [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)
**Frontend:** [frontend/DEPLOYMENT.md#troubleshooting](frontend/DEPLOYMENT.md#troubleshooting)

### API Not Reachable
1. Verify `NEXT_PUBLIC_API_URL` in Vercel
2. Check CORS: `ALLOWED_ORIGINS` in Railway
3. Test health: `curl https://api.cortexcapital.ai/health`

### Database Connection Fails
1. Verify `DATABASE_URL` includes `?sslmode=require`
2. Check Render Postgres status
3. Run migrations: `railway run npm run db:migrate`

### DNS Not Resolving
1. Wait 5-60 minutes for propagation
2. Check with: `dig api.cortexcapital.ai`
3. Verify CNAME records in DNS provider

---

## 📊 File Structure

```
cortex-capital/
│
├── DEPLOYMENT_INDEX.md        ← You are here
├── DEPLOYMENT_SUMMARY.md      ← Overview & quick start
├── LAUNCH_CHECKLIST.md        ← Pre-launch verification
│
├── DEPLOYMENT.md              ← Backend (Railway) guide
├── railway.json               ← Railway config
├── Procfile                   ← Start command
├── Dockerfile                 ← Production build
├── .dockerignore              ← Docker exclusions
│
├── frontend/
│   ├── DEPLOYMENT.md          ← Frontend (Vercel) guide
│   ├── vercel.json            ← Vercel config
│   ├── next.config.mjs        ← Next.js config
│   └── Dockerfile.local       ← Local testing
│
└── deploy/
    ├── README.md              ← Deploy folder guide
    ├── docker-compose.yml     ← Local full-stack
    ├── .env.example           ← All env vars
    ├── deployment-checklist.md ← Quick reference
    └── verify-deployment.sh   ← Automated checks
```

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ Frontend loads at https://app.cortexcapital.ai
- ✅ Backend responds at https://api.cortexcapital.ai/health
- ✅ SSL certificates valid (green padlock)
- ✅ API calls work from frontend
- ✅ No errors in logs
- ✅ Database queries work
- ✅ Email sending works (REPORTER agent)

---

## 💡 Tips

### Before You Deploy
- [ ] Test locally with Docker Compose
- [ ] Generate secrets (`openssl rand -hex 64`)
- [ ] Review environment variables
- [ ] Read platform-specific guides

### During Deployment
- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Verify health endpoints
- [ ] Check logs for errors

### After Deployment
- [ ] Configure custom domains
- [ ] Verify SSL certificates
- [ ] Run verification script
- [ ] Monitor for 24-48 hours

---

## 📖 Additional Resources

### Platform Documentation
- **Railway:** https://docs.railway.app
- **Vercel:** https://vercel.com/docs
- **Render:** https://render.com/docs

### Framework Documentation
- **Next.js:** https://nextjs.org/docs
- **Fastify:** https://www.fastify.io/docs

### Tools
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **DNS Checker:** https://dnschecker.org
- **Lighthouse:** Chrome DevTools

---

## 🆘 Need Help?

1. **Check logs first:**
   ```bash
   railway logs --follow
   vercel logs --follow
   ```

2. **Review troubleshooting sections:**
   - [Backend troubleshooting](DEPLOYMENT.md#troubleshooting)
   - [Frontend troubleshooting](frontend/DEPLOYMENT.md#troubleshooting)

3. **Run verification script:**
   ```bash
   cd deploy
   ./verify-deployment.sh
   ```

4. **Check platform status:**
   - Railway: https://status.railway.app
   - Vercel: https://www.vercel-status.com
   - Render: https://status.render.com

---

**Ready to deploy? Start with [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) 🚀**
