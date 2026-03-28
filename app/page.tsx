'use client'

import { useEffect, useRef, useState } from 'react'

// Demo embedded directly via /demo route (no iframe cross-origin issues)
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { HEADLINES, VALUE_PROPS, TRUST_SIGNALS, CTA, TESTIMONIALS, FAQ } from '@/lib/copy'
import { 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  Shield, 
  Landmark, 
  CheckCircle, 
  Star,
  ChevronDown,
  Play
} from 'lucide-react'

// Icon mapping for VALUE_PROPS and TRUST_SIGNALS
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'refresh-cw': RefreshCw,
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  'zap': Zap,
  'shield': Shield,
  'landmark': Landmark,
  'check-circle': CheckCircle,
}

// Simple background with subtle glows
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Solid dark background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle glow spots */}
      <motion.div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-1/3 -left-40 w-[450px] h-[450px] rounded-full bg-secondary/15 blur-[120px]"
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}

// Card component with glass effect
function Card({ children, className = '', hover = true }: { 
  children: React.ReactNode
  className?: string
  hover?: boolean 
}) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        bg-surface-elevated backdrop-blur-xl border border-white/[0.06]
        shadow-lg shadow-primary/[0.03]
        ${hover ? 'hover:border-primary/20 hover:bg-surface-elevated/80' : ''}
        transition-all duration-300
        ${className}
      `}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
    >
      {children}
    </motion.div>
  )
}

// Pricing tier card
function PricingCard({ 
  name, 
  price, 
  description, 
  features, 
  popular = false,
  cta 
}: {
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
  cta: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const handleClick = async () => {
    const tier = name.toLowerCase()
    
    // Free tier goes to signup
    if (tier === 'free') {
      router.push('/signup')
      return
    }
    
    // Paid tiers go to Stripe checkout
    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }
  
  return (
    <div className={`relative ${popular ? 'mt-4' : ''}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="px-4 py-1.5 bg-primary rounded-full text-xs font-semibold text-black whitespace-nowrap">
            Most Popular
          </div>
        </div>
      )}
    <Card 
      className={`p-8 flex flex-col relative ${
        popular 
          ? 'ring-2 ring-primary shadow-lg shadow-primary/20' 
          : ''
      }`}
      hover={true}
    >
      
      <h3 className="text-2xl font-semibold mb-2 text-white">{name}</h3>
      <p className="text-text-secondary text-sm mb-6">{description}</p>
      
      <div className="mb-6">
        <span className="text-5xl font-semibold text-primary">
          ${price}
        </span>
        <span className="text-text-muted">/month</span>
      </div>
      
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-text-secondary">
            <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
          popular 
            ? 'bg-primary text-black hover:shadow-lg hover:shadow-primary/25 hover:bg-accent' 
            : 'bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.08] text-white'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Loading...' : cta}
      </button>
    </Card>
    </div>
  )
}

