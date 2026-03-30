'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, ShieldCheck, Smartphone, Lightbulb, Copy, Check, AlertTriangle } from 'lucide-react'

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
  const [show2FASetupModal, setShow2FASetupModal] = useState(false)
  const [show2FADisableModal, setShow2FADisableModal] = useState(false)
  const [isOAuthUser, setIsOAuthUser] = useState(false)
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
  
  // 2FA setup state
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState('')
  const [setupError, setSetupError] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)
  
  // 2FA disable state
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  
  const getToken = () => localStorage.getItem('cortex_token')
  
  // Check if user logged in via OAuth and 2FA status
  useEffect(() => {
    const token = getToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setIsOAuthUser(!!payload.provider)
      } catch {
        setIsOAuthUser(false)
      }
    }
    
    // Check 2FA status from backend
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user?.twoFactorEnabled !== undefined) {
          setTwoFactorEnabled(data.user.twoFactorEnabled)
        }
      })
      .catch(() => {})
  }, [])

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
      const token = getToken()
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
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

  const handleSetup2FA = async () => {
    setSetupError('')
    setSetupLoading(true)
    
    try {
      const token = getToken()
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to setup 2FA')
      
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setBackupCodes(data.backupCodes)
      setSetupStep('qr')
      setShow2FASetupModal(true)
    } catch (err: any) {
      setSetupError(err.message)
    } finally {
      setSetupLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    setSetupError('')
    setSetupLoading(true)
    
    try {
      const token = getToken()
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verifyCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      
      setSetupStep('backup')
    } catch (err: any) {
      setSetupError(err.message)
    } finally {
      setSetupLoading(false)
    }
  }

  const handleFinish2FASetup = () => {
    setTwoFactorEnabled(true)
    setShow2FASetupModal(false)
    setSetupStep('qr')
    setVerifyCode('')
    setQrCode('')
    setSecret('')
    setBackupCodes([])
  }

  const handleDisable2FA = async () => {
    setDisableError('')
    setDisableLoading(true)
    
    try {
      const token = getToken()
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      
      setTwoFactorEnabled(false)
      setShow2FADisableModal(false)
      setDisableCode('')
    } catch (err: any) {
      setDisableError(err.message)
    } finally {
      setDisableLoading(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedBackup(true)
    setTimeout(() => setCopiedBackup(false), 2000)
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
          {isOAuthUser ? (
            <div>
              <div className="font-medium">Signed in with Discord</div>
              <div className="text-text-secondary text-sm">
                Password managed by your Discord account
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="font-medium">Password</div>
                <div className="text-text-secondary text-sm">Change your account password</div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-all font-medium"
              >
                Change Password
              </button>
            </>
          )}
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
            {twoFactorEnabled ? (
              <button
                onClick={() => setShow2FADisableModal(true)}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition-all font-medium"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={handleSetup2FA}
                disabled={setupLoading}
                className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50"
              >
                {setupLoading ? 'Setting up...' : 'Enable'}
              </button>
            )}
          </div>
          {twoFactorEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Two-factor authentication is enabled
              </div>
            </div>
          )}
          {setupError && !show2FASetupModal && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {setupError}
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
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-400" /> Active Sessions
        </h3>
        <div className="p-4 bg-background rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <div className="font-medium">Current Session</div>
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs font-medium">
              Active
            </span>
          </div>
          <div className="text-text-secondary text-sm mt-1">
            Session tracking coming soon
          </div>
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
      {show2FASetupModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShow2FASetupModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {setupStep === 'qr' && (
              <>
                <h3 className="text-xl font-bold mb-4">Enable Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <p className="text-text-secondary text-sm">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                  </p>
                  <div className="p-4 bg-white rounded-lg flex items-center justify-center">
                    {qrCode ? (
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                        Loading...
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-text-secondary text-xs mb-1">Can&apos;t scan? Enter this code manually:</p>
                    <code className="text-sm font-mono break-all">{secret}</code>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShow2FASetupModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setSetupStep('verify')}
                    className="flex-1 px-4 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {setupStep === 'verify' && (
              <>
                <h3 className="text-xl font-bold mb-4">Verify Setup</h3>
                {setupError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{setupError}</div>
                )}
                <div className="space-y-4">
                  <p className="text-text-secondary text-sm">
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </p>
                  <div>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full px-4 py-4 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSetupStep('qr')}
                    className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerify2FA}
                    disabled={setupLoading || verifyCode.length !== 6}
                    className="flex-1 px-4 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50"
                  >
                    {setupLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </>
            )}

            {setupStep === 'backup' && (
              <>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  Save Your Backup Codes
                </h3>
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      <strong>Important:</strong> Save these codes somewhere safe. Each code can only be used once. If you lose access to your authenticator app, you can use these codes to sign in.
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <code key={i} className="text-sm font-mono p-2 bg-surface rounded text-center">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={copyBackupCodes}
                    className="w-full px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all flex items-center justify-center gap-2"
                  >
                    {copiedBackup ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Codes
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleFinish2FASetup}
                    className="w-full px-4 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
                  >
                    I&apos;ve Saved My Codes
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* 2FA Disable Modal */}
      {show2FADisableModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShow2FADisableModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">Disable Two-Factor Authentication</h3>
            {disableError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{disableError}</div>
            )}
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Enter a verification code from your authenticator app or a backup code to disable 2FA.
              </p>
              <div>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.toUpperCase().slice(0, 8))}
                  maxLength={8}
                  className="w-full px-4 py-4 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShow2FADisableModal(false)
                  setDisableCode('')
                  setDisableError('')
                }}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={disableLoading || disableCode.length < 6}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium disabled:opacity-50"
              >
                {disableLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
