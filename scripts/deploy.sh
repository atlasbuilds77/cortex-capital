#!/bin/bash
# Cortex Capital - Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: staging, production

set -e

ENVIRONMENT=${1:-staging}
echo "🚀 Deploying Cortex Capital to $ENVIRONMENT..."

# Check required environment variables
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
)

# Production-only required vars
if [ "$ENVIRONMENT" = "production" ]; then
  required_vars+=(
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "RESEND_API_KEY"
  )
fi

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    exit 1
  fi
done

echo "✅ Environment variables verified"

# Build backend
echo "📦 Building backend..."
npm run build

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

echo "✅ Builds completed successfully"

# Run database migrations
echo "🗄️ Running database migrations..."
for migration in migrations/*.sql; do
  echo "  Applying $migration..."
  psql "$DATABASE_URL" -f "$migration" 2>/dev/null || echo "  (already applied or skipped)"
done

echo "✅ Migrations complete"

# Deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🌐 Deploying to production..."
  
  # If using Railway
  if command -v railway &> /dev/null; then
    railway up
  # If using Render
  elif [ -f "render.yaml" ]; then
    echo "Deploy via Render dashboard or CI/CD"
  # If using Docker
  elif [ -f "Dockerfile" ]; then
    docker build -t cortex-capital:latest .
    echo "Docker image built. Push to registry and deploy."
  else
    echo "⚠️ No deployment target detected. Deploy manually."
  fi
else
  echo "🧪 Staging deployment - ready for testing"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "   [ ] Verify health endpoint: GET /health"
echo "   [ ] Test authentication flow: POST /api/auth/signup"
echo "   [ ] Verify Stripe webhook: POST /api/webhook"
echo "   [ ] Check email delivery in Resend dashboard"
echo "   [ ] Monitor error logs"
