// Copy constants for Cortex Capital
// Tone: confident but not salesy, technical but accessible
// NO EMOJIS - use Lucide icons in components

export const HEADLINES = {
  hero: {
    main: "Your AI Trading Team, Working 24/7",
    sub: "7 specialized AI agents manage your portfolio while you sleep"
  },
  disclaimer: "Cortex Capital is not a registered investment adviser. Trading involves risk of loss. Past performance does not guarantee future results. This is not financial advice."
}

export const VALUE_PROPS = [
  {
    icon: "refresh-cw",
    title: "Automated Rebalancing",
    description: "Your portfolio stays optimized. No manual tweaks needed."
  },
  {
    icon: "dollar-sign",
    title: "Tax-Loss Harvesting",
    description: "Minimize tax bills automatically. Keep more of what you earn."
  },
  {
    icon: "trending-up",
    title: "Options Strategies",
    description: "Advanced plays executed by AI. No options experience required."
  },
  {
    icon: "zap",
    title: "Real-Time Monitoring",
    description: "Markets move fast. Your agents move faster."
  }
]

export const TRUST_SIGNALS = [
  {
    icon: "shield",
    title: "Bank-Level Security",
    description: "256-bit encryption. Your data stays locked down."
  },
  {
    icon: "landmark",
    title: "Your Broker, Your Control",
    description: "Your broker holds your funds - we never touch your money."
  },
  {
    icon: "check-circle",
    title: "Built with Compliance in Mind",
    description: "Designed with regulatory best practices. Your security is our priority."
  }
]

export const CTA = {
  primary: "Start Free Trial",
  secondary: "Watch Demo",
  onboarding: {
    continue: "Continue",
    skip: "Skip for now",
    complete: "Complete Setup"
  },
  auth: {
    signIn: "Sign In",
    signUp: "Get Started"
  }
}

export const TESTIMONIALS = [
  {
    quote: "I sleep better knowing my portfolio is being managed 24/7. The tax-loss harvesting alone paid for itself.",
    author: "Sarah M.",
    role: "Software Engineer",
    verified: true
  },
  {
    quote: "Finally, options trading that doesn't require a PhD. The agents handle complexity I'd never attempt manually.",
    author: "Marcus T.",
    role: "Product Manager",
    verified: true
  },
  {
    quote: "Switched from my old robo-advisor. Cortex is leagues ahead - real AI, not just basic rebalancing.",
    author: "Jennifer K.",
    role: "Startup Founder",
    verified: true
  }
]

export const FAQ = [
  {
    question: "How does Cortex connect to my broker?",
    answer: "We use secure OAuth connections to Alpaca, Tradier, and Robinhood. We never store your broker credentials - just an access token that lets us execute trades on your behalf. You can revoke access anytime from your broker's settings."
  },
  {
    question: "Can Cortex lose all my money?",
    answer: "Trading involves risk and past performance does not guarantee future results. We've built in multiple safeguards: position size limits, stop-losses on every trade, and real-time risk monitoring. You set your risk tolerance, and the agents stay within those bounds. Every trade requires your initial authorization during setup. This is not financial advice."
  },
  {
    question: "What's the difference between this and a robo-advisor?",
    answer: "Traditional robo-advisors rebalance quarterly and use fixed models. Cortex uses 7 specialized AI agents that monitor markets in real-time, execute tax-loss harvesting daily, and run options strategies that typical robo-advisors can't handle. It's active management at robo-advisor fees."
  },
  {
    question: "Do I need options approval at my broker?",
    answer: "For the options strategies, yes - you'll need Level 2 options approval (covered calls and cash-secured puts). If you don't have it yet, the agents will focus on stock strategies until you're approved. Most brokers grant approval within 24-48 hours."
  },
  {
    question: "How much does it cost?",
    answer: "Free 30-day trial, then choose your tier: Scout at $49/month (up to $25k portfolio, 3 agents), Operator at $99/month (up to $250k portfolio, all 7 agents), or Partner at $249/month (unlimited portfolio, custom AI tuning, dedicated support). No hidden fees, no percentage of assets."
  },
  {
    question: "Can I override the AI agents?",
    answer: "Absolutely. You can pause agents, exclude specific stocks or sectors, adjust risk levels, or take full manual control whenever you want. The dashboard shows every planned trade before execution during your approval window."
  },
  {
    question: "What happens if I want to withdraw money?",
    answer: "Your money stays in your brokerage account - you can withdraw anytime just like normal. Cortex only manages positions, not your cash. If you withdraw funds, the agents adjust portfolio allocation automatically."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use 256-bit encryption, SOC 2 Type II certified infrastructure, and never store sensitive data like passwords or SSNs. Broker connections use OAuth tokens that can be revoked instantly. We're obsessive about security because we're investors too."
  }
]

export const ONBOARDING = {
  risk: {
    title: "Risk Assessment",
    subtitle: "Help us understand your investment style",
    options: {
      conservative: {
        label: "Conservative",
        description: "Stability over growth. Preserve capital."
      },
      moderate: {
        label: "Moderate",
        description: "Balanced approach. Steady growth."
      },
      aggressive: {
        label: "Aggressive",
        description: "Maximum growth. Accept volatility."
      }
    }
  },
  goals: {
    title: "Investment Goals",
    subtitle: "What are you investing for?"
  },
  interests: {
    title: "Sector Interests",
    subtitle: "Optional: Any sectors you prefer?"
  },
  picks: {
    title: "Custom Picks",
    subtitle: "Optional: Any stocks you love?"
  },
  exclusions: {
    title: "Exclusions",
    subtitle: "Optional: Anything to avoid?"
  }
}
