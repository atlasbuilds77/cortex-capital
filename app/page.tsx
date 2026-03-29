'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { 
  ArrowRight, 
  Check, 
  Shield, 
  TrendingUp, 
  PieChart,
  Zap,
  Users,
  BarChart3,
  Lock,
  ChevronDown
} from 'lucide-react'

// SEO metadata is in layout.tsx

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Animated stats
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true })

  const handleGetStarted = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    // Store email and redirect to health score tool
    localStorage.setItem('cortex_lead_email', email)
    router.push('/health-score')
  }

  const scrollToFeatures = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">Cortex</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/login')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/health-score')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors"
            >
              Get Free Score
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-8"
          >
            <Shield className="w-4 h-4" />
            <span>Trusted by 2,400+ investors</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            What's Your Portfolio{' '}
            <span className="text-emerald-400">Health Score?</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
          >
            Get a free analysis of your investment portfolio. See exactly where you're losing money and how AI can fix it in 90 days.
          </motion.p>

          {/* Email capture form */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleGetStarted}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? 'Loading...' : 'Get Free Score'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.form>

          {/* Social proof */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center justify-center gap-6 text-sm text-gray-500"
          >
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              Free forever
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              No credit card
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              2 min setup
            </span>
          </motion.div>

          {/* Scroll indicator */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            onClick={scrollToFeatures}
            className="mt-16 text-gray-500 hover:text-white transition-colors"
          >
            <ChevronDown className="w-8 h-8 mx-auto animate-bounce" />
          </motion.button>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '847', label: 'Portfolios Analyzed' },
            { value: '+18', suffix: 'pts', label: 'Avg Score Improvement' },
            { value: '94', suffix: '%', label: 'User Satisfaction' },
            { value: '$2.4M', label: 'Assets Optimized' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-emerald-400">
                {stat.value}{stat.suffix || ''}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Get your portfolio health score in under 2 minutes. No account required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Enter Your Holdings',
                description: 'Add your stocks, ETFs, or connect your broker for automatic sync.',
                icon: PieChart,
              },
              {
                step: '02',
                title: 'Get Your Score',
                description: 'Our algorithm analyzes 6 key factors to calculate your 0-100 health score.',
                icon: BarChart3,
              },
              {
                step: '03',
                title: 'See Improvements',
                description: 'Get personalized recommendations and see your projected score in 90 days.',
                icon: TrendingUp,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-8 bg-white/[0.03] border border-white/5 rounded-2xl"
              >
                <div className="text-5xl font-bold text-white/5 absolute top-4 right-4">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Score Preview */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-emerald-500/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Your Score Tells the{' '}
                <span className="text-emerald-400">Full Story</span>
              </h2>
              <p className="text-gray-400 mb-8">
                Like a credit score for your investments. We analyze risk-adjusted returns, diversification, drawdown control, and more to give you a complete picture.
              </p>
              
              <div className="space-y-4">
                {[
                  'Risk-Adjusted Returns (Sharpe Ratio)',
                  'Maximum Drawdown Analysis',
                  'Diversification Score',
                  'Win Rate & Consistency',
                  'Expense Efficiency',
                  'Personalized Recommendations',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/health-score')}
                className="mt-8 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                Check Your Score
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Score visualization preview */}
            <div className="relative">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
                {/* Animated score circle */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#1a1a1a"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={553}
                      initial={{ strokeDashoffset: 553 }}
                      whileInView={{ strokeDashoffset: 553 * 0.42 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      className="text-5xl font-bold text-emerald-400"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      58
                    </motion.span>
                    <span className="text-gray-500 text-sm">Fair</span>
                  </div>
                </div>

                {/* Score breakdown preview */}
                <div className="space-y-3">
                  {[
                    { name: 'Risk-Adjusted', score: 45, color: 'bg-amber-500' },
                    { name: 'Diversification', score: 60, color: 'bg-emerald-500' },
                    { name: 'Drawdown Control', score: 55, color: 'bg-amber-500' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{item.name}</span>
                        <span className="text-white">{item.score}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${item.color} rounded-full`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prediction badge */}
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Projected with Cortex</p>
                      <p className="text-2xl font-bold text-emerald-400">76</p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-semibold">+18 pts</span>
                      <p className="text-xs text-gray-500">in 90 days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Investors Trust Cortex
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              More than a score. A complete AI-powered portfolio management system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: '10 AI Agents',
                description: 'Specialized agents for analysis, risk, momentum, and execution working 24/7.',
              },
              {
                icon: Zap,
                title: 'Auto-Execution',
                description: 'Connect your broker and let AI handle trades while you sleep.',
              },
              {
                icon: Shield,
                title: 'Bank-Level Security',
                description: 'AES-256 encryption. Your credentials never touch our servers.',
              },
              {
                icon: TrendingUp,
                title: 'Real-Time Signals',
                description: 'Get alerted to opportunities before they hit mainstream news.',
              },
              {
                icon: Users,
                title: 'Agent Discussions',
                description: 'Watch AI agents debate trades and explain their reasoning.',
              },
              {
                icon: Lock,
                title: 'No Lock-In',
                description: 'Cancel anytime. Your data is always yours.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="p-6 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/20 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-gray-400">
              Start free. Upgrade when you're ready for AI execution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Recovery',
                price: 29,
                description: 'Learn from AI',
                features: ['Health Score', 'Agent Discussions', 'Trade Signals', 'Educational Content'],
                cta: 'Start Learning',
                popular: false,
              },
              {
                name: 'Scout',
                price: 49,
                description: 'Active trading',
                features: ['Everything in Recovery', 'Phone Booth (talk to agents)', 'Portfolio Analysis', 'Priority Support'],
                cta: 'Start Trading',
                popular: true,
              },
              {
                name: 'Operator',
                price: 99,
                description: 'Full automation',
                features: ['Everything in Scout', 'Auto-Execution', 'Broker Integration', 'Your personal hedge fund'],
                cta: 'Go Full Auto',
                popular: false,
              },
            ].map((tier, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative p-8 rounded-2xl border ${
                  tier.popular 
                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-emerald-500 text-black text-xs font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{tier.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold">${tier.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => router.push('/signup')}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    tier.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to See Your{' '}
            <span className="text-emerald-400">Health Score?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join 2,400+ investors who've already optimized their portfolios with Cortex.
          </p>
          <button
            onClick={() => router.push('/health-score')}
            className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black text-lg font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            Get Your Free Score
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required • Takes 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">Cortex</span>
              </div>
              <p className="text-gray-500 text-sm">
                Your portfolio health, optimized by AI.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/health-score" className="hover:text-white transition-colors">Health Score</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600 max-w-3xl mx-auto mb-4">
              Cortex Capital is not a registered investment advisor. Past performance does not guarantee future results. 
              Trading involves risk of loss. This is not financial advice.
            </p>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Cortex Capital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
