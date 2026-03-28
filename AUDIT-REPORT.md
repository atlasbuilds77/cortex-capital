# Cortex Capital Frontend Audit Report

**Audit Date:** 2026-03-21  
**Auditor:** Opus (AI Agent)  
**Status:** Completed

---

## Executive Summary

The Cortex Capital frontend redesign is mostly production-ready with a consistent dark theme and good UI/UX. However, there are several critical and moderate issues that need to be addressed before production deployment.

**Critical Issues:** 3  
**Moderate Issues:** 7  
**Low Priority Issues:** 4  
**Total Issues Found:** 14

---

## Critical Issues 🔴

### 1. Inconsistent Pricing in FAQ vs Landing Page
**Location:** `lib/copy.ts` (line 107)  
**Issue:** FAQ states pricing as "$29/month" while the landing page and admin dashboard use the correct tier pricing (Scout $49, Operator $99, Partner $249).

**Current (FAQ):**
```
"Free trial for 30 days, then $29/month for portfolios under $50k. We scale pricing with portfolio size but cap at $99/month even for million-dollar accounts."
```

**Expected:** Should reference Scout ($49), Operator ($99), Partner ($249) tiers.

---

### 2. Broken Navigation Links - Missing Pages
**Location:** `app/page.tsx` (lines 689-691)  
**Issue:** Footer links to /about, /contact, and /careers pages that don't exist.

**Missing pages:**
- `/about` - No route exists
- `/contact` - No route exists  
- `/careers` - No route exists

---

### 3. Inconsistent Tier Names in Admin Users Page
**Location:** `app/admin/users/page.tsx` (lines 26-110)  
**Issue:** Admin users page uses "Free", "Pro", "Elite", "Enterprise" tiers instead of the correct "Scout", "Operator", "Partner" tiers.

**Current dummy data uses:**
- Free
- Pro
- Elite  
- Enterprise

**Expected (per requirements):**
- Scout
- Operator
- Partner

---

## Moderate Issues 🟡

### 4. Inconsistent Agent Names in Dashboard Trades
**Location:** `app/dashboard/trades/page.tsx` (lines 19-33)  
**Issue:** Trade history uses different agent names than the official 7 agents. Uses "Momentum Hunter", "Value Scout", "Risk Guardian", etc. instead of ANALYST, STRATEGIST, EXECUTOR, REPORTER, OPTIONS_STRATEGIST, DAY_TRADER, MOMENTUM.

---

### 5. Inconsistent Agent Names in Settings Preferences
**Location:** `app/settings/preferences/page.tsx` (lines 52-55)  
**Issue:** Uses "Helios", "Nebula", "Oracle", "Meridian" agent names instead of the official 7 agents.

---

### 6. Inconsistent Agent Names in Agent Status Component
**Location:** `components/dashboard/agent-status.tsx` (lines 36-57)  
**Issue:** Uses mock data with "Helios", "Meridian", "Oracle" agent names.

---

### 7. Placeholder Emails in Admin Users Data
**Location:** `app/admin/users/page.tsx` (lines 24-110)  
**Issue:** Contains hardcoded placeholder emails like `john@example.com`, `sarah@example.com`, etc. Should be replaced with API calls.

---

### 8. Billing Page Uses Wrong Plan Names
**Location:** `app/settings/billing/page.tsx` (lines 19-45)  
**Issue:** Uses "Starter", "Pro", "Enterprise" plan names with $29/$99/$299 pricing. Should use Scout/Operator/Partner with $49/$99/$249.

---

### 9. Settings Billing Page - Wrong Pricing
**Location:** `app/settings/billing/page.tsx`  
**Issue:** 
- "Starter" at $29 should be "Scout" at $49
- "Pro" at $99 (correct price, wrong name) should be "Operator"
- "Enterprise" at $299 should be "Partner" at $249

---

### 10. Inconsistent Tier Badge Configuration  
**Location:** `components/ui/tier-badge.tsx` (line 47)  
**Issue:** Description says "Elite autonomous partner" which mixes old "Elite" terminology with new "Partner" tier.

---

## Low Priority Issues 🟢

### 11. Fishtank Page Uses Old Agent Names
**Location:** `app/fishtank/page.tsx` (lines 79-97)  
**Issue:** Mock data uses "Helios" and "Meridian" agent names.

---

### 12. Missing aria-label on Some Interactive Elements
**Location:** Various components  
**Issue:** Some buttons and interactive elements could benefit from better aria-labels for accessibility.

**Examples:**
- Mobile menu toggle in `app/settings/layout.tsx` - has aria-label ✅
- Filter dropdowns in admin users - missing aria-labels

---

### 13. Hardcoded Dates in Invoice Data
**Location:** `app/settings/billing/page.tsx` (lines 50-54)  
**Issue:** Contains hardcoded 2024 dates in invoice mock data.

---

### 14. Admin Dashboard Chart Shows Old Tier References
**Location:** `app/admin/page.tsx` (lines 37-39)  
**Issue:** Shows "Scout ($49/mo)", "Operator ($99/mo)", "Partner ($249/mo)" which is correct, but values are all 0.

---

## TypeScript/Code Quality ✅

**No TypeScript errors found** - `npx tsc --noEmit` returns clean.

---

## Dark Theme Consistency ✅

The dark theme is consistent across all pages, using:
- Background: `bg-background` (#0a0a0f)
- Surface: `bg-surface` (#1a1a2e)
- Elevated: `bg-surface-elevated` (#12121a)
- Primary gradients: Purple/blue (`#6366f1` → `#8b5cf6` → `#a855f7`)
- Accent: Cyan/teal (`#06b6d4` → `#14b8a6`)

---

## Responsive Design ✅

Good responsive design implementation found:
- Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- Mobile navigation menus implemented
- Grid layouts adjust appropriately

---

## Accessibility Notes

**Good practices found:**
- Proper form labels with `htmlFor`
- Icon buttons with `aria-label` or `aria-hidden="true"`
- Focus states on interactive elements
- Semantic HTML structure

**Could be improved:**
- Add `aria-labels` to filter dropdowns
- Add skip navigation links
- Ensure all modals trap focus

---

## Summary of Required Fixes

| Priority | Issue | File(s) |
|----------|-------|---------|
| 🔴 Critical | Fix FAQ pricing | `lib/copy.ts` |
| 🔴 Critical | Create missing pages OR remove links | `app/page.tsx` + new pages |
| 🔴 Critical | Fix admin user tiers | `app/admin/users/page.tsx` |
| 🟡 Moderate | Fix billing page tiers/pricing | `app/settings/billing/page.tsx` |
| 🟡 Moderate | Fix agent names in trades | `app/dashboard/trades/page.tsx` |
| 🟡 Moderate | Fix agent names in preferences | `app/settings/preferences/page.tsx` |
| 🟡 Moderate | Fix agent names in status component | `components/dashboard/agent-status.tsx` |
| 🟡 Moderate | Fix tier badge description | `components/ui/tier-badge.tsx` |

---

**Report generated by Opus AI Agent**
