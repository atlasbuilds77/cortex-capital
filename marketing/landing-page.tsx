'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      name: 'Scout',
      price: billingCycle === 'monthly' ? 49 : 39,
      description: 'Perfect for getting started',
      features: [
        'LEAPS Options strategy',
        'Sector Rotation signals',
        'Portfolio health monitoring',
        'Weekly reports',
        'Email support',
        'Basic analytics dashboard'
      ],
      cta: 'Start Free Trial'
    },
    {
      name: 'Operator',
      price: billingCycle === 'monthly' ? 99 : 79,
      description: 'Most popular for serious investors',
      popular: true,
      features: [
        'Everything in Scout, plus:',
        'Covered Calls income generation',
        'Tax-Loss Harvesting',
        'Priority support',
        'Advanced analytics',
        'Custom alerts',
        'Multi-portfolio management'
      ],
      cta: 'Start Free Trial'
    },
    {
      name: 'Partner',
      price: billingCycle === 'monthly' ? 249 : 199,
      description: 'For traders who want it all',
      features: [
        'Everything in Operator, plus:',
        'Day Trading signals',
        'Live market commentary',
        'Direct agent access',
        'API access',
        'Custom strategy builder',
        'White-glove onboarding',
        'Priority execution'
      ],
      cta: 'Start Free Trial'
    }
  ]

  const agents = [
    {
      name: 'ANALYST',
      role: 'Portfolio Health Monitor',
      description: 'Watches your positions 24/7, identifies risks before they become losses',
      emoji: '📊'
    },
    {
      name: 'STRATEGIST',
      role: 'Planning & Optimization',
      description: 'Identifies opportunities, plans your next moves, adapts to market conditions',
      emoji: '🎯'
    },
    {
      name: 'EXECUTOR',
      role: 'Trade Execution',
      description: 'Executes trades at optimal moments, manages timing, fills, and slippage',
      emoji: '⚡'
    },
    {
      name: 'SENTINEL',
      role: 'Risk Management',
      description: 'Guards against downside, manages position sizing, enforces stop-losses',
      emoji: '🛡️'
    },
    {
      name: 'SCOUT',
      role: 'Market Intelligence',
      description: 'Scans markets for opportunities, identifies trends early, filters noise',
      emoji: '🔍'
    },
    {
      name: 'OPTIMIZER',
      role: 'Tax Efficiency',
      description: 'Harvests losses, optimizes holding periods, minimizes tax drag',
      emoji: '💰'
    },
    {
      name: 'ORACLE',
      role: 'Backtesting & Validation',
      description: 'Tests strategies before deployment, validates signals, learns from outcomes',
      emoji: '🔮'
    }
  ]

  const faqs = [
    {
      q: 'Is this a hedge fund?',
      a: 'No. Cortex Capital is software that uses hedge fund-style strategies. Your money stays in your brokerage account under your control. We provide the intelligence and automation.'
    },
    {
      q: 'Is my money safe?',
      a: 'Your money stays in YOUR brokerage account (Tradier, Alpaca, etc.). We never custody funds. You maintain full control and can disconnect at any time.'
    },
    {
      q: 'What brokers do you support?',
      a: 'Currently Tradier and Alpaca, with Interactive Brokers and TD Ameritrade coming soon. Our API-first approach makes adding new brokers straightforward.'
    },
    {
      q: 'Can I lose money?',
      a: 'Yes. All investing involves risk, including loss of principal. Our AI agents use sophisticated strategies to manage risk, but markets are unpredictable. Past performance does not guarantee future results.'
    },
    {
      q: 'What if I want to stop?',
      a: 'Cancel anytime. No lock-in, no contracts. You keep your portfolio positions - they\'re in your brokerage account. You can continue managing them manually or liquidate as you see fit.'
    },
    {
      q: 'How is this different from robo-advisors?',
      a: 'Robo-advisors buy and hold ETFs (7-8% annual returns). We use active strategies: LEAPS options (4x leverage), sector rotation (ride momentum), covered calls (income generation), and day trading (Partner tier). Higher potential returns, but also higher risk.'
    },
    {
      q: 'Do I need trading experience?',
      a: 'No. Our AI agents handle the complexity. You set your goals and risk tolerance during onboarding - they do the rest. Perfect for busy professionals who want better returns without the time commitment.'
    },
    {
      q: 'What\'s the minimum account size?',
      a: 'We recommend starting with at least $5,000 for proper diversification. Options strategies work best with $10K+. No maximum - we manage portfolios from $5K to $500K+.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 to-transparent" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-[#00d4ff] bg-clip-text text-transparent">
              YOUR PERSONAL HEDGE FUND
            </h1>
            <p className="text-2xl md:text-3xl mb-4 text-gray-300">
              Hedge fund strategies. AI-powered. <span className="text-[#00d4ff]">$49/month.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 mt-8">
              <button className="bg-[#00d4ff] text-[#1a1a2e] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#00d4ff]/90 transition">
                Start Free Trial
              </button>
              <button className="border-2 border-[#00d4ff] text-[#00d4ff] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#00d4ff]/10 transition">
                Watch Demo
              </button>
            </div>
            <p className="text-xl text-gray-400 italic max-w-2xl mx-auto">
              "Wall Street charges 2% + 20% and requires $1M.<br />
              We bring the same strategies to everyone."
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="border-y border-[#00d4ff]/20 bg-[#1a1a2e]/50 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#00d4ff]">$2.4M+</div>
              <div className="text-gray-400 mt-2">Assets Under Management</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00d4ff]">1,200+</div>
              <div className="text-gray-400 mt-2">Active Portfolios</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00ff88]">12.4%*</div>
              <div className="text-gray-400 mt-2">Average Return</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            *Past performance is not indicative of future results. Individual results may vary.
          </p>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            THE OLD WAY DOESN'T WORK
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-red-400">Hedge Funds</h3>
              <ul className="space-y-2 text-gray-300">
                <li>❌ 2% + 20% fees</li>
                <li>❌ $1M+ minimum</li>
                <li>❌ Accredited investors only</li>
                <li>❌ Lock-up periods</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-yellow-400">Robo-Advisors</h3>
              <ul className="space-y-2 text-gray-300">
                <li>⚠️ Boring ETF portfolios</li>
                <li>⚠️ 7% average returns</li>
                <li>⚠️ No active management</li>
                <li>⚠️ One-size-fits-all</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">DIY Trading</h3>
              <ul className="space-y-2 text-gray-300">
                <li>😰 Emotional decisions</li>
                <li>⏰ Extremely time-consuming</li>
                <li>📉 High risk of mistakes</li>
                <li>😵 Overwhelming complexity</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-transparent to-[#00d4ff]/5">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            MEET YOUR AI PORTFOLIO TEAM
          </h2>
          <p className="text-xl text-center text-gray-400 mb-16 max-w-3xl mx-auto">
            7 AI agents work 24/7 to grow your wealth. Each specializes in a different aspect of portfolio management.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {agents.map((agent) => (
              <div key={agent.name} className="bg-[#1a1a2e]/80 border border-[#00d4ff]/20 p-6 rounded-lg hover:border-[#00d4ff]/50 transition">
                <div className="text-5xl mb-4">{agent.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-[#00d4ff]">{agent.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{agent.role}</p>
                <p className="text-gray-300 text-sm">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { num: '1', title: 'Tell us your goals', desc: '5 min onboarding to understand your risk tolerance, timeline, and objectives' },
              { num: '2', title: 'We build your portfolio', desc: 'Our AI agents design a custom strategy based on your profile and market conditions' },
              { num: '3', title: 'AI manages everything', desc: 'Agents monitor markets 24/7, execute trades, manage risk, optimize taxes' },
              { num: '4', title: 'You check in when you want', desc: 'Track performance, adjust goals, or just let it run. You\'re always in control' }
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 bg-[#00d4ff] text-[#1a1a2e] rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE STRATEGIES */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-[#00d4ff]/5 to-transparent">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            NOT YOUR GRANDMA'S ROBO-ADVISOR
          </h2>
          <p className="text-xl text-center text-gray-400 mb-16 max-w-3xl mx-auto">
            We use sophisticated hedge fund strategies, automated and optimized by AI.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'LEAPS Options', desc: '4x leverage without margin. Long-dated calls for asymmetric upside.', icon: '🚀' },
              { name: 'Sector Rotation', desc: 'Ride momentum by rotating into leading sectors, exit laggards early.', icon: '🔄' },
              { name: 'Covered Calls', desc: 'Generate consistent income from your positions while waiting for appreciation.', icon: '💵' },
              { name: 'Day Trading Signals', desc: 'Partner tier: Intraday opportunities with tight risk management.', icon: '⚡' },
              { name: 'Tax-Loss Harvesting', desc: 'Automatically harvest losses to offset gains and reduce tax burden.', icon: '🧾' },
              { name: 'Risk Management', desc: 'Position sizing, stop-losses, and portfolio rebalancing on autopilot.', icon: '🛡️' }
            ].map((strategy) => (
              <div key={strategy.name} className="bg-[#1a1a2e]/80 border border-[#00ff88]/20 p-6 rounded-lg flex gap-4">
                <div className="text-4xl">{strategy.icon}</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-[#00ff88]">{strategy.name}</h3>
                  <p className="text-gray-300">{strategy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            SIMPLE, TRANSPARENT PRICING
          </h2>
          
          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={billingCycle === 'monthly' ? 'text-white font-bold' : 'text-gray-400'}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-16 h-8 bg-[#00d4ff]/20 rounded-full transition"
            >
              <div className={`absolute top-1 w-6 h-6 bg-[#00d4ff] rounded-full transition-transform ${billingCycle === 'annual' ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
            <span className={billingCycle === 'annual' ? 'text-white font-bold' : 'text-gray-400'}>
              Annual <span className="text-[#00ff88] text-sm">(Save 20%)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative bg-[#1a1a2e]/80 border ${plan.popular ? 'border-[#00d4ff] shadow-lg shadow-[#00d4ff]/20' : 'border-gray-700'} p-8 rounded-lg`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00d4ff] text-[#1a1a2e] px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <button className={`w-full py-3 rounded-lg font-bold mb-8 transition ${plan.popular ? 'bg-[#00d4ff] text-[#1a1a2e] hover:bg-[#00d4ff]/90' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#00ff88] mt-1">✓</span>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FISH TANK DEMO */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-transparent to-[#00d4ff]/5">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            WATCH THE AI WORK
          </h2>
          <p className="text-xl text-center text-gray-400 mb-12 max-w-3xl mx-auto">
            This is a live demo account. Watch our agents trade in real-time.
          </p>
          <div className="max-w-5xl mx-auto bg-[#1a1a2e]/80 border border-[#00d4ff]/20 rounded-lg p-8 aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🐠</div>
              <p className="text-2xl text-gray-400">[Claw3D Visualization Embed]</p>
              <p className="text-gray-500 mt-4">Live market data • Real agent decisions • Transparent execution</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            WHAT INVESTORS SAY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { quote: 'Started with $10K, now at $14K in 8 months. The AI actually works.', author: 'Beta User', role: 'Scout Plan' },
              { quote: 'I was skeptical about AI trading, but the transparency and control won me over.', author: 'Sarah M.', role: 'Operator Plan' },
              { quote: 'Finally, hedge fund strategies without the hedge fund fees. Game changer.', author: 'Marcus T.', role: 'Partner Plan' }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-[#1a1a2e]/80 border border-[#00d4ff]/20 p-6 rounded-lg">
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-[#00d4ff]/5 to-transparent">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#1a1a2e]/80 border border-gray-700 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-[#00d4ff]">{faq.q}</h3>
                <p className="text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-[#00d4ff]/10 to-transparent border border-[#00d4ff]/20 p-12 rounded-lg">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              READY TO GROW YOUR WEALTH?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join 1,200+ investors using AI to build wealth.
            </p>
            <button className="bg-[#00d4ff] text-[#1a1a2e] px-12 py-5 rounded-lg font-bold text-xl hover:bg-[#00d4ff]/90 transition mb-6">
              Start Free 14-Day Trial
            </button>
            <p className="text-gray-400">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-xl mb-4 text-[#00d4ff]">Cortex Capital</h3>
              <p className="text-gray-400 text-sm">Your Personal Hedge Fund</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
                <li><Link href="/demo">Watch Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/support">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Social</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="https://twitter.com/cortexcapital">Twitter</Link></li>
                <li><Link href="https://discord.gg/cortexcapital">Discord</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-6 text-gray-400 text-sm">
                <Link href="/terms">Terms of Service</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/disclaimer">Risk Disclaimer</Link>
              </div>
              <p className="text-gray-500 text-sm">© 2026 Cortex Capital. All rights reserved.</p>
            </div>
            <p className="text-xs text-gray-500 mt-6 max-w-4xl">
              DISCLAIMER: Cortex Capital is not a registered investment advisor, broker-dealer, or hedge fund. 
              All investing involves risk, including loss of principal. Past performance does not guarantee future results. 
              The strategies employed may use leverage and derivatives, which can amplify both gains and losses. 
              Cortex Capital provides software and automated trading signals; you maintain full control of your brokerage account. 
              Consult with a qualified financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
