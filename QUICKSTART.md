# Cortex Capital - Quick Start ⚡

**Get running in 5 minutes**

---

## 1. Install Dependencies (30 seconds)

```bash
cd /Users/atlasbuilds/clawd/cortex-capital

# Backend
npm install

# Frontend
cd dashboard && npm install && cd ..
```

---

## 2. Start Backend (10 seconds)

```bash
npm run dev
```

**Expected output:**
```
🚀 Cortex Capital API running on http://localhost:3000
```

**Test it:**
```bash
curl http://localhost:3000/health
# {"status":"ok", ...}
```

---

## 3. Start Dashboard (10 seconds)

**New terminal:**
```bash
cd /Users/atlasbuilds/clawd/cortex-capital/dashboard
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:    http://localhost:3001
```

---

## 4. Analyze a Portfolio (30 seconds)

1. Open http://localhost:3001
2. Enter account ID: `6YB71689` (Aman's account)
3. Click **"Analyze Portfolio"**
4. View results:
   - Portfolio health score
   - Risk metrics
   - Positions (if any)
   - Sector concentration

---

## 5. Test Other Accounts

Try these Tradier accounts:

**Aman (all cash):**
```
Account: 6YB71689
Health: 100 (all cash)
```

**Carlos (all cash):**
```
Account: 6YB71747
Health: 100 (all cash)
```

**Rohrz (may have positions):**
```
Account: 6YB72868
Health: TBD
```

---

## Troubleshooting

**Backend won't start?**
```bash
# Check if .env exists
ls .env

# If missing, copy example
cp .env.example .env

# Add Tradier token
echo "TRADIER_TOKEN=madEKNKYeffHuxcHfBGoZSIKXywO" >> .env
```

**Dashboard shows "Failed to fetch"?**
- Ensure backend is running on port 3000
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL=http://localhost:3000` in `dashboard/.env.local`

**"No positions found"?**
- Normal for accounts with 100% cash
- Try account 6YB72868 (Rohrz - may have stocks)

---

## What's Next?

Read the docs:
- **README.md** - Full overview
- **docs/SETUP.md** - Detailed setup
- **docs/API.md** - API reference
- **PHASE1-COMPLETE.md** - What was built

---

**That's it! You're running Cortex Capital locally.** 🎉

Need help? Check `docs/SETUP.md` for troubleshooting.

---

**Built by Atlas** ⚡
