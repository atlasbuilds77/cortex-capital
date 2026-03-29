'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, Unlink, RefreshCw, CheckCircle, AlertCircle, Wallet } from 'lucide-react'

interface BrokerConnection {
  id: string
  brokerage: string
  brokerageType: string
  status: 'active' | 'disabled'
  createdAt: string
}

interface BrokerAccount {
  id: string
  name: string
  number: string
  type: string
  brokerage: string
}

export default function BrokersPage() {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connections, setConnections] = useState<BrokerConnection[]>([])
  const [accounts, setAccounts] = useState<BrokerAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Check URL for success callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      // Refresh data after successful connection
      fetchBrokerData()
      // Clean URL
      window.history.replaceState({}, '', '/settings/brokers')
    }
  }, [])

  const fetchBrokerData = async () => {
    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/snaptrade/accounts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      
      if (data.connected) {
        setConnected(true)
        setConnections(data.connections || [])
        setAccounts(data.accounts || [])
        setSelectedAccount(data.selectedAccount || null)
      } else {
        setConnected(false)
        setConnections([])
        setAccounts([])
      }
    } catch (err) {
      console.error('Failed to fetch broker data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrokerData()
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    
    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/broker/snaptrade/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/settings/brokers?connected=true`,
        }),
      })
      
      const data = await res.json()
      
      if (data.portalUrl) {
        // Open SnapTrade connection portal
        window.location.href = data.portalUrl
      } else {
        setError(data.error || 'Failed to get connection portal')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  const supportedBrokers = [
    { name: 'Wealthsimple', logo: '🇨🇦', region: 'Canada' },
    { name: 'Webull', logo: '📈', region: 'US' },
    { name: 'Schwab', logo: '💼', region: 'US' },
    { name: 'Questrade', logo: '🍁', region: 'Canada' },
    { name: 'Interactive Brokers', logo: '🌐', region: 'Global' },
    { name: 'Alpaca', logo: '🦙', region: 'US' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Broker Connection</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Connect your brokerage account to enable automated trading
        </p>
      </div>

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-background rounded-xl border border-gray-700"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              connected ? 'bg-green-500/20' : 'bg-gray-700'
            }`}>
              {connected ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Link2 className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {loading ? 'Checking...' : connected ? 'Broker Connected' : 'No Broker Connected'}
              </h3>
              <p className="text-text-secondary text-sm">
                {connected 
                  ? `${accounts.length} account${accounts.length !== 1 ? 's' : ''} linked`
                  : 'Connect a broker to enable copy trading'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={connected ? fetchBrokerData : handleConnect}
            disabled={connecting || loading}
            className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
              connected
                ? 'border border-gray-600 hover:bg-gray-800'
                : 'bg-primary hover:bg-primary/90'
            } ${(connecting || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {connecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : connected ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Connect Broker
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </motion.div>

      {/* Connected Accounts */}
      {connected && accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Connected Accounts
          </h3>
          {accounts.length > 1 && (
            <p className="text-text-secondary text-sm mb-3">
              Click an account to set it as your active portfolio view
            </p>
          )}
          <div className="space-y-3">
            {accounts.map((account) => {
              const isSelected = selectedAccount === account.id
              return (
                <button
                  key={account.id}
                  onClick={async () => {
                    const token = localStorage.getItem('cortex_token')
                    await fetch('/api/broker/snaptrade/accounts/select', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ accountId: account.id }),
                    })
                    setSelectedAccount(account.id)
                  }}
                  className={`w-full p-4 bg-background rounded-lg border flex items-center justify-between transition-colors text-left ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-500/5' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">{account.name || account.brokerage}</div>
                    <div className="text-text-secondary text-sm">
                      {account.type && <span className="capitalize">{account.type} • </span>}
                      {account.number && <span>****{account.number.slice(-4)}</span>}
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-700 text-text-secondary rounded text-xs font-medium">
                      Select
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Add Another Connection */}
      {connected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full p-4 border border-dashed border-gray-600 rounded-lg text-text-secondary hover:text-white hover:border-gray-500 transition-all flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Connect Another Broker
          </button>
        </motion.div>
      )}

      {/* Direct API Connections (Tradier, Alpaca) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: connected ? 0.3 : 0.1 }}
      >
        <h3 className="text-lg font-semibold mb-4">Direct API Connection</h3>
        <p className="text-text-secondary text-sm mb-4">
          For Robinhood, Tradier, and Alpaca - connect directly for full trading execution
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/settings/brokers/robinhood"
            className="p-4 bg-background rounded-lg border border-gray-700 flex items-center gap-3 hover:border-green-500/50 transition-colors"
          >
            <span className="text-2xl">🪶</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Robinhood</div>
              <div className="text-text-secondary text-xs">Stocks & options</div>
            </div>
            <span className="text-xs text-green-400">Connect →</span>
          </a>
          <a
            href="/api/broker/tradier/auth"
            className="p-4 bg-background rounded-lg border border-gray-700 flex items-center gap-3 hover:border-blue-500/50 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Tradier</div>
              <div className="text-text-secondary text-xs">Options trading</div>
            </div>
            <span className="text-xs text-blue-400">Connect →</span>
          </a>
          <a
            href="/settings/brokers/alpaca"
            className="p-4 bg-background rounded-lg border border-gray-700 flex items-center gap-3 hover:border-yellow-500/50 transition-colors"
          >
            <span className="text-2xl">🦙</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Alpaca</div>
              <div className="text-text-secondary text-xs">API-first trading</div>
            </div>
            <span className="text-xs text-yellow-400">Connect →</span>
          </a>
        </div>
      </motion.div>

      {/* SnapTrade Supported Brokers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: connected ? 0.4 : 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4">More Brokers via SnapTrade</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {supportedBrokers.map((broker) => (
            <div
              key={broker.name}
              className="p-4 bg-background rounded-lg border border-gray-700 flex items-center gap-3"
            >
              <span className="text-2xl">{broker.logo}</span>
              <div>
                <div className="font-medium text-sm">{broker.name}</div>
                <div className="text-text-secondary text-xs">{broker.region}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-secondary text-sm mt-3">
          Click "Connect Broker" above to link any of these
        </p>
      </motion.div>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: connected ? 0.4 : 0.2 }}
        className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
      >
        <h4 className="font-medium text-blue-400 mb-2">🔒 Bank-Level Security</h4>
        <p className="text-sm text-text-secondary">
          We use SnapTrade's secure connection portal. Your credentials are never shared with us - 
          you authenticate directly with your broker. Connections are encrypted and can be revoked at any time.
        </p>
      </motion.div>
    </div>
  )
}
