'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { Shield, Lock, CheckCircle, ArrowRight, AlertCircle, TrendingUp, Crosshair, Globe } from 'lucide-react'
import { Confetti } from '@/components/ui/confetti'

type Broker = 'alpaca' | 'tradier' | 'robinhood' | 'ibkr'

export default function ConnectBrokerPage() {
  const router = useRouter()
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null)
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const brokers = [
    {
      id: 'alpaca' as Broker,
      name: 'Alpaca',
      logo: '/brokers/alpaca.svg',
      iconType: 'trending' as const,
      description: 'Commission-free trading',
      popular: true,
      fields: ['apiKey', 'apiSecret'],
    },
    {
      id: 'tradier' as Broker,
      name: 'Tradier',
      logo: '/brokers/tradier.svg',
      iconType: 'trending' as const,
      description: 'Professional platform',
      fields: ['apiKey'],
    },
    {
      id: 'robinhood' as Broker,
      name: 'Robinhood',
      logo: '/brokers/robinhood.svg',
      iconType: 'crosshair' as const,
      description: 'Popular investing app',
      fields: ['username', 'password'],
    },
    {
      id: 'ibkr' as Broker,
      name: 'Interactive Brokers',
      logo: '/brokers/ibkr.svg',
      iconType: 'globe' as const,
      description: 'Advanced trading',
      fields: ['username', 'password'],
    },
  ]

  const BrokerIcon = ({ iconType }: { iconType: 'trending' | 'crosshair' | 'globe' }) => {
    const iconClass = "w-10 h-10 text-purple-400"
    switch (iconType) {
      case 'trending': return <TrendingUp className={iconClass} />
      case 'crosshair': return <Crosshair className={iconClass} />
      case 'globe': return <Globe className={iconClass} />
    }
  }

  const handleConnect = async () => {
    if (!selectedBroker) return

    setLoading(true)
    setError('')

    const response = await api.connectBroker(selectedBroker, credentials)

    if (response.error) {
      setError(response.error)
      setLoading(false)
      return
    }

    if (response.data?.success) {
      setSuccess(true)
      // Wait for celebration animation, then redirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }

    setLoading(false)
  }

  const selectedBrokerData = brokers.find(b => b.id === selectedBroker)

  // Success celebration
  if (success) {
    return (
      <>
        <Confetti active={success} />
        <div className="min-h-screen flex items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-success" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold mb-2"
          >
            Successfully Connected!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-text-secondary"
          >
            Redirecting to your dashboard...
          </motion.p>
        </motion.div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Connect Your Broker</h1>
          <p className="text-text-secondary text-lg">
            Choose your brokerage to start trading
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selectedBroker ? (
            // Broker Selection
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Why we need this explainer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Why connect a broker?</h3>
                    <p className="text-sm text-text-secondary">
                      Cortex executes trades through your existing brokerage account. 
                      We use secure OAuth connections and never store your passwords. 
                      Your funds stay with your broker—we just optimize the strategy.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {brokers.map((broker, index) => (
                  <motion.button
                    key={broker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedBroker(broker.id)}
                    className="relative p-6 md:p-8 bg-surface rounded-xl hover:bg-surface-elevated transition-all text-left group min-h-[160px]"
                    whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  >
                    {broker.popular && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                        Popular
                      </div>
                    )}
                    
                    <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                      <BrokerIcon iconType={broker.iconType} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {broker.name}
                    </h3>
                    <p className="text-text-secondary text-sm">{broker.description}</p>
                    
                    <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium">
                      <span>Connect</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Security badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 p-6 bg-surface/50 backdrop-blur-sm rounded-xl"
              >
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>Bank-level encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>OAuth 2.0 security</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Never store credentials</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // Connection Form (OAuth-style)
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto"
            >
              <button
                onClick={() => setSelectedBroker(null)}
                className="text-primary mb-6 hover:underline flex items-center gap-2"
              >
                ← Back to broker selection
              </button>

              <div className="p-6 md:p-8 bg-surface rounded-xl shadow-lg">
                {/* Broker header */}
                <div className="text-center mb-6 pb-6 border-b border-surface-elevated">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {selectedBrokerData && <BrokerIcon iconType={selectedBrokerData.iconType} />}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Connect to {selectedBrokerData?.name}
                  </h2>
                  <p className="text-text-secondary text-sm">
                    Authorize Cortex to trade on your behalf
                  </p>
                </div>

                <div className="space-y-4">
                  {/* API Key */}
                  {selectedBrokerData?.fields.includes('apiKey') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        API Key
                      </label>
                      <input
                        type="text"
                        value={credentials.apiKey}
                        onChange={(e) =>
                          setCredentials({ ...credentials, apiKey: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Enter your API key"
                      />
                    </div>
                  )}

                  {/* API Secret */}
                  {selectedBrokerData?.fields.includes('apiSecret') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        API Secret
                      </label>
                      <input
                        type="password"
                        value={credentials.apiSecret}
                        onChange={(e) =>
                          setCredentials({ ...credentials, apiSecret: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Enter your API secret"
                      />
                    </div>
                  )}

                  {/* Username */}
                  {selectedBrokerData?.fields.includes('username') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={credentials.username}
                        onChange={(e) =>
                          setCredentials({ ...credentials, username: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Enter your username"
                      />
                    </div>
                  )}

                  {/* Password */}
                  {selectedBrokerData?.fields.includes('password') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={credentials.password}
                        onChange={(e) =>
                          setCredentials({ ...credentials, password: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Enter your password"
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-danger/10 border border-danger rounded-lg text-danger text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Connect button */}
                  <motion.button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Authorize & Connect</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Security note */}
                <div className="mt-6 p-4 bg-background rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary">
                      Your credentials are encrypted end-to-end and never stored in plain text. 
                      We only use them to establish a secure connection with {selectedBrokerData?.name}.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="text-text-secondary hover:text-text-primary underline text-sm"
          >
            Skip for now (demo mode)
          </button>
        </motion.div>
      </div>
    </div>
  )
}