// Testimonial card
function TestimonialCard({ quote, author, role, verified, index }: {
  quote: string
  author: string
  role: string
  verified: boolean
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="p-6 h-full">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
          ))}
        </div>
        <p className="text-white mb-6 leading-relaxed">"{quote}"</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{author}</p>
            <p className="text-sm text-gray-400">{role}</p>
          </div>
          {verified && (
            <div className="flex items-center gap-1 text-green-500 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Verified</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// Section wrapper with scroll animation
function AnimatedSection({ children, className = '', id }: { 
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// Stats counter
function StatNumber({ value, suffix = '', label }: { 
  value: number
  suffix?: string
  label: string 
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  
  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="text-4xl md:text-5xl font-semibold text-accent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {value}{suffix}
      </motion.div>
      <p className="text-text-secondary mt-2">{label}</p>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  useEffect(() => {
    const token = localStorage.getItem('cortex_token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  const pricingTiers = [
    {
      name: "Recovery",
      price: 29,
      description: "I'm learning",
      features: [
        "Watch agent discussions",
        "Alerts and analytics",
        "Educational content",
        "See WHY trades happen",
        "No execution"
      ],
      cta: "Start Learning"
    },
    {
      name: "Scout",
      price: 49,
      description: "I'm trading",
      features: [
        "Everything in Recovery",
        "Full agent access and phone booth",
        "Real-time signals with reasoning",
        "Priority support",
        "Your own portfolio analysis"
      ],
      popular: true,
      cta: "Start Trading"
    },
    {
      name: "Operator",
      price: 99,
      description: "It trades for me",
      features: [
        "Everything in Scout",
        "Auto-execution (connect broker)",
        "Personal hedge fund experience",
        "Long-term portfolio management",
        "The full Cortex desk working FOR you"
      ],
      cta: "Go Full Auto"
    }
  ]

  return (
    <div className="min-h-screen bg-background text-text-primary overflow-hidden">
      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex flex-col items-center justify-center px-6"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <AnimatedBackground />
        
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-50 p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-float animate-glow">
                <img 
                  src="/cortex-logo.png" 
                  alt="Cortex Capital" 
                  className="w-10 h-10"
                />
              </div>
              <span className="text-xl font-semibold text-primary">Cortex</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
              
              <button 
                onClick={() => router.push('/login')}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/pricing')}
                className="px-5 py-2.5 bg-primary text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:bg-accent transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-semibold leading-tight"
          >
            <span className="text-text-primary">
              Your Personal
            </span>
            <br />
            <span className="text-primary">
              Hedge Fund
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto"
          >
            {HEADLINES.hero.sub}. Automated trading, tax optimization, and portfolio management - all powered by AI agents that never sleep.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <button
              onClick={() => router.push('/signup')}
              className="group relative px-8 py-4 bg-primary text-black font-semibold rounded-xl hover:shadow-xl hover:shadow-primary/30 hover:bg-accent transition-all duration-300"
            >
              {CTA.primary}
            </button>
            
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white/[0.05] border border-white/[0.1] text-white font-semibold rounded-xl hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center gap-2"
            >
              Sign In
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <AnimatedSection id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              What Your AI Agents Do
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              7 specialized agents working in harmony to maximize your portfolio performance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUE_PROPS.map((prop, idx) => {
              const IconComponent = iconMap[prop.icon] || Zap
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className="p-6 h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                    <p className="text-text-secondary">{prop.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* Trust Signals */}
      <AnimatedSection className="py-24 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">Built for Trust</h2>
            <p className="text-xl text-text-secondary">Your security is our obsession</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TRUST_SIGNALS.map((signal, idx) => {
              const IconComponent = iconMap[signal.icon] || Shield
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                >
                  <Card className="p-8 text-center h-full">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{signal.title}</h3>
                    <p className="text-text-secondary">{signal.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* Pricing Section */}
      <AnimatedSection id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              No hidden fees. No percentage of assets. Just straightforward pricing that scales with you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {pricingTiers.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <PricingCard {...tier} />
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Removed demo section - available at /demo for logged-in users only */}

      {/* Testimonials */}
      <AnimatedSection className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Trusted by Traders
            </h2>
            <p className="text-xl text-text-secondary">
              Join thousands of investors who've upgraded to AI-powered trading
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, idx) => (
              <TestimonialCard key={idx} {...testimonial} index={idx} />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* FAQ Section */}
      <AnimatedSection className="py-24 px-6 bg-surface/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-8">
            {FAQ.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <h3 className="text-xl font-semibold text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Final CTA Section */}
      <AnimatedSection className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-semibold">
            Ready to Let AI <br />
            <span className="text-primary">
              Work for You?
            </span>
          </h2>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Join thousands of investors who've automated their trading with Cortex.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push('/signup')}
              className="group relative px-12 py-5 bg-primary text-black font-semibold rounded-xl text-lg hover:shadow-2xl hover:shadow-primary/30 hover:bg-accent transition-all duration-300"
            >
              {CTA.primary}
            </button>
          </div>
          
          <p className="text-text-muted">
            Already have an account?{' '}
            <button 
              onClick={() => router.push('/login')}
              className="text-primary hover:underline font-medium"
            >
              {CTA.auth.signIn}
            </button>
          </p>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/cortex-logo.png" 
                  alt="Cortex Capital" 
                  className="w-10 h-10 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]"
                />
                <span className="text-xl font-semibold text-primary">Cortex</span>
              </div>
              <p className="text-text-secondary text-sm">
                Your personal hedge fund, powered by AI.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><button onClick={() => router.push('/dashboard')} className="hover:text-primary transition-colors">Dashboard</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><button onClick={() => router.push('/about')} className="hover:text-primary transition-colors">About</button></li>
                <li><button onClick={() => router.push('/contact')} className="hover:text-primary transition-colors">Contact</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><button onClick={() => router.push('/terms')} className="hover:text-primary transition-colors">Terms of Service</button></li>
                <li><button onClick={() => router.push('/privacy')} className="hover:text-primary transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => router.push('/disclaimer')} className="hover:text-primary transition-colors">Disclaimer</button></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/[0.06] text-center">
            <p className="text-xs text-text-muted leading-relaxed max-w-4xl mx-auto mb-4">
              {HEADLINES.disclaimer}
            </p>
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Cortex Capital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
