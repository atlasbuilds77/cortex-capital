# Frontend Deployment Guide - Vercel

Production-ready Next.js 14 deployment on Vercel.

---

## Prerequisites

- Vercel account (free tier works)
- GitHub repo connected to Vercel
- Backend API URL (Railway deployment)

---

## Step-by-Step Deployment

### 1. Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 2. Connect Project to Vercel

**Option A: Via Dashboard (Recommended)**

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select `cortex-capital/frontend` as root directory
4. Framework preset: **Next.js** (auto-detected)
5. Click **Deploy**

**Option B: Via CLI**

```bash
cd frontend
vercel
```

Follow prompts to link project.

---

## Environment Variables

### Required Variables

Go to **Project Settings → Environment Variables** and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.cortexcapital.ai` | Production |
| `NEXT_PUBLIC_API_URL` | `https://cortex-capital-dev.up.railway.app` | Preview |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Development |

**IMPORTANT:** `NEXT_PUBLIC_` prefix makes variables available in the browser.

### How to Set

1. Project Settings → Environment Variables
2. Add each variable
3. Select environments (Production/Preview/Development)
4. Click **Save**

---

## Build Settings

Vercel auto-detects Next.js. Verify these settings:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)
- **Node Version:** 20.x (auto)

### Override if needed:

```json
// vercel.json already configured
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

---

## Domain Setup

### 1. Add Custom Domain

1. Project Settings → Domains
2. Add domain: `app.cortexcapital.ai`
3. Follow DNS instructions

### 2. DNS Configuration

**If using Vercel nameservers (easiest):**

Vercel provides nameservers → update at domain registrar.

**If using custom DNS:**

Add CNAME record:
```
CNAME  app  cname.vercel-dns.com
```

Or A record:
```
A  app  76.76.21.21
```

### 3. SSL Certificate

- Auto-provisioned by Vercel
- Ready in ~60 seconds
- Auto-renews

---

## Deployment Flow

### Automatic Deployments

- **Production:** Push to `main` branch
- **Preview:** Push to any branch or open PR
- **Development:** Local `vercel dev`

### Manual Deploy

```bash
vercel --prod  # Deploy to production
vercel         # Deploy preview
```

---

## Post-Deployment Checklist

- [ ] Site loads at production URL
- [ ] API requests reach backend (check Network tab)
- [ ] No console errors
- [ ] Security headers present (check DevTools → Network → Response Headers)
- [ ] Images load correctly
- [ ] SSL certificate valid (green padlock)
- [ ] Custom domain resolves correctly

---

## Environment-Specific Testing

### Production
```
https://app.cortexcapital.ai
```

### Preview (automatic per-branch)
```
https://cortex-capital-frontend-git-[branch].vercel.app
```

### Development
```bash
npm run dev
# or
vercel dev  # Uses Vercel CLI for production-like env
```

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Deployment → Click failed deployment
2. Review **Build Logs**

**Common fixes:**
- TypeScript errors: `npm run typecheck`
- ESLint errors: `npm run lint`
- Missing env vars: Add to Vercel settings

### API Requests Fail

**Verify:**
1. `NEXT_PUBLIC_API_URL` is set correctly
2. Backend is running (Railway deployment)
3. CORS headers allow your domain

**Check Network tab:**
- Request URL should match `NEXT_PUBLIC_API_URL`
- Response should not be CORS error

### Environment Variables Not Working

**Rules:**
- Browser variables MUST start with `NEXT_PUBLIC_`
- Server-side variables don't need prefix
- Rebuild required after changing env vars

**Force rebuild:**
```bash
vercel --prod --force
```

---

## Performance Optimization

### Image Optimization

Already configured in `next.config.mjs`:
- AVIF/WebP formats
- Responsive sizes
- 60s cache TTL

### Bundle Analysis

```bash
npm install -D @next/bundle-analyzer

# Add to next.config.mjs
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# Run analysis
ANALYZE=true npm run build
```

---

## Monitoring

### Vercel Analytics (Built-in)

1. Project Settings → Analytics
2. Enable **Web Analytics**
3. View real-time metrics

### Custom Monitoring

Add to `app/layout.tsx`:

```typescript
// Sentry, PostHog, etc.
import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize monitoring
  }, [])
  
  return <html>{children}</html>
}
```

---

## Rollback

### Via Dashboard

1. Deployments tab
2. Find previous successful deployment
3. Click **⋯** → **Promote to Production**

### Via CLI

```bash
vercel rollback
```

---

## Security Checklist

- [x] Security headers configured (next.config.mjs)
- [x] HTTPS enforced (automatic on Vercel)
- [x] API URL validation
- [x] No secrets in client code
- [ ] Content Security Policy (add if needed)
- [ ] Rate limiting on API endpoints

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Issues:** Check deployment logs first

---

**Deployed frontend should be live at your custom domain within minutes of setup.**
