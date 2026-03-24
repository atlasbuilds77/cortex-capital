'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Shield, 
  TrendingUp, 
  Bot, 
  Clock, 
  Target,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Zap,
  Lock,
  BarChart3,
  RefreshCw
} from 'lucide-react'

export default function RecoveryPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                                linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          {/* Alert Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">Market Recovery Program</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-center leading-tight mb-6"
          >
            <span className="text-white">Lost Money in</span>
            <br />
            <span className="text-purple-400">The Crash?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 text-center max-w-3xl mx-auto mb-8"
          >
            You're not alone. Millions lost their savings. But recovery is possible — 
            with discipline, strategy, and AI that doesn't panic.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link
              href="/signup?plan=recovery"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
            >
              Start Your Recovery
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#calculator"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold text-lg transition"
            >
              Recovery Calculator
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { value: '-47%', label: 'Average Portfolio Loss', subtext: 'During the crash' },
              { value: '18mo', label: 'Typical Recovery Time', subtext: 'With 12% annual returns' },
              { value: '24/7', label: 'AI Monitoring', subtext: 'Never sleeps' },
              { value: '$29', label: 'Recovery Plan', subtext: 'Per month' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
                <div className="text-xs text-gray-500">{stat.subtext}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Market Crashed. Your Discipline Doesn't Have To.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Most investors made emotional decisions during the crash. Panic selling. Holding too long. 
              Missing the recovery. AI doesn't have emotions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: AlertTriangle,
                title: 'The Emotional Trap',
                problem: 'Panic sold at the bottom',
                solution: 'AI executes your strategy without fear',
                color: 'red'
              },
              {
                icon: Clock,
                title: 'The Timing Problem',
                problem: 'Missed the recovery rally',
                solution: 'AI monitors 24/7, catches every opportunity',
                color: 'amber'
              },
              {
                icon: Target,
                title: 'The Discipline Gap',
                problem: 'No clear recovery plan',
                solution: 'Systematic approach to rebuilding',
                color: 'green'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <item.icon className={`w-10 h-10 mb-4 ${
                  item.color === 'red' ? 'text-red-400' : 
                  item.color === 'amber' ? 'text-amber-400' : 'text-green-400'
                }`} />
                <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-sm">✗</span>
                    <span className="text-gray-400 text-sm">{item.problem}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                    <span className="text-gray-300 text-sm">{item.solution}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recovery Calculator */}
      <section id="calculator" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Recovery Calculator</h2>
            <p className="text-gray-400">See how long it takes to rebuild your portfolio</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Input Side */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">How much did you lose?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                      type="text" 
                      defaultValue="25,000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-8 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Monthly contribution</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                      type="text" 
                      defaultValue="500"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-8 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Expected annual return</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                    <option value="8">8% (Conservative)</option>
                    <option value="12" selected>12% (Moderate)</option>
                    <option value="15">15% (Aggressive)</option>
                    <option value="20">20% (High Risk)</option>
                  </select>
                </div>
              </div>

              {/* Results Side */}
              <div className="bg-slate-800/50 rounded-xl p-6 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Time to full recovery</div>
                  <div className="text-5xl font-bold text-purple-400 mb-2">2.8 years</div>
                  <div className="text-sm text-gray-500 mb-6">With consistent monthly contributions</div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Total invested</div>
                      <div className="text-lg font-semibold text-white">$41,800</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Growth earned</div>
                      <div className="text-lg font-semibold text-green-400">+$8,200</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-sm text-gray-500">
                This is an estimate. Actual results depend on market conditions and strategy execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recovery Plan Features */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Recovery Plan</h2>
            <p className="text-gray-400 text-lg">Built specifically for post-crash rebuilding</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Capital Preservation First',
                desc: 'Defensive strategies protect what you have left. No more catastrophic losses.'
              },
              {
                icon: Bot,
                title: '7 AI Agents Working 24/7',
                desc: 'Each agent specializes in different market conditions. Together, they adapt.'
              },
              {
                icon: RefreshCw,
                title: 'Automated Rebalancing',
                desc: 'Stay diversified without manual effort. AI adjusts as markets shift.'
              },
              {
                icon: BarChart3,
                title: 'Progress Tracking',
                desc: 'Watch your portfolio heal. Daily updates on your recovery journey.'
              },
              {
                icon: Lock,
                title: 'Automated Stop Losses',
                desc: 'Never let emotions override discipline. Hard stops, always enforced.'
              },
              {
                icon: Zap,
                title: 'Opportunity Detection',
                desc: 'AI scans for recovery plays 24/7. Catch the bounce, not the knife.'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/30 transition"
              >
                <feature.icon className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Recovery Pricing</h2>
            <p className="text-gray-400">Lower barrier to entry. Because you've already lost enough.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recovery Plan */}
            <div className="bg-slate-900 border-2 border-purple-500 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Recovery Plan</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Cancel anytime</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'All 7 AI agents',
                  'Defensive strategy focus',
                  'Automated stop losses',
                  'Recovery progress dashboard',
                  'Weekly strategy reports',
                  'Email support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup?plan=recovery"
                className="block w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-center transition"
              >
                Start Recovery
              </Link>
            </div>

            {/* Accelerated Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Accelerated</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">$79</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">For faster recovery</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Recovery',
                  'Aggressive opportunity detection',
                  'Options strategies included',
                  'Copy-trading enabled',
                  'Priority execution',
                  'Direct chat support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup?plan=accelerated"
                className="block w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold text-center transition"
              >
                Choose Accelerated
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Crash Happened. The Recovery Starts Now.
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Every day you wait is a day of potential recovery missed. 
            Let AI do what humans can't — trade without emotion.
          </p>
          <Link
            href="/signup?plan=recovery"
            className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition"
          >
            Start Your Recovery
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-500 text-sm">
              © 2026 Cortex Capital. Not financial advice.
            </div>
            <div className="flex gap-6">
              <Link href="/terms" className="text-gray-500 hover:text-gray-400 text-sm">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-400 text-sm">Privacy</Link>
              <Link href="/disclaimer" className="text-gray-500 hover:text-gray-400 text-sm">Disclaimer</Link>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-gray-600">
            Trading involves substantial risk of loss. Past performance does not guarantee future results. 
            Only invest what you can afford to lose. Contact: support@zerogtrading.com
          </div>
        </div>
      </footer>
    </div>
  )
}
