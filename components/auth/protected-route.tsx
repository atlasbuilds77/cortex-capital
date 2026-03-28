'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requirePaidTier?: boolean // If true, free users get redirected to pricing
}

export function ProtectedRoute({ children, requirePaidTier = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    // If paid tier required and user is on free tier, redirect to pricing
    if (!loading && isAuthenticated && requirePaidTier) {
      const userTier = user?.tier || 'free'
      if (userTier === 'free') {
        router.push('/pricing?upgrade=true')
      }
    }
  }, [isAuthenticated, loading, user, requirePaidTier, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Block free users from paid-only routes
  if (requirePaidTier && (user?.tier || 'free') === 'free') {
    return null
  }

  return <>{children}</>
}

// Convenience wrapper for routes that require a paid subscription
export function PaidRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requirePaidTier>{children}</ProtectedRoute>
}
