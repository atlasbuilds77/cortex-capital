# Cortex Capital - Production Ready Guide

## ✅ Completed Implementation

### 1. Authentication System ✅
**Files:** `lib/auth.ts`, `routes/auth.ts`, `migrations/006_auth_tables.sql`

- ✅ POST `/api/auth/signup` - Create account with email/password
- ✅ POST `/api/auth/login` - Login with JWT tokens
- ✅ POST `/api/auth/refresh` - Refresh access token
- ✅ POST `/api/auth/logout` - Invalidate session
- ✅ POST `/api/auth/forgot-password` - Request password reset
- ✅ POST `/api/auth/reset-password` - Reset password with token
- ✅ GET `/api/auth/me` - Get current user profile

**Security Features:**
- JWT access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Session management with device tracking
- Password hashing with bcrypt (12 rounds)
- Rate limiting (5 req/min for auth endpoints)
- Audit logging for security events

### 2. User Management ✅
**Files:** `routes/user.ts`

- ✅ GET `/api/user/profile` - Get user profile with preferences
- ✅ PUT `/api/user/profile` - Update email, tier, risk_profile
- ✅ PUT `/api/user/preferences` - Update trading preferences
- ✅ DELETE `/api/user` - Delete account (cascades to all data)

### 3. Broker Management ✅
**Files:** `routes/brokers.ts`

- ✅ GET `/api/brokers` - List connected brokers
- ✅ POST `/api/brokers/connect` - Connect broker with credential encryption
- ✅ DELETE `/api/brokers/:id` - Disconnect broker
- ✅ GET `/api/brokers/:id/sync` - Force sync broker data

**Supported Brokers:**
- Tradier
- Alpaca
- Robinhood (unofficial API)
- Webull (unofficial API)

### 4. Request Validation ✅
**Files:** `lib/validation.ts`

All endpoints validate inputs with Zod schemas:
- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- Enum validation for tiers/profiles
- Numeric range validation for allocations
- UUID validation

### 5. Rate Limiting ✅
**Files:** `lib/rate-limit.ts`

Different limits by endpoint type:
- **Auth endpoints:** 5 req/min (brute force protection)
- **Trading endpoints:** 10 req/min (prevent accidents)
- **Read endpoints:** 200 req/min (generous for dashboard)
- **Global default:** 100 req/min

### 6. Database Schema ✅
**Files:** `migrations/006_auth_tables.sql`

Added tables:
- `sessions` - JWT refresh token management
- `password_reset_tokens` - Password reset flow
- `audit_log` - Security event tracking
- Updated `user_preferences` with `day_trading_allocation`, `options_allocation`
- Updated `users` with `email_verified` flag

### 7. Health Check Improvements ✅
**Files:** `routes/health.ts`

- ✅ GET `/health` - Basic uptime check
- ✅ GET `/health/detailed` - Full system diagnostics
  - Database connection + latency + pool stats
  - Tradier API health + latency
  - Memory usage monitoring

### 8. Environment Variables ✅
**Files:** `.env.example`

All required vars documented:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Token signing (64 chars)
- `ENCRYPTION_KEY` - Credential encryption (32 chars)
- `TRADIER_TOKEN`, `ALPACA_API_KEY`, etc.
- Rate limit configuration
- CORS origins

### 9. Security Hardening ✅
- CSRF protection via JWT tokens
- Credential encryption (AES-256-CBC)
- SQL injection prevention (parameterized queries)
- XSS protection (no user input in HTML)
- Rate limiting on all endpoints
- Audit logging for security events
- Session management with device tracking
- Password reset token expiration (1 hour)

---

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

Generate secrets:

```bash
# JWT Secret (64 characters)
openssl rand -hex 64

# Encryption Key (32 characters - CRITICAL)
openssl rand -base64 32 | head -c 32
```

### 3. Run Database Migrations

```bash
# Run all migrations in order
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_phase2_enhancements.sql
psql "$DATABASE_URL" -f migrations/003_profiles_and_options.sql
psql "$DATABASE_URL" -f migrations/004_engine_tables.sql
psql "$DATABASE_URL" -f migrations/005_preferences.sql
psql "$DATABASE_URL" -f migrations/006_auth_tables.sql
```

Or use the migration runner:

```bash
node migrate-runner.cjs
```

### 4. Start Production Server

```bash
# Use the new production server
npm run build
NODE_ENV=production node dist/server-production.js

# Or for development
tsx server-production.ts
```

---

## 🔒 Security Checklist

