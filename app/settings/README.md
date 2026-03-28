# Settings & Account Management

Complete settings system for Cortex Capital with sidebar navigation and mobile support.

## 📁 Structure

```
app/settings/
├── layout.tsx              # Shared settings layout with sidebar nav
├── page.tsx                # Redirects to /settings/profile
├── profile/
│   └── page.tsx            # Profile management
├── preferences/
│   └── page.tsx            # Trading preferences & AI agents
├── brokers/
│   └── page.tsx            # Connected broker accounts
├── notifications/
│   └── page.tsx            # Email & push notification settings
├── billing/
│   └── page.tsx            # Subscription plans & billing history
└── security/
    └── page.tsx            # Password, 2FA, and active sessions
```

## 🎨 Features

### Layout (`layout.tsx`)
- **Sidebar Navigation** (desktop) - Sticky, scrollable
- **Dropdown Menu** (mobile) - Full-screen overlay
- **Auto-redirect** - `/settings` → `/settings/profile`
- **Auth check** - Redirects to home if not logged in
- **Consistent design** - Matches dashboard styling

### Profile (`profile/page.tsx`)
- ✅ Avatar upload with preview
- ✅ Name and email fields
- ✅ Optional phone number
- ✅ Delete account (with confirmation)
- ✅ Form validation ready

### Preferences (`preferences/page.tsx`)
- ✅ Risk profile selector (conservative/moderate/aggressive)
- ✅ Re-take assessment link
- ✅ Trading goals (multi-select)
- ✅ Sector interests (multi-select)
- ✅ Exclusions (ethical filters)
- ✅ Agent toggles (Helios, Nebula, Oracle, Meridian)

### Brokers (`brokers/page.tsx`)
- ✅ Connected broker list with status
- ✅ Paper/Live account badges
- ✅ Last sync timestamp
- ✅ Disconnect button with confirmation
- ✅ Add broker modal
- ✅ Available brokers: Tradier, Alpaca, IB, Robinhood
- ✅ Empty state for no brokers

### Notifications (`notifications/page.tsx`)
- ✅ Email notification toggles
- ✅ Push notification toggles
- ✅ Categories:
  - Trade Alerts
  - Daily Summary
  - Weekly Report
  - Account Activity
  - System Updates
- ✅ Notification schedule info

### Billing (`billing/page.tsx`)
- ✅ Current plan display with status
- ✅ Three-tier pricing (Starter, Pro, Enterprise)
- ✅ Monthly/Yearly toggle (20% savings)
- ✅ Plan comparison grid
- ✅ Payment method display
- ✅ Billing history table
- ✅ Cancel subscription modal
- ✅ Upgrade/downgrade flow

### Security (`security/page.tsx`)
- ✅ Change password modal
- ✅ Two-factor authentication toggle
- ✅ 2FA setup modal with QR code
- ✅ Active sessions list
- ✅ Device/location info
- ✅ Logout individual sessions
- ✅ Logout all devices
- ✅ Security tips section

## 🎯 Design Patterns

### Consistent Layout
- All pages use same spacing (`space-y-8`)
- Motion delays for staggered animations
- Hidden headers on mobile (shown in layout)
- Primary button style for save actions

### Color Coding
- **Primary** - Main actions, toggles, links
- **Secondary** - Sector interests
- **Success** - Connected status, paid invoices
- **Warning** - Live trading mode
- **Danger** - Disconnect, delete, cancel actions

### Interactive Elements
- **Toggle switches** - Consistent 12x6 design
- **Multi-select buttons** - Border highlights
- **Modals** - Click-outside-to-close
- **Loading states** - Disabled buttons with "...ing" text

## 🔌 Integration Points

### API Endpoints (TODO)
```typescript
// Profile
PUT /api/user/profile
DELETE /api/user/account

// Preferences
PUT /api/user/preferences

// Brokers
GET /api/brokers
POST /api/brokers/connect
DELETE /api/brokers/:id

// Notifications
PUT /api/user/notifications

// Billing
GET /api/billing/plans
POST /api/billing/upgrade
GET /api/billing/invoices
POST /api/billing/cancel

// Security
PUT /api/user/password
POST /api/user/2fa/enable
DELETE /api/user/2fa/disable
GET /api/user/sessions
DELETE /api/user/sessions/:id
```

### OAuth Flows
- **Tradier** - Standard OAuth 2.0
- **Alpaca** - OAuth with paper/live scope selection
- **Interactive Brokers** - Custom OAuth
- **Robinhood** - OAuth with MFA support

## 📱 Mobile Optimizations

- **Responsive grids** - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Touch-friendly buttons** - 44px minimum height
- **Scrollable modals** - `max-h-[80vh] overflow-y-auto`
- **Mobile menu** - Slide-down navigation
- **Large tap targets** - Adequate spacing

## ✨ Future Enhancements

- [ ] Profile picture cropping tool
- [ ] Email verification flow
- [ ] Phone number verification (SMS)
- [ ] Custom notification schedules
- [ ] Usage analytics dashboard
- [ ] API key management
- [ ] Webhook configuration
- [ ] Export all data (GDPR)
- [ ] Account pause (instead of delete)
- [ ] Multiple payment methods
- [ ] Referral program integration

## 🚀 Next Steps

1. **Backend API** - Implement all endpoints
2. **Form Validation** - Add Zod schemas
3. **OAuth Flows** - Set up broker integrations
4. **Stripe Integration** - Payment processing
5. **Email Service** - SendGrid/Resend setup
6. **2FA Implementation** - TOTP library (speakeasy)
7. **Session Management** - JWT refresh tokens
8. **Error Handling** - Toast notifications
9. **Loading States** - Skeleton screens
10. **E2E Tests** - Playwright test suite

---

**Created:** 2024-03-21  
**Status:** ✅ Complete (UI only - backend integration pending)  
**Pages:** 7 (layout + 6 sections)  
**Lines of Code:** ~1,200  
**Dependencies:** framer-motion, next, react
