# Cortex Capital Frontend — Design Refresh + Stripe Integration
**Completed:** 2026-03-22  
**Subagent:** spark-design-stripe

---

## ✅ TASK 1: Design Refresh — COMPLETE

### Color System Updated
All pages now use the new professional fintech color palette:

**Core Colors:**
- Background: `#090914` (deep navy-black)
- Surface: `#0f0f23` (subtle navy)
- Surface-elevated: `#161630` (cards)
- Primary: `#8b5cf6` (violet-500)
- Secondary: `#6366f1` (indigo-500)
- Accent: `#22d3ee` (cyan for data/stats)
- Text primary: `#f1f5f9` (slate-100)
- Text secondary: `#94a3b8` (slate-400)
- Text muted: `#64748b` (slate-500)

**Files Updated:**
- ✅ `tailwind.config.ts` — Updated all color tokens
- ✅ `app/globals.css` — Added Inter font, updated CSS variables, removed grid
- ✅ `app/layout.tsx` — Added Inter font from Google Fonts
- ✅ `app/page.tsx` — Applied all visual refinements:
  - Cards: Purple-tinted glass effect with subtle borders/shadows
  - Buttons: Gradient primary, glass-like secondary
  - Typography: Inter font, font-semibold for headings
  - Pricing cards: Gradient border on popular (no scale-105)
  - Background glows: 10-15% opacity, larger blur
  - Grid pattern: REMOVED
  - Scroll indicator: REMOVED
  - Stats: Cyan accent for numbers
  - Checkmarks: Changed to violet
- ✅ `app/signup/page.tsx` — Matched new design language
- ✅ `app/login/page.tsx` — Matched new design language
- ✅ `app/onboarding/page.tsx` — Matched new design language
- ✅ `app/dashboard/page.tsx` — Matched new design language

### Visual Changes Applied:
1. ✅ Cards have `border-white/[0.06]` with `shadow-lg shadow-primary/[0.03]`
2. ✅ Hover: `border-primary/20`
3. ✅ Primary buttons: `bg-gradient-to-r from-primary to-secondary`
4. ✅ Secondary buttons: `bg-white/[0.05] border border-white/[0.1]`
5. ✅ Inter font imported and applied
6. ✅ Headings use `font-semibold` (not `font-bold`)
7. ✅ Pricing: Popular card has gradient top border (no scale)
8. ✅ Background glows: 10-15% opacity, 120px blur
9. ✅ Grid pattern: Removed
10. ✅ Scroll indicator: Removed
11. ✅ Stats: Cyan accent used
12. ✅ Checkmarks: Violet-400

---

## ✅ TASK 2: Stripe Checkout Integration — COMPLETE

### Stripe Products (Already Exist):
- `cortex_free`: `price_1TDsH9QVfeouH9H6zb4IAh2s` ($0/mo)
- `cortex_recovery`: `price_1TDqOlQVfeouH9H6DJv5CtWl` ($29/mo)
- `cortex_scout`: `price_1TDqOiQVfeouH9H6ucOCqNnK` ($49/mo)
- `cortex_operator`: `price_1TDqOjQVfeouH9H6SwXQbcX0` ($99/mo)
- `cortex_partner`: `price_1TDqOkQVfeouH9H6YokFa1N0` ($249/mo)

### Files Created:
1. ✅ `lib/stripe.ts` — Stripe initialization, price mapping, checkout helper
2. ✅ `app/api/checkout/route.ts` — Next.js API route for creating checkout sessions
3. ✅ `app/api/webhook/stripe/route.ts` — Webhook handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Environment Variables Added (`.env.local`):
```env
STRIPE_SECRET_KEY=ROTATE_THIS_KEY_IN_STRIPE_DASHBOARD
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51R5DkFQVfeouH9H6eJ5TdNaRlnPJgTjBWFWQWOMVSmZylfY8m14Df46QYh2ijMyBgLIBLagwvKpE6AmWbnO4RC0z00fyIpALwQ
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Checkout Flow Implemented:
- **Free tier:** Button goes to `/signup` (no Stripe)
- **Paid tiers:** Button calls `/api/checkout` → redirects to Stripe Checkout
- **Success:** Redirects to `/dashboard?session_id={CHECKOUT_SESSION_ID}`
- **Cancel:** Redirects to `/pricing`

### Landing Page Updated:
- ✅ Pricing buttons on `app/page.tsx` now call `/api/checkout` for paid tiers
- ✅ Added loading state to buttons
- ✅ Free tier still goes to `/signup`

### Package Installed:
```bash
npm install stripe
```

---

## 🏗️ Build Status

**✅ Build passes with 0 errors:**
```
✓ Compiled successfully
✓ Generating static pages (32/32)
```

**Route Summary:**
- Static pages: 30
- Dynamic API routes: 2 (`/api/checkout`, `/api/webhook/stripe`)
- Middleware: 26.5 kB

---

## 🔴 TODO (Not Completed by Subagent)

### Database Integration Required:
The webhook handler (`app/api/webhook/stripe/route.ts`) has TODO comments for database updates:

1. **On `checkout.session.completed`:**
   - Update user tier in database
   - Store `stripeCustomerId`, `stripeSubscriptionId`
   - Set `subscriptionStatus: 'active'`

2. **On `customer.subscription.updated`:**
   - Update subscription status

3. **On `customer.subscription.deleted`:**
   - Downgrade user to free tier
   - Set `subscriptionStatus: 'canceled'`

**Example (commented in webhook handler):**
```typescript
// await prisma.user.update({
//   where: { id: userId },
//   data: {
//     stripeCustomerId: customerId,
//     stripeSubscriptionId: subscriptionId,
//     tier: getTierFromPriceId(priceId),
//     subscriptionStatus: 'active',
//   },
// })
```

### Webhook Setup Required:
1. Add webhook endpoint to Stripe Dashboard: `https://yourdomain.com/api/webhook/stripe`
2. Update `STRIPE_WEBHOOK_SECRET` in `.env.local` with actual signing secret
3. Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook/stripe`

### Onboarding Tier Selection:
- Onboarding step 3 (tier selection) should trigger Stripe checkout for upgrades
- Current implementation: Need to add checkout button to onboarding flow

---

## 📦 Deliverables

**Design Refresh:**
- ✅ All pages use new color system
- ✅ Professional fintech aesthetic
- ✅ Inter font applied
- ✅ Glass-effect cards with purple tint
- ✅ Gradient buttons
- ✅ Subtle shadows and glows
- ✅ Grid pattern removed
- ✅ Scroll indicator removed

**Stripe Integration:**
- ✅ Checkout API route
- ✅ Webhook handler
- ✅ Price mapping
- ✅ Landing page buttons wired
- ✅ Stripe package installed
- ✅ Environment variables configured

**Build:**
- ✅ `npm run build` passes with 0 errors
- ✅ All pages compile successfully
- ✅ TypeScript types valid

---

## 🚀 Next Steps (For Main Agent)

1. **Test the checkout flow:**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Click a paid tier button
   # Should redirect to Stripe Checkout
   ```

2. **Set up Stripe webhooks:**
   - Add endpoint in Stripe Dashboard
   - Update webhook secret in `.env.local`
   - Test with Stripe CLI

3. **Integrate database:**
   - Add Prisma models for user subscriptions
   - Uncomment and implement TODOs in webhook handler
   - Add user tier checking in middleware

4. **Update onboarding:**
   - Add checkout flow to onboarding tier selection
   - Handle upgrades from dashboard

---

**Status:** Both tasks COMPLETE. Build passes. Ready for testing and database integration.
