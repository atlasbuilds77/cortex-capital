'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('cortex_token')
    const userData = localStorage.getItem('cortex_user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    
    // Give iframe time to load
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('cortex_token')
    localStorage.removeItem('cortex_user')
    router.push('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <div>
              <h1 className="text-lg font-semibold">Your Fishtank</h1>
              <p className="text-sm text-text-secondary">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-text-secondary">Live Trading</span>
            </div>

            <Link
              href="/settings"
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-text-secondary hover:text-error transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* User Info Banner */}
      <div className="bg-gradient-to-r bg-primary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <p className="text-sm text-center">
            <strong className="text-primary">Your AI Team:</strong> {' '}
            {user.tier === 'free' && '0 agents (upgrade to activate)'}
            {user.tier === 'scout' && '3 agents actively trading'}
            {user.tier === 'operator' && '7 agents actively trading'}
            {user.tier === 'partner' && '7 agents + full autonomy'}
            {user.tier === 'free' && (
              <Link href="/settings/billing" className="ml-2 underline hover:text-primary">
                Upgrade to activate AI trading →
              </Link>
            )}
          </p>
        </div>
      </div>

      {/* 3D Office Iframe - User's personal fishtank */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Loading your fishtank...</p>
            </div>
          </div>
        )}
        
        <iframe
          src={`http://localhost:3002?userId=${user.id}`}
          className="w-full h-full border-0"
          title="Your Cortex Capital Fishtank - 3D Office"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  )
}