Before going live:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (64+ random chars)
- [ ] Use strong `ENCRYPTION_KEY` (exactly 32 chars)
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain only
- [ ] Enable SSL/TLS for database connection
- [ ] Use real Tradier production API (not sandbox)
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Enable database backups
- [ ] Review rate limits for your expected traffic
- [ ] Set up email service for password resets
- [ ] Review audit logs regularly

---

## 📊 API Authentication Flow

### 1. Signup
```bash
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "tier": "scout",
  "risk_profile": "moderate"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "tier": "scout" },
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": "24h"
  }
}
```

### 2. Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: Same as signup
```

### 3. Using Protected Endpoints
```bash
GET /api/user/profile
Headers:
  Authorization: Bearer eyJhbG...

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "tier": "scout",
    "risk_profile": "moderate",
    "investment_horizon": "medium",
    "constraints": { "never_sell": [], ... }
  }
}
```

### 4. Refresh Token
```bash
POST /api/auth/refresh
{
  "refresh_token": "eyJhbG..."
}

Response:
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "expires_in": "24h"
  }
}
```

---

## 🔌 Broker Connection Flow

### 1. Connect Tradier
```bash
POST /api/brokers/connect
Headers:
  Authorization: Bearer <access_token>

Body:
{
  "broker": "tradier",
  "credentials": {
    "token": "your_tradier_token"
  }
}
```

### 2. Connect Alpaca
```bash
POST /api/brokers/connect
{
  "broker": "alpaca",
  "credentials": {
    "api_key": "PK...",
    "api_secret": "..."
  }
}
```

### 3. List Brokers
```bash
GET /api/brokers
Headers:
  Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "broker": "tradier",
      "connected_at": "2026-03-21T12:00:00Z",
      "last_sync": "2026-03-21T12:30:00Z"
    }
  ]
}
```

---

## 🧪 Testing

### Test Authentication
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","tier":"scout"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Get profile (use token from login)
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <access_token>"
```

### Test Health Check
```bash
curl http://localhost:3000/health/detailed
```

---

## 📈 Next Steps

### Missing Endpoints (from original requirements)

These endpoints from the original server.ts need to be migrated with authentication:

1. **STRATEGIST endpoints** (Phase 2)
   - POST `/api/strategist/generate-plan`
   - GET `/api/strategist/plans/:userId`

2. **EXECUTOR endpoints** (Phase 2)
   - POST `/api/executor/execute`

3. **REPORTER endpoints** (Phase 2)
   - POST `/api/reporter/send-email`
   - GET `/api/reporter/preferences/:userId`

4. **OPTIONS endpoints** (Phase 3)
   - GET `/api/options/leaps/:userId`
   - GET `/api/options/covered-calls/:userId`
   - GET `/api/options/greeks/:userId`

5. **DAY TRADING endpoints** (Phase 3)
   - GET `/api/day-trading/setups/:userId`
   - GET `/api/momentum/rotation/:userId`

6. **EXECUTION endpoints**
   - POST `/api/execute/momentum-rotation`
   - POST `/api/execute/trade`
   - GET `/api/broker/alpaca/account`
   - GET `/api/broker/robinhood/account`
   - POST `/api/broker/robinhood/trade`
   - GET `/api/fishtank/live`

### Migration Strategy

1. Add authentication to each endpoint group
2. Add request validation schemas
3. Add proper error handling
4. Add rate limiting (trading = strict)
5. Add audit logging for trades
6. Test thoroughly before deployment

---

## 🎯 What's Production Ready Now

✅ Complete authentication system  
✅ User management with preferences  
✅ Broker connection management  
✅ Request validation on all inputs  
✅ Rate limiting to prevent abuse  
✅ Audit logging for security  
✅ Health checks with diagnostics  
✅ Error handling  
✅ Database migrations  
✅ Environment configuration  
✅ Graceful shutdown  

**Missing:** Email integration for password resets (stub in place)

---

## 🔥 Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run migrations
node migrate-runner.cjs

# 4. Start server
tsx server-production.ts

# 5. Test
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","tier":"scout"}'
```

---

## 📝 Notes

- The new `server-production.ts` has ALL auth, user, broker, and health endpoints
- The original `server.ts` has ALL the trading/agent endpoints but NO auth
- Next step: Merge the two by adding `preHandler: authenticate` to each trading endpoint
- All credentials are encrypted in the database (AES-256-CBC)
- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire in 24h (access) and 7d (refresh)
- Rate limits are configurable via environment variables

---

**Last Updated:** 2026-03-21  
**Status:** Core authentication and user management complete. Trading endpoints need auth migration.
