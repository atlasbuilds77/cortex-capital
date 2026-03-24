# Deploy Folder - Local Testing & Deployment Resources

This folder contains resources for local testing and deployment configuration.

---

## Local Testing with Docker Compose

### Prerequisites

- Docker Desktop installed
- `.env` file configured (copy from `.env.example`)

### Quick Start

```bash
# From project root
cd deploy

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Services

- **postgres:** PostgreSQL 16 on port 5432
- **backend:** API server on port 3000
- **frontend:** Next.js app on port 3001

### URLs

- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Backend Health: http://localhost:3000/health
- Postgres: localhost:5432

### Database Access

```bash
# Connect to database
docker exec -it cortex-postgres psql -U cortex -d cortex_capital

# View tables
\dt

# Check migrations
SELECT * FROM schema_migrations;
```

---

## Files in This Folder

### docker-compose.yml
Full-stack local environment for testing production builds.

### .env.example
Template for environment variables across all deployment environments:
- Production (Railway + Vercel)
- Staging
- Local development

### deployment-checklist.md
Quick reference checklist for deploying to production.

---

## Deployment Guides

### Backend (Railway)
See: `/Users/atlasbuilds/clawd/cortex-capital/DEPLOYMENT.md`

### Frontend (Vercel)
See: `/Users/atlasbuilds/clawd/cortex-capital/frontend/DEPLOYMENT.md`

### Launch Checklist
See: `/Users/atlasbuilds/clawd/cortex-capital/LAUNCH_CHECKLIST.md`

---

## Common Tasks

### Rebuild Containers

```bash
docker-compose build --no-cache
docker-compose up
```

### Run Migrations

```bash
# Migrations run automatically on postgres startup
# To re-run manually:
docker exec -it cortex-postgres psql -U cortex -d cortex_capital -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up --build
```

---

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Database not ready → Wait 10-20 seconds
- Missing env vars → Check `.env` file
- Port 3000 in use → Kill process or change PORT

### Frontend won't build

**Check logs:**
```bash
docker-compose logs frontend
```

**Common issues:**
- API URL wrong → Check NEXT_PUBLIC_API_URL in docker-compose.yml
- Dependencies missing → Rebuild with `--no-cache`

### Database connection fails

**Verify postgres is running:**
```bash
docker-compose ps postgres
```

**Check health:**
```bash
docker exec cortex-postgres pg_isready -U cortex
```

**Connection string:**
```
postgresql://cortex:cortex_local_password@postgres:5432/cortex_capital
```

---

## Production vs Local Differences

### Local (Docker Compose)
- All services on one machine
- Postgres in container
- Logs via `docker-compose logs`
- Self-signed SSL (optional)

### Production
- Backend: Railway
- Frontend: Vercel
- Database: Render Postgres
- Logs: Railway dashboard / Vercel dashboard
- SSL: Auto-provisioned

---

## Next Steps

1. Test locally with Docker Compose
2. Follow deployment guides for Railway/Vercel
3. Use launch checklist before going live
4. Monitor after deployment

---

**Questions? See main deployment guides or check logs.**
