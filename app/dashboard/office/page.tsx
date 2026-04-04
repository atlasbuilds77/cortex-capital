'use client'

import { useAuth } from '@/lib/auth'
import { TradingFloorShell } from '@/features/trading-floor/TradingFloorShell'
import { UpgradeOverlay } from '@/components/upgrade-overlay'
import { Loader2 } from 'lucide-react'

export default function DashboardOfficePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] lg:h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user?.tier === 'free') {
    return <UpgradeOverlay featureName="The 3D Trading Office" />
  }

  return (
    <TradingFloorShell
      context="dashboard"
      initialShowDiscussions={false}
      fullHeightClassName="h-[calc(100vh-4rem)] lg:h-screen"
    />
  )
}
