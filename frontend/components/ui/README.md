# UI Components - Error Handling & States

Production-ready components for handling errors, loading states, and edge cases.

## Components Overview

### 1. ErrorBoundary
Catches React errors and shows friendly fallback UI.

```tsx
import { ErrorBoundary, WithErrorBoundary } from '@/components/ui/error-boundary'

// Wrap your entire app or specific sections
export default function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  )
}

// Or use the wrapper component
export default function Page() {
  return (
    <WithErrorBoundary>
      <RiskyComponent />
    </WithErrorBoundary>
  )
}
```

### 2. Empty States
Show friendly messages when there's no data.

```tsx
import { 
  EmptyState, 
  NoPositionsState, 
  NoActivityState,
  NoDataState 
} from '@/components/ui/empty-state'

// Generic empty state
<EmptyState
  icon="📊"
  title="No data yet"
  description="Your data will appear here once available."
  action={{
    label: 'Get started',
    onClick: () => router.push('/onboarding')
  }}
/>

// Preset states
<NoPositionsState onGetStarted={() => router.push('/connect')} />
<NoActivityState />
<NoDataState message="Custom message here" />
```

### 3. Loading States
Show loading UI while data is being fetched.

```tsx
import { 
  PageLoader,
  Spinner,
  SkeletonCard,
  SkeletonTable,
  SkeletonStat,
  SkeletonChart,
  LoadingOverlay,
  ButtonSpinner
} from '@/components/ui/loading-states'

// Full page loader
<PageLoader message="Loading your portfolio..." />

// Inline spinner
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// Skeleton screens (show structure while loading)
<SkeletonCard />
<SkeletonTable rows={5} />
<SkeletonStat />
<SkeletonChart />

// Loading overlay (covers existing content)
<div className="relative">
  {isLoading && <LoadingOverlay message="Saving..." />}
  <YourContent />
</div>

// Button loading state
<button disabled={isLoading}>
  {isLoading && <ButtonSpinner />}
  Save changes
</button>
```

### 4. Toast Notifications
Show temporary success/error/info messages.

```tsx
import { ToastProvider, useToast, useSuccessToast, useErrorToast } from '@/components/ui/toast'

// 1. Wrap your app with ToastProvider
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

// 2. Use toast in your components
function MyComponent() {
  const { showToast } = useToast()
  const showSuccess = useSuccessToast()
  const showError = useErrorToast()

  const handleSave = async () => {
    try {
      await api.save()
      showSuccess('Saved successfully!')
    } catch (error) {
      showError('Failed to save. Please try again.')
    }
  }

  // Or use the generic showToast
  showToast('info', 'Processing your request...')
  showToast('warning', 'Check your internet connection')
}
```

### 5. Offline Banner
Show when user is offline and queue actions.

```tsx
import { OfflineBanner, useOfflineQueue } from '@/components/ui/offline-banner'

// Add to your root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}

// Use the hook for offline-aware API calls
function MyComponent() {
  const { isOnline, queueAction } = useOfflineQueue()

  const handleSubmit = async () => {
    if (!isOnline) {
      queueAction('/api/submit', 'POST', { data: 'example' })
      showToast('info', 'Action queued. Will sync when online.')
      return
    }

    await api.submit()
  }
}
```

### 6. Error Pages
Next.js error and 404 pages are ready at:
- `app/error.tsx` - Catches all unhandled errors
- `app/not-found.tsx` - Shows when page doesn't exist

## Updated API Client

The API client now includes:
- **Retry logic** - Automatically retries failed requests (3 attempts with exponential backoff)
- **Timeout handling** - 30-second timeout on all requests
- **Typed errors** - Returns structured error objects
- **Better error messages** - User-friendly error descriptions

```tsx
import { api } from '@/lib/api'

async function loadData() {
  const result = await api.getPortfolio()
  
  if (result.error) {
    // Handle error
    showError(result.error)
    return
  }

  // Use data
  setPortfolio(result.data)
}
```

## Complete Example

Here's a complete example showing all components working together:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NoPositionsState } from '@/components/ui/empty-state'
import { PageLoader, SkeletonCard } from '@/components/ui/loading-states'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true)
  const [positions, setPositions] = useState([])
  const { showToast } = useToast()

  useEffect(() => {
    loadPositions()
  }, [])

  const loadPositions = async () => {
    setLoading(true)
    const result = await api.getPositions()

    if (result.error) {
      showToast('error', result.error)
      setLoading(false)
      return
    }

    setPositions(result.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (positions.length === 0) {
    return <NoPositionsState onGetStarted={() => router.push('/connect')} />
  }

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-3 gap-4">
        {positions.map(position => (
          <PositionCard key={position.symbol} position={position} />
        ))}
      </div>
    </ErrorBoundary>
  )
}
```

## Best Practices

1. **Wrap sections in ErrorBoundary** - Don't let one component crash the whole app
2. **Show skeleton screens** - Better UX than spinners for initial loads
3. **Use toasts for feedback** - Let users know their actions succeeded/failed
4. **Handle offline gracefully** - Queue actions and show appropriate messages
5. **Provide recovery options** - Always give users a way to retry or go back
6. **Keep error messages friendly** - No technical jargon in production

## Testing Error States

To test error states in development:

```tsx
// Throw an error to test ErrorBoundary
throw new Error('Test error')

// Test offline banner
// In DevTools Console:
// window.dispatchEvent(new Event('offline'))
// window.dispatchEvent(new Event('online'))

// Test loading states
const [loading, setLoading] = useState(true)
setTimeout(() => setLoading(false), 3000)
```
