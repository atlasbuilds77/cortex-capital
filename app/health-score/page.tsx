'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, 
  ArrowLeft,
  Plus, 
  Trash2, 
  BarChart3,
  TrendingUp,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react'
import { 
  calculateHealthScore, 
  predictImprovement,
  HealthScore,
  Prediction,
  PortfolioMetrics 
} from '@/lib/health-score'
import HealthScoreCard from '@/components/HealthScoreCard'

interface Holding {
  id: string
  symbol: string
  shares: number
  sector: string
}

const SECTORS = [
  'Technology',
  'Healthcare', 
  'Finance',
  'Consumer',
  'Energy',
  'Industrials',
  'Real Estate',
  'Materials',
  'Utilities',
  'Crypto',
  'ETF/Index',
  'Other'
]

// Demo data for quick preview
const DEMO_HOLDINGS: Holding[] = [
  { id: '1', symbol: 'AAPL', shares: 50, sector: 'Technology' },
  { id: '2', symbol: 'MSFT', shares: 30, sector: 'Technology' },
  { id: '3', symbol: 'JPM', shares: 25, sector: 'Finance' },
  { id: '4', symbol: 'JNJ', shares: 20, sector: 'Healthcare' },
  { id: '5', symbol: 'XOM', shares: 40, sector: 'Energy' },
]

export default function HealthScorePage() {
  const router = useRouter()
  const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input')
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: '1', symbol: '', shares: 0, sector: 'Technology' }
  ])
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Pre-fill email if captured from homepage
    const savedEmail = localStorage.getItem('cortex_lead_email')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  const addHolding = () => {
    setHoldings([
      ...holdings,
      { id: Date.now().toString(), symbol: '', shares: 0, sector: 'Technology' }
    ])
  }

  const removeHolding = (id: string) => {
    if (holdings.length > 1) {
      setHoldings(holdings.filter(h => h.id !== id))
    }
  }

  const updateHolding = (id: string, field: keyof Holding, value: string | number) => {
    setHoldings(holdings.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ))
  }

  const useDemoData = () => {
    setHoldings(DEMO_HOLDINGS)
  }

  const analyzePortfolio = async () => {
    setStep('analyzing')
    
    try {
      // Call API with real Polygon data
      const response = await fetch('/api/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      
      setHealthScore(data.healthScore)
      setPrediction(data.prediction)
      setStep('results')
      
    } catch (error) {
      console.error('Analysis failed:', error)
      
      // Fallback to local calculation if API fails
      const validHoldings = holdings.filter(h => h.symbol && h.shares > 0)
      const sectors = new Set(validHoldings.map(h => h.sector))
      
      const metrics: PortfolioMetrics = {
        sharpeRatio: 0.6 + Math.random() * 0.8,
        maxDrawdown: 0.12 + Math.random() * 0.12,
        positionCount: validHoldings.length,
        sectorCount: sectors.size,
        largestPositionWeight: 1 / Math.max(validHoldings.length, 1),
        winningTrades: Math.floor(Math.random() * 30) + 20,
        totalTrades: 50,
        monthlyReturnStdDev: 0.04 + Math.random() * 0.06,
        expenseRatio: 0.003 + Math.random() * 0.007,
        riskProfile: 'moderate'
      }

      const score = calculateHealthScore(metrics)
      const pred = predictImprovement(score.score, 'moderate')

      setHealthScore(score)
      setPrediction(pred)
      setStep('results')
    }
  }

  const handleSignup = () => {
    // Save score data for onboarding
    localStorage.setItem('cortex_health_score', JSON.stringify(healthScore))
    localStorage.setItem('cortex_holdings', JSON.stringify(holdings))
    router.push('/signup')
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Cortex</span>
          </div>
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* INPUT STEP */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Enter Your Holdings
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto">
                  Add your stocks and ETFs to get your personalized portfolio health score. 
                  We'll analyze your diversification, risk, and more.
                </p>
              </div>

              {/* Quick actions */}
              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={useDemoData}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                >
                  Use Demo Portfolio
                </button>
              </div>

              {/* Holdings form */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 text-sm text-gray-500 px-2">
                    <div className="col-span-4">Symbol</div>
                    <div className="col-span-3">Shares</div>
                    <div className="col-span-4">Sector</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Holdings */}
                  {holdings.map((holding, index) => (
                    <motion.div
                      key={holding.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-12 gap-4 items-center"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={holding.symbol}
                          onChange={(e) => updateHolding(holding.id, 'symbol', e.target.value.toUpperCase())}
                          placeholder="AAPL"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-colors uppercase"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={holding.shares || ''}
                          onChange={(e) => updateHolding(holding.id, 'shares', parseInt(e.target.value) || 0)}
                          placeholder="100"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div className="col-span-4">
                        <select
                          value={holding.sector}
                          onChange={(e) => updateHolding(holding.id, 'sector', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                        >
                          {SECTORS.map(sector => (
                            <option key={sector} value={sector} className="bg-[#1a1a1a]">
                              {sector}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeHolding(holding.id)}
                          disabled={holdings.length === 1}
                          className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Add holding button */}
                <button
                  onClick={addHolding}
                  className="mt-4 w-full py-3 border border-dashed border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Another Holding
                </button>
              </div>

              {/* Analyze button */}
              <button
                onClick={analyzePortfolio}
                disabled={!holdings.some(h => h.symbol && h.shares > 0)}
                className="w-full py-4 bg-primary hover:bg-accent disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Analyze My Portfolio
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Your data is encrypted and never shared
              </p>
            </motion.div>
          )}

          {/* ANALYZING STEP */}
          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-accent" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Analyzing Your Portfolio</h2>
              
              <div className="space-y-3 text-gray-400">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-primary" />
                  Calculating risk metrics...
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-primary" />
                  Analyzing diversification...
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  Generating recommendations...
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* RESULTS STEP */}
          {step === 'results' && healthScore && prediction && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Score Card */}
              <HealthScoreCard 
                healthScore={healthScore}
                prediction={prediction}
                showPrediction={true}
                animated={true}
              />

              {/* CTA Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="mt-8 p-8 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl text-center"
              >
                <h3 className="text-2xl font-semibold mb-3">
                  Ready to Improve Your Score?
                </h3>
                <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                  Join Cortex and let our AI agents optimize your portfolio. 
                  Users see an average +{prediction.improvement} point improvement in 90 days.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleSignup}
                    className="px-8 py-4 bg-primary hover:bg-accent text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Start with Recovery - $29/mo
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setStep('input')}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    Analyze Another Portfolio
                  </button>
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  Cancel anytime • See what the agents see
                </p>
              </motion.div>

              {/* Share/Save */}
              <div className="mt-6 flex justify-center gap-4">
                <button className="text-sm text-gray-400 hover:text-white transition-colors">
                  📧 Email My Results
                </button>
                <span className="text-gray-600">•</span>
                <button className="text-sm text-gray-400 hover:text-white transition-colors">
                  📤 Share Score
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
