'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BarChart3, Target, Zap, TrendingUp, Dices, Clock, Rocket, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface PreferencesData {
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive'
  tradingGoals: string[]
  sectorInterests: string[]
  exclusions: string[]
  enabledAgents: {
    analyst: boolean
    strategist: boolean
    executor: boolean
    reporter: boolean
    options_strategist: boolean
    day_trader: boolean
    momentum: boolean
  }
}

const TRADING_GOALS = [
  'Long-term growth',
  'Income generation',
  'Capital preservation',
  'Tax optimization',
  'Sector exposure',
  'Hedge positions',
]

const SECTOR_INTERESTS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Energy',
  'Consumer',
  'Industrials',
  'Real Estate',
  'Utilities',
  'Materials',
  'Communications',
]

const EXCLUSIONS = [
  'Tobacco',
  'Weapons',
  'Gambling',
  'Fossil fuels',
  'Private prisons',
  'Animal testing',
]

const AGENTS = [
  { id: 'analyst', name: 'ANALYST', description: 'Market analysis and trends', iconType: 'chart' },
  { id: 'strategist', name: 'STRATEGIST', description: 'Strategy planning and development', iconType: 'target' },
  { id: 'executor', name: 'EXECUTOR', description: 'Trade execution with optimal timing', iconType: 'zap' },
  { id: 'reporter', name: 'REPORTER', description: 'Performance reporting and insights', iconType: 'trending' },
  { id: 'options_strategist', name: 'OPTIONS_STRATEGIST', description: 'Options flow and strategies', iconType: 'dices' },
  { id: 'day_trader', name: 'DAY_TRADER', description: 'Intraday trading opportunities', iconType: 'clock' },
  { id: 'momentum', name: 'MOMENTUM', description: 'Momentum setups and plays', iconType: 'rocket' },
]

const AgentIcon = ({ iconType }: { iconType: string }) => {
  const iconClass = "w-5 h-5 text-purple-400"
  switch (iconType) {
    case 'chart': return <BarChart3 className={iconClass} />
    case 'target': return <Target className={iconClass} />
    case 'zap': return <Zap className={iconClass} />
    case 'trending': return <TrendingUp className={iconClass} />
    case 'dices': return <Dices className={iconClass} />
    case 'clock': return <Clock className={iconClass} />
    case 'rocket': return <Rocket className={iconClass} />
    default: return <BarChart3 className={iconClass} />
  }
}

export default function PreferencesPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<PreferencesData>({
    riskProfile: 'moderate',
    tradingGoals: ['Long-term growth', 'Tax optimization'],
    sectorInterests: ['Technology', 'Healthcare'],
    exclusions: [],
    enabledAgents: {
      analyst: true,
      strategist: true,
      executor: true,
      reporter: true,
      options_strategist: true,
      day_trader: true,
      momentum: true,
    },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await fetch('/api/user/preferences', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setPreferences({
            riskProfile: data.riskProfile || 'moderate',
            tradingGoals: data.tradingGoals || ['Long-term growth'],
            sectorInterests: data.sectorInterests || ['Technology'],
            exclusions: data.exclusions || [],
            enabledAgents: data.enabledAgents || preferences.enabledAgents,
          })
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPreferences()
  }, [token])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(preferences),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const toggleGoal = (goal: string) => {
    setPreferences({
      ...preferences,
      tradingGoals: preferences.tradingGoals.includes(goal)
        ? preferences.tradingGoals.filter(g => g !== goal)
        : [...preferences.tradingGoals, goal],
    })
  }

  const toggleSector = (sector: string) => {
    setPreferences({
      ...preferences,
      sectorInterests: preferences.sectorInterests.includes(sector)
        ? preferences.sectorInterests.filter(s => s !== sector)
        : [...preferences.sectorInterests, sector],
    })
  }

  const toggleExclusion = (exclusion: string) => {
    setPreferences({
      ...preferences,
      exclusions: preferences.exclusions.includes(exclusion)
        ? preferences.exclusions.filter(e => e !== exclusion)
        : [...preferences.exclusions, exclusion],
    })
  }

  const toggleAgent = (agentId: keyof PreferencesData['enabledAgents']) => {
    setPreferences({
      ...preferences,
      enabledAgents: {
        ...preferences.enabledAgents,
        [agentId]: !preferences.enabledAgents[agentId],
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Trading Preferences</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Customize how your AI agents trade on your behalf
        </p>
      </div>

      {/* Risk Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium">Risk Profile</label>
            <p className="text-text-secondary text-sm mt-1">
              Determines position sizing and strategy selection
            </p>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Re-take Assessment
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['conservative', 'moderate', 'aggressive'] as const).map((profile) => (
            <button
              key={profile}
              onClick={() => setPreferences({ ...preferences, riskProfile: profile })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                preferences.riskProfile === profile
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="font-medium capitalize">{profile}</div>
              <div className="text-text-secondary text-sm mt-1">
                {profile === 'conservative' && 'Low risk, steady returns'}
                {profile === 'moderate' && 'Balanced risk/reward'}
                {profile === 'aggressive' && 'High risk, high reward'}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Trading Goals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium mb-3">Trading Goals</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TRADING_GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => toggleGoal(goal)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                preferences.tradingGoals.includes(goal)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-700 text-text-secondary hover:border-gray-600'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Sector Interests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="block text-sm font-medium mb-3">Sector Interests</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECTOR_INTERESTS.map((sector) => (
            <button
              key={sector}
              onClick={() => toggleSector(sector)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                preferences.sectorInterests.includes(sector)
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-gray-700 text-text-secondary hover:border-gray-600'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Exclusions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <label className="block text-sm font-medium mb-3">
          Exclusions <span className="text-text-secondary font-normal">(optional)</span>
        </label>
        <p className="text-text-secondary text-sm mb-3">
          Industries and companies to avoid
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXCLUSIONS.map((exclusion) => (
            <button
              key={exclusion}
              onClick={() => toggleExclusion(exclusion)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                preferences.exclusions.includes(exclusion)
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'border-gray-700 text-text-secondary hover:border-gray-600'
              }`}
            >
              {exclusion}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Agent Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <label className="block text-sm font-medium mb-3">Active Agents</label>
        <p className="text-text-secondary text-sm mb-4">
          Choose which AI agents can trade on your behalf
        </p>
        <div className="space-y-3">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <AgentIcon iconType={agent.iconType} />
                </div>
                <div>
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-text-secondary text-sm">{agent.description}</div>
                </div>
              </div>
              <button
                onClick={() => toggleAgent(agent.id as keyof PreferencesData['enabledAgents'])}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.enabledAgents[agent.id as keyof PreferencesData['enabledAgents']]
                    ? 'bg-primary'
                    : 'bg-gray-700'
                }`}
                aria-label={`Toggle ${agent.name}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.enabledAgents[agent.id as keyof PreferencesData['enabledAgents']]
                      ? 'translate-x-6'
                      : ''
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Preferences saved! Agents will use these settings.</span>}
        </div>
      </motion.div>
    </div>
  )
}
