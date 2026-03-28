'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This redirects to /settings/profile via the layout
export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/settings/profile')
  }, [router])

  return null
}
