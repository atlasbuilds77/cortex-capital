'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Building2, Target, Link as LinkIcon, X } from 'lucide-react'

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
  { id: 'tradier', name: 'Tradier', icon: 'chart', description: 'Options trading platform' },
  { id: 'alpaca', name: 'Alpaca', icon: 'chart', description: 'Commission-free trading' },
  { id: 'interactive', name: 'Interactive Brokers', icon: 'building', description: 'Professional trading' },
  { id: 'robinhood', name: 'Robinhood', icon: 'target', description: 'Simple investing' },
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
  const [brokers, setBrokers] = useState<Broker[]>([
    {
      id: 'tradier',
      name: 'Tradier',
      icon: 'chart',
      status: 'connected',
      accountType: 'paper',
      lastSync: '2 minutes ago',
      accountNumber: '****7194',
    },
    {
      id: 'alpaca',
      name: 'Alpaca',
      icon: 'chart',
      status: 'connected',
      accountType: 'live',
      lastSync: '5 minutes ago',
      accountNumber: '****2048',
    },
  ])
  const [showAddModal, setShowAddModal] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const handleDisconnect = async (brokerId: string) => {
    setDisconnecting(brokerId)
    // TODO: API call to disconnect broker
    await new Promise(resolve => setTimeout(resolve, 1000))
    setBrokers(brokers.filter(b => b.id !== brokerId))
    setDisconnecting(null)
  }

  const handleConnect = async (brokerId: string) => {
    // TODO: Implement OAuth flow for broker connection
    alert(`Connecting to ${brokerId}... (OAuth flow not yet implemented)`)
    setShowAddModal(false)
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
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
                  className="px-4 py-2 border border-danger text-danger rounded-lg hover:bg-danger/10 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnecting === broker.id ? 'Disconnecting...' : 'Disconnect'}
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
                    className="w-full p-4 bg-background rounded-lg border border-gray-700 hover:border-primary transition-all text-left flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                      <BrokerIcon icon={broker.icon} size="lg" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{broker.name}</div>
                      <div className="text-text-secondary text-sm">{broker.description}</div>
                    </div>
                    <span className="text-primary">Connect →</span>
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
    </div>
  )
}
