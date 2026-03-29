'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, ShieldCheck, Smartphone, Lightbulb } from 'lucide-react'

interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  // Session tracking coming soon - for now just show current session
  const [sessions] = useState<ActiveSession[]>([
    {
      id: 'current',
      device: 'Current Session',
      location: '',
      lastActive: 'Now',
      current: true,
    },
  ])

  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess(false)
    
    const currentPw = (document.getElementById('current-password') as HTMLInputElement)?.value
    const newPw = (document.getElementById('new-password') as HTMLInputElement)?.value
    const confirmPw = (document.getElementById('confirm-password') as HTMLInputElement)?.value

    if (!currentPw || !newPw || !confirmPw) {
      setPasswordError('All fields are required')
      return
    }
    if (newPw.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (newPw !== confirmPw) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      const token = localStorage.getItem('cortex_token')
      const API_URL = ""; // API is same-origin
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      
      setPasswordSuccess(true)
      setTimeout(() => setShowPasswordModal(false), 1500)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleToggle2FA = () => {
    // 2FA coming soon - show message instead of fake modal
    alert('Two-factor authentication coming soon!')
  }

  const handleEnable2FA = () => {
    // Not implemented yet
    setShow2FAModal(false)
  }

  const handleLogoutSession = (sessionId: string) => {
    // TODO: Implement session logout
    alert(`Logging out session ${sessionId}...`)
  }

  const handleLogoutAll = () => {
    // TODO: Implement logout all devices
    if (confirm('Are you sure you want to log out of all devices?')) {
      alert('All other devices have been logged out.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Security</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Manage your password and authentication settings
        </p>
      </div>

      {/* Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-400" /> Password
        </h3>
        <div className="p-4 bg-background rounded-lg border border-gray-700 flex items-center justify-between">
          <div>
            <div className="font-medium">Password</div>
            <div className="text-text-secondary text-sm">Last changed 3 months ago</div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-all font-medium"
          >
            Change Password
          </button>
        </div>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" /> Two-Factor Authentication
        </h3>
        <div className="p-4 bg-background rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium">Authenticator App</div>
              <div className="text-text-secondary text-sm">
                {twoFactorEnabled
                  ? 'Use an authenticator app to generate verification codes'
                  : 'Add an extra layer of security to your account'}
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                twoFactorEnabled ? 'bg-primary' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
          {twoFactorEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2 text-success text-sm">
                <span className="w-2 h-2 rounded-full bg-success" />
                Two-factor authentication is enabled
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Active Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-400" /> Active Sessions
          </h3>
          <button
            onClick={handleLogoutAll}
            className="text-danger hover:text-danger/80 transition-colors text-sm"
          >
            Logout All Devices
          </button>
        </div>
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + index * 0.05 }}
              className="p-4 bg-background rounded-lg border border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{session.device}</div>
                    {session.current && (
                      <span className="px-2 py-0.5 bg-success/10 text-success rounded text-xs font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-text-secondary text-sm mt-1">
                    {session.location} • {session.lastActive}
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleLogoutSession(session.id)}
                    className="text-danger hover:text-danger/80 transition-colors text-sm"
                  >
                    Logout
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Security Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 bg-primary/10 border border-primary/30 rounded-lg"
      >
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-400" /> Security Tips
        </h4>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Use a strong, unique password for your Cortex Capital account</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Enable two-factor authentication for enhanced security</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Review active sessions regularly and logout unfamiliar devices</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Never share your password or 2FA codes with anyone</span>
          </li>
        </ul>
      </motion.div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPasswordModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">Change Password</h3>
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">Password updated successfully!</div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium mb-2">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="flex-1 px-4 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShow2FAModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">Enable Two-Factor Authentication</h3>
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
              </p>
              <div className="p-8 bg-white rounded-lg flex items-center justify-center">
                <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                  QR Code
                </div>
              </div>
              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium mb-2">
                  Verification Code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShow2FAModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEnable2FA}
                className="flex-1 px-4 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
              >
                Enable 2FA
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
