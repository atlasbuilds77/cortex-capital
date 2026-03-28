'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Building2, Target, Link as LinkIcon, X, Loader2, Shield, Lock } from 'lucide-react'

interface Broker {
  id: string
  name: string
  icon: string
  status: 'connected' | 'disconnected' | 'error'
  accountType: 'paper' | 'live'
  lastSync: string
  accountNumber?: string
}

const AVAILABLE_BROKERS = [
  { id: 'alpaca', name: 'Alpaca', icon: 'chart', description: 'Commission-free trading', authType: 'apikey' },
  { id: 'tradier', name: 'Tradier', icon: 'chart', description: 'Options trading platform', authType: 'apikey' },
  { id: 'robinhood', name: 'Robinhood', icon: 'target', description: 'Simple investing', authType: 'credentials' },
  { id: 'interactive', name: 'Interactive Brokers', icon: 'building', description: 'Professional trading (coming soon)', authType: 'none' },
]

const BrokerIcon = ({ icon, size = 'md' }: { icon: string; size?: 'md' | 'lg' }) => {
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  const iconClass = `${sizeClass} text-purple-400`
  switch (icon) {
    case 'chart': return <BarChart3 className={iconClass} />
    case 'building': return <Building2 className={iconClass} />
    case 'target': return <Target className={iconClass} />
    default: return <BarChart3 className={iconClass} />
  }
}

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRobinhoodModal, setShowRobinhoodModal] = useState(false)
  const [showTradierModal, setShowTradierModal] = useState(false)
  const [showAlpacaModal, setShowAlpacaModal] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  
  // Robinhood form state
  const [rhUsername, setRhUsername] = useState('')
  const [rhPassword, setRhPassword] = useState('')
  const [rhMfa, setRhMfa] = useState('')
  const [rhError, setRhError] = useState('')

  // Tradier form state
  const [tradierToken, setTradierToken] = useState('')
  const [tradierError, setTradierError] = useState('')

  // Alpaca form state
  const [alpacaKey, setAlpacaKey] = useState('')
  const [alpacaSecret, setAlpacaSecret] = useState('')
  const [alpacaPaper, setAlpacaPaper] = useState(true)
  const [alpacaError, setAlpacaError] = useState('')

  useEffect(() => {
    const loadBrokers = async () => {
      try {
        const token = localStorage.getItem('cortex_token')
        const res = await fetch('/api/user/brokers', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setBrokers(data.brokers || [])
        }
      } catch (error) {
        console.error('Failed to load brokers:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBrokers()
  }, [])

  const handleDisconnect = async (brokerId: string) => {
    setDisconnecting(brokerId)
    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ broker: brokerId }),
      })
      if (res.ok) {
        setBrokers(brokers.filter(b => b.id !== brokerId))
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to disconnect broker')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('Failed to disconnect broker')
    }
    setDisconnecting(null)
  }

  const handleConnect = async (brokerId: string) => {
    const broker = AVAILABLE_BROKERS.find(b => b.id === brokerId)
    if (!broker) return

    if (broker.authType === 'none') {
      alert(`${broker.name} integration coming soon. Contact support for early access.`)
      setShowAddModal(false)
      return
    }

    if (broker.authType === 'credentials') {
      // Show Robinhood credential modal
      setShowAddModal(false)
      setShowRobinhoodModal(true)
      return
    }

    if (broker.authType === 'apikey') {
      setShowAddModal(false)
      if (brokerId === 'alpaca') {
        setShowAlpacaModal(true)
      } else if (brokerId === 'tradier') {
        setShowTradierModal(true)
      }
      return
    }

    // OAuth flow for Alpaca
    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ broker: brokerId }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 403) {
          alert('Broker connection requires Operator tier. Please upgrade.')
        } else {
          alert(err.error || 'Failed to connect broker')
        }
        setShowAddModal(false)
        return
      }

      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Broker connect error:', error)
      alert('Failed to connect broker. Please try again.')
    }
    setShowAddModal(false)
  }

  const handleRobinhoodConnect = async () => {
    if (!rhUsername || !rhPassword) {
      setRhError('Please enter your username and password')
      return
    }

    setConnecting(true)
    setRhError('')

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/connect-robinhood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: rhUsername,
          password: rhPassword,
          mfaCode: rhMfa || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setRhError('Broker connection requires Operator tier. Please upgrade.')
        } else {
          setRhError(data.error || 'Failed to connect. Check your credentials.')
        }
        setConnecting(false)
        return
      }

      // Success - add to brokers list
      setBrokers([...brokers, {
        id: 'robinhood',
        name: 'Robinhood',
        icon: 'target',
        status: 'connected',
        accountType: 'live',
        lastSync: 'Just now',
      }])

      // Reset form and close modal
      setRhUsername('')
      setRhPassword('')
      setRhMfa('')
      setShowRobinhoodModal(false)
    } catch (error) {
      console.error('Robinhood connect error:', error)
      setRhError('Connection failed. Please try again.')
    }
    setConnecting(false)
  }

  const handleTradierConnect = async () => {
    if (!tradierToken) {
      setTradierError('Please enter your API token')
      return
    }

    setConnecting(true)
    setTradierError('')

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/connect-tradier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiToken: tradierToken,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setTradierError('Broker connection requires Operator tier. Please upgrade.')
        } else {
          setTradierError(data.error || 'Failed to connect. Check your API token.')
        }
        setConnecting(false)
        return
      }

      // Success - add to brokers list
      setBrokers([...brokers, {
        id: 'tradier',
        name: 'Tradier',
        icon: 'chart',
        status: 'connected',
        accountType: 'live',
        lastSync: 'Just now',
        accountNumber: data.account?.accountNumber,
      }])

      // Reset form and close modal
      setTradierToken('')
      setShowTradierModal(false)
    } catch (error) {
      console.error('Tradier connect error:', error)
      setTradierError('Connection failed. Please try again.')
    }
    setConnecting(false)
  }

  const handleAlpacaConnect = async () => {
    if (!alpacaKey || !alpacaSecret) {
      setAlpacaError('Please enter both API Key and Secret')
      return
    }

    setConnecting(true)
    setAlpacaError('')

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/connect-alpaca', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: alpacaKey,
          apiSecret: alpacaSecret,
          paper: alpacaPaper,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setAlpacaError('Broker connection requires Operator tier. Please upgrade.')
        } else {
          setAlpacaError(data.error || 'Failed to connect. Check your credentials.')
        }
        setConnecting(false)
        return
      }

      // Success - add to brokers list
      setBrokers([...brokers, {
        id: 'alpaca',
        name: 'Alpaca',
        icon: 'chart',
        status: 'connected',
        accountType: alpacaPaper ? 'paper' : 'live',
        lastSync: 'Just now',
        accountNumber: data.account?.accountNumber,
      }])

      // Reset form and close modal
      setAlpacaKey('')
      setAlpacaSecret('')
      setShowAlpacaModal(false)
    } catch (error) {
      console.error('Alpaca connect error:', error)
      setAlpacaError('Connection failed. Please try again.')
    }
    setConnecting(false)
  }

  const connectedBrokerIds = brokers.map(b => b.id)
  const availableToConnect = AVAILABLE_BROKERS.filter(b => !connectedBrokerIds.includes(b.id))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold hidden lg:block">Connected Brokers</h2>
          <p className="text-text-secondary mt-1 hidden lg:block">
            Manage your trading accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
        >
          + Add Broker
        </button>
      </div>

      {/* Connected Brokers */}
      {brokers.length > 0 ? (
        <div className="space-y-4">
          {brokers.map((broker, index) => (
            <motion.div
              key={broker.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 bg-background rounded-lg border border-gray-700"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BrokerIcon icon={broker.icon} size="lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{broker.name}</h3>
                    {broker.accountNumber && (
                      <p className="text-text-secondary text-sm">Account {broker.accountNumber}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                          broker.status === 'connected'
                            ? 'bg-success/10 text-success'
                            : broker.status === 'error'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-gray-700 text-text-secondary'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {broker.status === 'connected' ? 'Connected' : broker.status === 'error' ? 'Error' : 'Disconnected'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          broker.accountType === 'live'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {broker.accountType === 'live' ? 'Live Trading' : 'Paper Trading'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(broker.id)}
                  disabled={disconnecting === broker.id}
                  className="px-3 py-1.5 text-sm border border-danger text-danger rounded-lg hover:bg-danger/10 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                >
                  {disconnecting === broker.id ? '...' : 'Disconnect'}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-sm">
                <span className="text-text-secondary">Last synced: {broker.lastSync}</span>
                <button className="text-primary hover:text-primary/80 transition-colors">
                  Sync Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 text-center bg-background rounded-lg border border-dashed border-gray-700"
        >
          <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Brokers Connected</h3>
          <p className="text-text-secondary mb-6">
            Connect a broker to start trading with your AI agents
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
          >
            Connect Your First Broker
          </button>
        </motion.div>
      )}

      {/* Add Broker Modal */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Add Broker</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {availableToConnect.length > 0 ? (
              <div className="space-y-3">
                {availableToConnect.map((broker) => (
                  <button
                    key={broker.id}
                    onClick={() => handleConnect(broker.id)}
                    disabled={broker.authType === 'none'}
                    className={`w-full p-4 bg-background rounded-lg border border-gray-700 hover:border-primary transition-all text-left flex items-center gap-4 ${
                      broker.authType === 'none' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                      <BrokerIcon icon={broker.icon} size="lg" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{broker.name}</div>
                      <div className="text-text-secondary text-sm">{broker.description}</div>
                    </div>
                    <span className="text-primary">
                      {broker.authType === 'none' ? 'Coming Soon' : 'Connect →'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                All available brokers are already connected
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Robinhood Credential Modal */}
      {showRobinhoodModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowRobinhoodModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold">Connect Robinhood</h3>
              </div>
              <button
                onClick={() => setShowRobinhoodModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Security Notice */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">Secure Connection</p>
                  <p className="text-text-secondary">
                    Your credentials are encrypted with AES-256-GCM before storage. 
                    We use an unofficial but widely-trusted integration method since 
                    Robinhood doesn't offer a public API.
                  </p>
                </div>
              </div>
            </div>

            {rhError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {rhError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email or Username</label>
                <input
                  type="text"
                  value={rhUsername}
                  onChange={(e) => setRhUsername(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={rhPassword}
                    onChange={(e) => setRhPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  2FA Code <span className="text-text-secondary">(if enabled)</span>
                </label>
                <input
                  type="text"
                  value={rhMfa}
                  onChange={(e) => setRhMfa(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                onClick={handleRobinhoodConnect}
                disabled={connecting}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Connect Securely
                  </>
                )}
              </button>

              <p className="text-center text-text-secondary text-xs">
                By connecting, you agree to our Terms of Service and Privacy Policy.
                Your credentials are never stored in plain text.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tradier API Key Modal */}
      {showTradierModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowTradierModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold">Connect Tradier</h3>
              </div>
              <button
                onClick={() => setShowTradierModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">How to get your API Token</p>
                  <ol className="text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Log into your <a href="https://dash.tradier.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Tradier Dashboard</a></li>
                    <li>Go to Settings → API Access</li>
                    <li>Copy your Account Access Token</li>
                  </ol>
                </div>
              </div>
            </div>

            {tradierError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {tradierError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Token</label>
                <div className="relative">
                  <input
                    type="password"
                    value={tradierToken}
                    onChange={(e) => setTradierToken(e.target.value)}
                    placeholder="Paste your Tradier API token"
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                </div>
              </div>

              <button
                onClick={handleTradierConnect}
                disabled={connecting}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Connect Tradier
                  </>
                )}
              </button>

              <p className="text-center text-text-secondary text-xs">
                Your API token is encrypted with AES-256-GCM before storage.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Alpaca API Key Modal */}
      {showAlpacaModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAlpacaModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-600/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold">Connect Alpaca</h3>
              </div>
              <button
                onClick={() => setShowAlpacaModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">How to get your API Keys</p>
                  <ol className="text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Log into <a href="https://app.alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Alpaca Dashboard</a></li>
                    <li>Click "API Keys" in the sidebar</li>
                    <li>Generate or view your Key ID and Secret</li>
                  </ol>
                </div>
              </div>
            </div>

            {alpacaError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {alpacaError}
              </div>
            )}

            <div className="space-y-4">
              {/* Paper/Live Toggle */}
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-gray-700">
                <span className="text-sm font-medium">Account Type</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAlpacaPaper(true)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      alpacaPaper 
                        ? 'bg-primary text-background' 
                        : 'bg-gray-700 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Paper
                  </button>
                  <button
                    onClick={() => setAlpacaPaper(false)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      !alpacaPaper 
                        ? 'bg-warning text-background' 
                        : 'bg-gray-700 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Live
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">API Key ID</label>
                <input
                  type="text"
                  value={alpacaKey}
                  onChange={(e) => setAlpacaKey(e.target.value)}
                  placeholder="PK..."
                  className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Secret Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={alpacaSecret}
                    onChange={(e) => setAlpacaSecret(e.target.value)}
                    placeholder="Your secret key"
                    className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                </div>
              </div>

              <button
                onClick={handleAlpacaConnect}
                disabled={connecting}
                className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Connect Alpaca
                  </>
                )}
              </button>

              <p className="text-center text-text-secondary text-xs">
                Your credentials are encrypted with AES-256-GCM before storage.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
