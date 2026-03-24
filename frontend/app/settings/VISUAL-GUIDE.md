# Settings Pages - Visual Guide

Quick reference for what each page looks like and contains.

## 🗂️ Sidebar Navigation (All Pages)

```
┌─────────────────────────────────────────┐
│  ← Settings                             │
├─────────────────────────────────────────┤
│                                         │
│  SIDEBAR          │  CONTENT AREA       │
│                   │                     │
│  👤 Profile       │  [Page Content]     │
│  🎯 Preferences   │                     │
│  🔗 Brokers       │                     │
│  🔔 Notifications │                     │
│  💳 Billing       │                     │
│  🔒 Security      │                     │
│                   │                     │
└─────────────────────────────────────────┘
```

---

## 1️⃣ Profile (`/settings/profile`)

```
┌─────────────────────────────────────────┐
│  Profile                                │
│  Manage your personal information       │
├─────────────────────────────────────────┤
│                                         │
│  Profile Picture                        │
│  ┌───┐  [Upload Photo]                 │
│  │ 👤│                                  │
│  └───┘  JPG or PNG, max 5MB            │
│                                         │
│  Full Name                              │
│  ┌─────────────────────────────────┐   │
│  │ Hunter Thompson                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Email Address                          │
│  ┌─────────────────────────────────┐   │
│  │ hunter@cortexcapital.ai         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Phone Number (optional)                │
│  ┌─────────────────────────────────┐   │
│  │ +1 (424) 515-7194               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Save Changes]                         │
│                                         │
│  ─────────────────────────────────      │
│  Danger Zone                            │
│  ┌─────────────────────────────────┐   │
│  │ Delete Account  [Delete Account]│   │
│  │ Permanently delete your account │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 2️⃣ Preferences (`/settings/preferences`)

```
┌─────────────────────────────────────────┐
│  Trading Preferences                    │
│  Customize how your AI agents trade    │
├─────────────────────────────────────────┤
│                                         │
│  Risk Profile    [Re-take Assessment]   │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Conservative│ │ Moderate │ │Aggressive│
│  └──────────┘ └──────────┘ └────────┘ │
│                                         │
│  Trading Goals                          │
│  [Long-term growth] [Income generation] │
│  [Capital preservation] [Tax optim...]  │
│  [Sector exposure] [Hedge positions]    │
│                                         │
│  Sector Interests                       │
│  [Technology] [Healthcare] [Financials] │
│  [Energy] [Consumer] [Industrials] ...  │
│                                         │
│  Exclusions (optional)                  │
│  [Tobacco] [Weapons] [Gambling]         │
│  [Fossil fuels] [Private prisons] ...   │
│                                         │
│  Active Agents                          │
│  ┌─────────────────────────────────┐   │
│  │ ☀️ Helios            [ON/OFF]   │   │
│  │ 0DTE options scanner            │   │
│  ├─────────────────────────────────┤   │
│  │ 🌌 Nebula            [ON/OFF]   │   │
│  │ Multi-agent sentiment analysis  │   │
│  ├─────────────────────────────────┤   │
│  │ 🔮 Oracle            [ON/OFF]   │   │
│  │ Market prediction engine        │   │
│  ├─────────────────────────────────┤   │
│  │ ⚖️ Meridian          [ON/OFF]   │   │
│  │ Portfolio optimization          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Save Preferences]                     │
└─────────────────────────────────────────┘
```

---

## 3️⃣ Brokers (`/settings/brokers`)

```
┌─────────────────────────────────────────┐
│  Connected Brokers    [+ Add Broker]    │
│  Manage your trading accounts           │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📊 Tradier                      │   │
│  │ Account ****7194                │   │
│  │ ● Connected | Paper Trading     │   │
│  │ Last synced: 2 minutes ago      │   │
│  │                   [Disconnect]  │   │
│  │            [Sync Now]           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🦙 Alpaca                       │   │
│  │ Account ****2048                │   │
│  │ ● Connected | Live Trading      │   │
│  │ Last synced: 5 minutes ago      │   │
│  │                   [Disconnect]  │   │
│  │            [Sync Now]           │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

Add Broker Modal:
┌─────────────────────────────────────────┐
│  Add Broker                         ✕   │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 📊 Tradier        Connect →     │   │
│  │ Options trading platform        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 🏦 Interactive Brokers           │   │
│  │ Professional trading  Connect → │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 4️⃣ Notifications (`/settings/notifications`)

```
┌─────────────────────────────────────────┐
│  Notifications                          │
│  Control how you receive updates        │
├─────────────────────────────────────────┤
│                                         │
│  📧 Email Notifications                 │
│  ┌─────────────────────────────────┐   │
│  │ ⚡ Trade Alerts        [ON/OFF] │   │
│  │ Real-time trade notifications   │   │
│  ├─────────────────────────────────┤   │
│  │ 📊 Daily Summary       [ON/OFF] │   │
│  │ Portfolio performance recap     │   │
│  ├─────────────────────────────────┤   │
│  │ 📈 Weekly Report       [ON/OFF] │   │
│  │ Comprehensive analysis          │   │
│  ├─────────────────────────────────┤   │
│  │ 🔔 Account Activity    [ON/OFF] │   │
│  │ Security alerts                 │   │
│  ├─────────────────────────────────┤   │
│  │ 🚀 System Updates      [ON/OFF] │   │
│  │ New features & announcements    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📱 Push Notifications                  │
│  (Same 5 categories)                    │
│                                         │
│  ⏰ Notification Schedule               │
│  • Trade alerts: Real-time              │
│  • Daily summary: 4:00 PM EST           │
│  • Weekly report: Mondays 8:00 AM EST   │
│                                         │
│  [Save Preferences]                     │
└─────────────────────────────────────────┘
```

