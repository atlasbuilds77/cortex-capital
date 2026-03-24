# Error Handling Integration Guide

Quick guide to integrate the new error handling components into Cortex Capital.

## Step 1: Update Root Layout

Add `ToastProvider` and `OfflineBanner` to `app/layout.tsx`:

```tsx
import { ToastProvider } from '@/components/ui/toast'
import { OfflineBanner } from '@/components/ui/offline-banner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

## Step 2: Wrap Critical Sections

Add `ErrorBoundary` to pages that could fail:

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}
```

## Step 3: Update API Calls

Replace direct fetch calls with the improved API client:

**Before:**
```tsx
const [loading, setLoading] = useState(true)
const [positions, setPositions] = useState([])

useEffect(() => {
  fetch('/api/positions')
    .then(res => res.json())
    .then(data => setPositions(data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false))
}, [])
```

**After:**
```tsx
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { SkeletonCard } from '@/components/ui/loading-states'
import { NoPositionsState } from '@/components/ui/empty-state'

const [loading, setLoading] = useState(true)
const [positions, setPositions] = useState([])
const { showToast } = useToast()

useEffect(() => {
  loadPositions()
}, [])

const loadPositions = async () => {
  const result = await api.getPositions()
  
  if (result.error) {
    showToast('error', result.error)
    setLoading(false)
    return
  }

  setPositions(result.data || [])
  setLoading(false)
}

// In render:
if (loading) {
  return <SkeletonCard />
}

if (positions.length === 0) {
  return <NoPositionsState />
}
```

## Step 4: Add Loading States

Replace generic loading spinners with skeleton screens:

```tsx
import { SkeletonCard, SkeletonTable, SkeletonStat } from '@/components/ui/loading-states'

{loading ? (
  <div className="grid grid-cols-3 gap-4">
    <SkeletonStat />
    <SkeletonStat />
    <SkeletonStat />
  </div>
) : (
  <Stats data={stats} />
)}
```

## Step 5: Add Empty States

Show friendly messages when there's no data:

```tsx
import { NoPositionsState, NoActivityState } from '@/components/ui/empty-state'

{positions.length === 0 ? (
  <NoPositionsState onGetStarted={() => router.push('/connect')} />
) : (
  <PositionsList positions={positions} />
)}

{activity.length === 0 ? (
  <NoActivityState />
) : (
  <ActivityFeed activity={activity} />
)}
```

## Step 6: Add User Feedback

Use toasts for all user actions:

```tsx
import { useToast } from '@/components/ui/toast'

const { showToast } = useToast()

const handleConnect = async () => {
  const result = await api.connectBroker(broker, credentials)
  
  if (result.error) {
    showToast('error', result.error)
    return
  }

  showToast('success', 'Broker connected successfully!')
  router.push('/dashboard')
}

const handleSubmit = async () => {
  showToast('info', 'Processing your request...')
  
  const result = await api.submitOnboarding(data)
  
  if (result.error) {
    showToast('error', 'Failed to save. Please try again.')
    return
  }

  showToast('success', 'Profile saved!')
}
```

## Step 7: Handle Offline State

Queue actions when offline:

```tsx
import { useOfflineQueue } from '@/components/ui/offline-banner'

const { isOnline, queueAction } = useOfflineQueue()

const handleAction = async () => {
  if (!isOnline) {
    queueAction('/api/action', 'POST', { data })
    showToast('info', 'Action queued. Will sync when online.')
    return
  }

  await api.performAction(data)
}
```

## Quick Wins

Priority changes for immediate polish:

### 1. Dashboard Loading (5 min)
```tsx
// app/dashboard/page.tsx
import { SkeletonStat, SkeletonTable } from '@/components/ui/loading-states'

{loading ? (
  <>
    <div className="grid grid-cols-3 gap-4 mb-8">
      <SkeletonStat />
      <SkeletonStat />
      <SkeletonStat />
    </div>
    <SkeletonTable rows={5} />
  </>
) : (
  <DashboardContent />
)}
```

### 2. Empty Portfolio (3 min)
```tsx
import { NoPositionsState } from '@/components/ui/empty-state'

{positions.length === 0 && (
  <NoPositionsState onGetStarted={() => router.push('/onboarding')} />
)}
```

### 3. Error Feedback (2 min)
```tsx
// Add to any form/action
const { showToast } = useToast()

try {
  await api.save()
  showToast('success', 'Saved!')
} catch {
  showToast('error', 'Failed to save')
}
```

### 4. Root Layout (5 min)
```tsx
// app/layout.tsx
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

**Total time: ~15 minutes for massive UX improvement**

## Testing Checklist

- [ ] Test error boundary by throwing an error
- [ ] Test offline banner (DevTools → Network → Offline)
- [ ] Test toast notifications (success, error, info)
- [ ] Test loading states (add artificial delay)
- [ ] Test empty states (clear data)
- [ ] Test retry logic (network failure simulation)
- [ ] Test 404 page (visit `/nonexistent`)
- [ ] Test error page (throw error in component)

## Next.js Auto-Detection

These pages are automatically used by Next.js:
- `app/error.tsx` - Catches errors in app directory
- `app/not-found.tsx` - Handles 404s
- No additional setup needed!

## API Client Features

The updated API client now includes:

✅ **Retry logic** - 3 attempts with exponential backoff  
✅ **Timeout handling** - 30s timeout on all requests  
✅ **Typed errors** - Structured error objects  
✅ **Network error handling** - Graceful degradation  
✅ **Better error messages** - User-friendly descriptions  

All API calls automatically get these improvements.

## Questions?

See `components/ui/README.md` for detailed component docs.
