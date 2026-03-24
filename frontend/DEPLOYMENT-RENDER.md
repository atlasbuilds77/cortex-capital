# Cortex Capital Frontend - Render Deployment

## Quick Deploy (5 minutes)

### 1. Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Select the `cortex-capital/frontend` directory

### 2. Configure Build Settings

| Setting | Value |
|---------|-------|
| **Name** | cortex-capital-frontend |
| **Region** | Oregon (or nearest) |
| **Branch** | main |
| **Root Directory** | frontend |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free (or Starter $7/mo for better performance) |

### 3. Environment Variables

Add these in the Render dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | production |
| `NEXT_PUBLIC_API_URL` | https://your-backend.onrender.com |
| `PORT` | 3000 |

### 4. Deploy

Click **Create Web Service** - Render will:
1. Clone your repo
2. Run `npm install && npm run build`
3. Start `npm start`
4. Assign a `.onrender.com` URL

### 5. Custom Domain (Optional)

1. Go to **Settings** → **Custom Domains**
2. Add your domain (e.g., `app.cortexcapital.com`)
3. Update DNS:
   - CNAME: `app` → `cortex-capital-frontend.onrender.com`
4. SSL is automatic

---

## Environment Variables Reference

```env
# Required
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://cortex-api.onrender.com

# Optional
NEXT_PUBLIC_FISHTANK_URL=https://fishtank.onrender.com
```

---

## Render vs Vercel

| Feature | Render | Vercel |
|---------|--------|--------|
| Free tier | ✅ Yes | ✅ Yes |
| Auto-deploy | ✅ Yes | ✅ Yes |
| Custom domains | ✅ Free | ✅ Free |
| SSL | ✅ Auto | ✅ Auto |
| Preview deploys | ❌ No | ✅ Yes |
| Edge functions | ❌ No | ✅ Yes |
| Same platform as backend | ✅ Yes | ❌ No |

**Why Render:** Backend is already on Render, keeps everything in one place.

---

## Full Stack on Render

With this setup, your entire stack is on Render:

| Service | Type | URL |
|---------|------|-----|
| Frontend | Web Service | cortex-capital-frontend.onrender.com |
| Backend | Web Service | cortex-api.onrender.com |
| Database | Postgres | (internal connection string) |

All in one dashboard. Simple.

---

## Troubleshooting

### Build fails
```bash
# Check Node version - Render uses Node 20 by default
node -v  # Should be 20.x

# Test build locally
npm run build
```

### "Cannot find module" errors
```bash
# Make sure all deps are in dependencies, not devDependencies
npm install <package> --save
```

### Slow cold starts (Free tier)
- Free tier spins down after 15 min inactivity
- First request after spin-down takes ~30s
- Upgrade to Starter ($7/mo) for always-on

---

## Monitoring

Render provides:
- **Logs** - Real-time in dashboard
- **Metrics** - CPU, memory, requests
- **Alerts** - Email on failures

---

## Rollback

1. Go to **Events** in dashboard
2. Find previous successful deploy
3. Click **Rollback to this deploy**

Done in seconds.