---

## 5️⃣ Billing (`/settings/billing`)

```
┌─────────────────────────────────────────┐
│  Billing & Subscription                 │
│  Manage your plan and payments          │
├─────────────────────────────────────────┤
│                                         │
│  Current Plan                           │
│  ┌─────────────────────────────────┐   │
│  │ Pro                      Active │   │
│  │ $99/month                       │   │
│  │ Renews on April 1, 2024         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Monthly] [Yearly (Save 20%)]          │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Starter │ │   Pro   │ │Enterprise│  │
│  │  $29/mo │ │  $99/mo │ │ $299/mo │  │
│  │         │ │RECOMMEND│ │         │  │
│  │ Up to   │ │ Up to   │ │Unlimited│  │
│  │ $10k    │ │ $100k   │ │portfolio│  │
│  │         │ │         │ │         │  │
│  │[Upgrade]│ │[Current]│ │[Upgrade]│  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  Payment Method                         │
│  ┌─────────────────────────────────┐   │
│  │ 💳 Visa ****4242      [Update]  │   │
│  │ Expires 12/2025                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Billing History                        │
│  ┌─────────────────────────────────┐   │
│  │ March 1, 2024   $99  PAID       │   │
│  │                      [Download] │   │
│  ├─────────────────────────────────┤   │
│  │ February 1, 2024 $99 PAID       │   │
│  │                      [Download] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancel Subscription]                  │
└─────────────────────────────────────────┘
```

---

## 6️⃣ Security (`/settings/security`)

```
┌─────────────────────────────────────────┐
│  Security                               │
│  Manage your password and auth settings │
├─────────────────────────────────────────┤
│                                         │
│  🔑 Password                            │
│  ┌─────────────────────────────────┐   │
│  │ Password                        │   │
│  │ Last changed 3 months ago       │   │
│  │              [Change Password]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🔐 Two-Factor Authentication           │
│  ┌─────────────────────────────────┐   │
│  │ Authenticator App      [ON/OFF] │   │
│  │ Extra layer of security         │   │
│  │                                 │   │
│  │ ● 2FA is enabled                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📱 Active Sessions  [Logout All]       │
│  ┌─────────────────────────────────┐   │
│  │ MacBook Pro (Chrome)   Current  │   │
│  │ Los Angeles, CA • Just now      │   │
│  ├─────────────────────────────────┤   │
│  │ iPhone 15 Pro (Safari) [Logout] │   │
│  │ Los Angeles, CA • 2 hours ago   │   │
│  ├─────────────────────────────────┤   │
│  │ iPad Air (Safari)      [Logout] │   │
│  │ San Francisco • 3 days ago      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  💡 Security Tips                       │
│  • Use a strong unique password         │
│  • Enable two-factor authentication     │
│  • Review active sessions regularly     │
│  • Never share credentials              │
└─────────────────────────────────────────┘
```

---

## 📱 Mobile View

All pages collapse to single-column layout:

```
┌──────────────────┐
│ ← Settings    ☰  │  ← Hamburger menu
├──────────────────┤
│                  │
│  👤 Profile      │  ← Section header
│  Manage personal │
│  information     │
│                  │
│  [Form Fields]   │
│                  │
│  [Save Changes]  │
│                  │
└──────────────────┘
```

Mobile navigation dropdown:
```
┌──────────────────┐
│ ← Settings    ✕  │
├──────────────────┤
│ 👤 Profile       │  ← Current page highlighted
│ 🎯 Preferences   │
│ 🔗 Brokers       │
│ 🔔 Notifications │
│ 💳 Billing       │
│ 🔒 Security      │
└──────────────────┘
```

---

## 🎨 Color Key

- **Primary (#00d4ff)** - Save buttons, toggles ON, active nav, links
- **Secondary (#7c3aed)** - Sector interests selected state
- **Success (#00ff88)** - Connected status, paid invoices, active badges
- **Warning (#ffaa00)** - Live trading mode
- **Danger (#ff4444)** - Delete, disconnect, cancel actions
- **Gray-700 (#4a5568)** - Borders, inactive states
- **Text-Secondary (#a0a0b0)** - Helper text, descriptions

---

## ⚡ Interactive Elements

### Toggle Switch
```
OFF: [○——————]  (gray)
ON:  [——————●]  (primary blue)
```

### Multi-Select Buttons
```
UNSELECTED: [ Border only ]
SELECTED:   [ Highlighted border + bg ]
```

### Status Badges
```
● Connected    (green with dot)
● Paper Trading (blue)
⚠ Live Trading  (orange/warning)
✓ Active        (green)
```

---

Built with Framer Motion, Tailwind CSS, Next.js 14 App Router
