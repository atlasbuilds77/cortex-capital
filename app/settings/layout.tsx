'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { 
  User, 
  Target, 
  Link, 
  Bell, 
  CreditCard, 
  Shield, 
  ArrowLeft, 
  X, 
  Menu,
  Settings,
  type LucideIcon 
} from 'lucide-react'

interface SettingsNavItem {
  label: string
  path: string
  Icon: LucideIcon
  description: string
}

const navItems: SettingsNavItem[] = [
  { label: 'Profile', path: '/settings/profile', Icon: User, description: 'Personal information' },
  { label: 'Preferences', path: '/settings/preferences', Icon: Target, description: 'Trading & AI settings' },
  { label: 'Trading', path: '/settings/trading', Icon: Settings, description: 'Trade execution settings' },
  { label: 'Brokers', path: '/settings/brokers', Icon: Link, description: 'Connected accounts' },
  { label: 'Notifications', path: '/settings/notifications', Icon: Bell, description: 'Alerts & updates' },
  { label: 'Billing', path: '/settings/billing', Icon: CreditCard, description: 'Plan & payments' },
  { label: 'Security', path: '/settings/security', Icon: Shield, description: 'Password & 2FA' },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('cortex_token')
    if (!token) {
      router.push('/')
    }
  }, [router])

  // Redirect /settings to /settings/profile
  useEffect(() => {
    if (pathname === '/settings') {
      router.push('/settings/profile')
    }
  }, [pathname, router])

  const currentSection = navItems.find(item => pathname === item.path)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-700 bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.button
              onClick={() => router.push('/dashboard')}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-lg font-semibold">Settings</span>
            </motion.button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Toggle settings menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation - Desktop */}
          <aside className="hidden lg:block">
            <nav className="space-y-1 sticky top-24" aria-label="Settings navigation">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    pathname === item.path
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.Icon className="w-5 h-5" aria-hidden="true" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </nav>
          </aside>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden fixed inset-x-0 top-16 bg-surface border-b border-gray-700 shadow-xl z-30"
            >
              <nav className="px-4 py-2 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      pathname === item.path
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.Icon className="w-5 h-5" aria-hidden="true" />
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-70">{item.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </motion.div>
          )}

          {/* Main Content */}
          <main className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-surface rounded-xl p-6 sm:p-8"
            >
              {/* Mobile Section Header */}
              {currentSection && (
                <div className="lg:hidden mb-6 pb-6 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <currentSection.Icon className="w-8 h-8 text-primary" aria-hidden="true" />
                    <div>
                      <h2 className="text-2xl font-bold">{currentSection.label}</h2>
                      <p className="text-text-secondary text-sm">{currentSection.description}</p>
                    </div>
                  </div>
                </div>
              )}
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  )
}
