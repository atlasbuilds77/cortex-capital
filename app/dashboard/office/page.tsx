import { TradingFloorShell } from '@/features/trading-floor/TradingFloorShell'

export default function DashboardOfficePage() {
  return (
    <TradingFloorShell
      context="dashboard"
      initialShowDiscussions={false}
      fullHeightClassName="h-[calc(100vh-4rem)] lg:h-screen"
    />
  )
}
