# Next Steps After Migration

## Immediate Actions

### 1. Add Missing Dependencies
The migrated code needs these packages:
```bash
npm install pg uuid bcrypt jsonwebtoken
npm install --save-dev @types/pg @types/bcrypt @types/jsonwebtoken
```

### 2. Set Environment Variables
Create/update `.env.local` with:
```env
# Database
DATABASE_URL=your_postgres_connection_string

# Auth
JWT_SECRET=your_jwt_secret_here

# Alpaca (Paper Trading)
ALPACA_API_KEY=PKXPAHHSVOFCAXOXINQXP6UXST
ALPACA_SECRET_KEY=4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV

# Optional: DeepSeek for agent chat
DEEPSEEK_API_KEY=your_deepseek_key
```

### 3. Test Locally
```bash
npm run dev
```

Then visit:
- http://localhost:3000/login
- http://localhost:3000/dashboard
- http://localhost:3000/office

Check `TEST-API-ROUTES.md` for detailed testing steps.

---

## After Successful Testing

### 4. Stop the Old Backend
```bash
# Check PM2 status
pm2 status

# Stop the old Fastify server
pm2 stop cortex-backend
pm2 delete cortex-backend

# Save PM2 state
pm2 save
```

### 5. Update Production Environment
In Vercel dashboard, add the same environment variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `ALPACA_API_KEY`
- `ALPACA_SECRET_KEY`
- `DEEPSEEK_API_KEY` (optional)

### 6. Deploy to Production
```bash
vercel --prod
```

Or just push to main branch (if auto-deploy is enabled).

---

## Potential Issues & Fixes

### Issue: "pg" module not found
**Fix:** Run `npm install pg`

### Issue: Auth middleware errors
**Fix:** Make sure `JWT_SECRET` is set in `.env.local`

### Issue: Database connection fails
**Fix:** Verify `DATABASE_URL` is correct and accessible

### Issue: Agent souls not loading
**Fix:** Check that files exist in `agents/souls/` and paths in agent code match

### Issue: SSE stream not working
**Fix:** Make sure `runtime = 'nodejs'` is set in stream route

---

## Database Tables Required

Make sure these tables exist in your Postgres database:
- `users` (id, email, password_hash, tier, risk_profile, etc.)
- `user_preferences` (user_id, investment_horizon, constraints, etc.)
- `agent_discussions` (id, user_id, discussion_type, messages, etc.)
- `trade_history` (id, user_id, symbol, action, quantity, etc.)
- `audit_log` (id, user_id, action, metadata, created_at)

If missing, run the schema migration from `cortex-capital/schema.sql` (if it exists).

---

## Monitoring

### Check Health
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Watch Logs
```bash
npm run dev
# Watch console for API requests and errors
```

### Production Logs
```bash
vercel logs
```

---

## Performance Tips

### 1. Add Database Connection Pooling
Already implemented in `lib/db.ts` - verify `max` pool size is appropriate.

### 2. Cache Alpaca Responses
Consider adding Redis or in-memory caching for frequently accessed Alpaca data.

### 3. Optimize SSE Connections
Monitor how many concurrent SSE streams are open. Consider connection limits.

---

## Security Checklist

✅ JWT_SECRET is strong and unique
✅ Database credentials are not committed
✅ ALPACA_SECRET_KEY is not in frontend code
✅ Password hashing uses bcrypt with SALT_ROUNDS >= 10
✅ Auth middleware validates tokens on protected routes
✅ SQL queries use parameterized statements (prevent injection)

---

## Rollback Plan (If Needed)

If something goes wrong in production:

1. **Revert deploy:**
   ```bash
   vercel rollback
   ```

2. **Restart old backend:**
   ```bash
   pm2 start cortex-backend
   ```

3. **Update frontend to point back:**
   ```env
   # .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Redeploy with old config**

---

## Success Metrics

After migration is complete and deployed:

✅ **Latency:** API response times should be similar or faster
✅ **Error rate:** Should be < 1% for API routes
✅ **User experience:** No functional regressions
✅ **Deploy time:** Reduced (only one app to deploy)
✅ **Maintenance:** Easier (single codebase)

---

## Future Improvements

### 1. Migrate Remaining Backend Features
If there are other routes in `cortex-capital/server.ts` not yet migrated, add them.

### 2. Add API Rate Limiting
Use Next.js middleware or a library like `express-rate-limit` equivalent.

### 3. Improve Error Handling
Standardize error responses across all routes.

### 4. Add Request Logging
Implement structured logging for all API requests.

### 5. TypeScript Types
Share types between frontend and API routes for better type safety.

---

**Migration completed:** 2026-03-27
**Status:** Ready for testing
**Blockers:** None - ready to proceed with testing
