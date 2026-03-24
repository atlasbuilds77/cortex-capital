# Error Handling Integration Checklist

Quick checklist to add production-ready error handling to Cortex Capital.

## ✅ Files Created

- [x] `components/ui/error-boundary.tsx` - React error boundary
- [x] `components/ui/empty-state.tsx` - Empty state components
- [x] `components/ui/loading-states.tsx` - Loading skeletons & spinners
- [x] `components/ui/toast.tsx` - Toast notification system
- [x] `components/ui/offline-banner.tsx` - Offline detection & queuing
- [x] `app/error.tsx` - Next.js error page
- [x] `app/not-found.tsx` - 404 page
- [x] `lib/api.ts` - Enhanced with retry, timeout, typed errors
- [x] `app/globals.css` - Added toast animation

## 📋 Integration Steps

### Step 1: Update Root Layout (5 min)
File: `app/layout.tsx`

```tsx
import { ToastProvider } from '@/components/ui/toast'
import { OfflineBanner } from '@/components/ui/offline-banner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          <OfflineBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

- [ ] Import ToastProvider
- [ ] Import OfflineBanner  
- [ ] Wrap children in ToastProvider
- [ ] Add OfflineBanner component

### Step 2: Update Dashboard Page (5 min)
File: `app/dashboard/page.tsx`

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SkeletonStat, SkeletonTable } from '@/components/ui/loading-states'
import { NoPositionsState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'

// Add loading state
if (loading) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <SkeletonStat />
      <SkeletonStat />
      <SkeletonStat />
    </div>
  )
}

// Add empty state
if (positions.length === 0) {
  return <NoPositionsState onGetStarted={() => router.push('/connect')} />
}

// Wrap in ErrorBoundary
export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}
```

- [ ] Import loading components
- [ ] Import empty state components
- [ ] Replace loading spinner with skeleton
- [ ] Add empty state check
- [ ] Wrap page in ErrorBoundary

### Step 3: Update API Calls (3 min)
File: Any component with API calls

```tsx
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const { showToast } = useToast()

const loadData = async () => {
  const result = await api.getPortfolio()
  
  if (result.error) {
    showToast('error', result.error)
    return
  }

  setData(result.data)
}
```

- [ ] Import useToast hook
- [ ] Add toast for errors
- [ ] Add toast for success actions
- [ ] Use api client (already has retry/timeout)

### Step 4: Add Empty States (2 min)
File: Components that show lists/data

```tsx
import { NoActivityState, NoPositionsState } from '@/components/ui/empty-state'

{positions.length === 0 ? (
  <NoPositionsState />
) : (
  <PositionsList positions={positions} />
)}
```

- [ ] Add to position list
- [ ] Add to activity feed
- [ ] Add to any list that could be empty

## 🧪 Testing Checklist

### Error Boundary
- [ ] Throw test error: `throw new Error('Test')`
- [ ] Verify friendly error screen shows
- [ ] Click "Try again" button works
- [ ] Dev mode shows error details

### Toast Notifications
- [ ] Success toast on save
- [ ] Error toast on API failure
- [ ] Info toast for processing
- [ ] Toast auto-dismisses after 5s
- [ ] Can manually close toast

### Loading States
- [ ] Skeleton screens show on initial load
- [ ] Skeletons match actual content layout
- [ ] Transition from skeleton to content is smooth
- [ ] Button spinner shows during actions

### Empty States
- [ ] Shows when no positions
- [ ] Shows when no activity
- [ ] CTA buttons work
- [ ] Messages are friendly

### Offline Detection
- [ ] Banner shows when offline (DevTools → Network → Offline)
- [ ] Actions queue when offline
- [ ] Actions sync when back online
- [ ] Banner disappears when online

### Error Pages
- [ ] Visit `/nonexistent` shows 404
- [ ] 404 has working navigation links
- [ ] Error page catches component errors
- [ ] Error page has retry button

### API Client
- [ ] Retries on network failure (simulate in DevTools)
- [ ] Timeout after 30s (artificial delay)
- [ ] Returns friendly error messages
- [ ] Exponential backoff works (check timing)

## 📊 Priority Order

**Do these first for maximum impact:**

1. **Root layout** (ToastProvider + OfflineBanner) - 5 min
2. **Dashboard skeletons** - 5 min  
3. **Empty states** - 3 min
4. **API error toasts** - 2 min

**Total: 15 minutes for massive UX improvement**

## 🎯 Success Criteria

When done, you should have:

✅ No blank loading screens (skeletons instead)  
✅ Friendly messages when data is empty  
✅ User feedback on all actions (toasts)  
✅ Graceful error handling (no crashes)  
✅ Offline detection and queuing  
✅ Professional error/404 pages  
✅ Auto-retry on network failures  

## 📚 Documentation

- `ERROR-HANDLING-SUMMARY.md` - Complete overview
- `components/ui/README.md` - Component API docs
- `INTEGRATION-GUIDE.md` - Detailed examples

## 🚀 Quick Test Commands

```bash
# Start dev server
npm run dev

# Test offline (in browser DevTools Console)
window.dispatchEvent(new Event('offline'))
window.dispatchEvent(new Event('online'))

# Check all components exist
ls components/ui/error-boundary.tsx \
   components/ui/empty-state.tsx \
   components/ui/loading-states.tsx \
   components/ui/toast.tsx \
   components/ui/offline-banner.tsx
```

## 💡 Tips

- Start with root layout - enables toasts + offline banner everywhere
- Use skeleton screens instead of spinners - looks way better
- Always show empty states - never leave users with blank screens
- Toast feedback on every action - users need confirmation
- Test offline mode - many users have spotty connections

## ✨ Result

**A polished app that handles errors gracefully and feels professional even when things go wrong.**

---

**Time to integrate:** ~15-30 minutes  
**Impact:** Massive UX improvement  
**Effort:** Copy-paste from examples  
