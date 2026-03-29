'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  recommended?: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  downloadUrl?: string
}

const PLANS: Plan[] = [
  {
    id: 'recovery',
    name: 'Recovery',
    price: 29,
    interval: 'month',
    features: [
      'Watch agent discussions',
      'Alerts and analytics',
      'Educational content',
      'See WHY trades happen',
      'No execution',
    ],
  },
  {
    id: 'scout',
    name: 'Scout',
    price: 49,
    interval: 'month',
    recommended: true,
    features: [
      'Everything in Recovery',
      'Full agent access and phone booth',
      'Real-time signals with reasoning',
      'Priority support',
      'Your own portfolio analysis',
    ],
  },
  {
    id: 'operator',
    name: 'Operator',
    price: 99,
    interval: 'month',
    features: [
      'Everything in Scout',
      'Auto-execution (connect broker)',
      'Personal hedge fund experience',
      'Long-term portfolio management',
      'The full Cortex desk working FOR you',
    ],
  },
]

export default function BillingPage() {
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cortex_user') || '{}') : {}
  const [currentPlan] = useState(storedUser.tier || 'free')
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [invoices] = useState<Invoice[]>([
    { id: 'inv_001', date: '2026-03-01', amount: 99, status: 'paid' },
    { id: 'inv_002', date: '2026-02-01', amount: 99, status: 'paid' },
    { id: 'inv_003', date: '2026-01-01', amount: 99, status: 'paid' },
  ])
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return

    // Stripe Price IDs
    const PRICE_IDS: Record<string, string> = {
      recovery: 'price_1TDqOlQVfeouH9H6DJv5CtWl',
      scout: 'price_1TDqOiQVfeouH9H6ucOCqNnK',
      operator: 'price_1TDqOjQVfeouH9H6SwXQbcX0',
    }

    const priceId = PRICE_IDS[planId]
    if (!priceId) {
      alert('Invalid plan selected')
      return
    }

    try {
      const token = localStorage.getItem('cortex_token')
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId, planId }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to start checkout')
        return
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    }
  }

  const handleCancelSubscription = () => {
    // TODO: Implement cancellation flow
    alert('Subscription cancellation not yet implemented')
    setShowCancelModal(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Billing & Subscription</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Manage your plan and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 bg-purple-600/10 rounded-xl border border-purple-500/30"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Current Plan</h3>
            <p className="text-3xl font-bold">
              {PLANS.find(p => p.id === currentPlan)?.name}
            </p>
            <p className="text-text-secondary mt-2">
              ${PLANS.find(p => p.id === currentPlan)?.price}/month
            </p>
          </div>
          <span className="px-3 py-1 bg-success/20 text-success rounded-full text-sm font-medium">
            Active
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-text-secondary text-sm">
            Your subscription renews on April 27, 2026
          </p>
        </div>
      </motion.div>

      {/* Billing Interval Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2 p-1 bg-background rounded-lg border border-gray-700">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              billingInterval === 'month'
                ? 'bg-primary text-background'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              billingInterval === 'year'
                ? 'bg-primary text-background'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Yearly <span className="text-success text-sm ml-1">(Save 20%)</span>
          </button>
        </div>
      </motion.div>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`p-6 rounded-xl border-2 transition-all ${
              plan.recommended
                ? 'border-primary bg-primary/5'
                : 'border-gray-700 bg-background'
            } ${plan.id === currentPlan ? 'ring-2 ring-success' : ''}`}
          >
            {plan.recommended && (
              <div className="px-3 py-1 bg-primary text-background rounded-full text-xs font-bold mb-4 inline-block">
                RECOMMENDED
              </div>
            )}
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-3xl font-bold">
                ${billingInterval === 'year' ? Math.floor(plan.price * 12 * 0.8) : plan.price}
              </span>
              <span className="text-text-secondary">/{billingInterval === 'year' ? 'year' : 'month'}</span>
              {billingInterval === 'year' && (
                <div className="text-xs text-success mt-1">Save ${Math.floor(plan.price * 12 * 0.2)}/year</div>
              )}
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-success mt-0.5 font-bold">+</span>
                  <span className="text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={plan.id === currentPlan}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                plan.id === currentPlan
                  ? 'bg-gray-700 text-text-secondary cursor-not-allowed'
                  : plan.recommended
                  ? 'bg-primary text-background hover:bg-primary/90'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {plan.id === currentPlan ? 'Current Plan' : 'Upgrade'}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Payment Method */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
        <div className="p-4 bg-background rounded-lg border border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">💳</span>
            <div>
              <div className="font-medium">Visa ending in 4242</div>
              <div className="text-text-secondary text-sm">Expires 12/2025</div>
            </div>
          </div>
          <button className="text-primary hover:text-primary/80 transition-colors">
            Update
          </button>
        </div>
      </motion.div>

      {/* Billing History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-lg font-semibold mb-4">Billing History</h3>
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 bg-background rounded-lg border border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{formatDate(invoice.date)}</div>
                  <div className="text-text-secondary text-sm">${invoice.amount.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-success/10 text-success'
                      : invoice.status === 'pending'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {invoice.status.toUpperCase()}
                </span>
                <button className="text-primary hover:text-primary/80 transition-colors text-sm">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Cancel Subscription */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="pt-8 border-t border-gray-700"
      >
        <button
          onClick={() => setShowCancelModal(true)}
          className="text-danger hover:text-danger/80 transition-colors text-sm"
        >
          Cancel Subscription
        </button>
      </motion.div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCancelModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">Cancel Subscription?</h3>
            <p className="text-text-secondary mb-6">
              Your subscription will remain active until the end of your billing period on April 27, 2026.
              After that, you'll lose access to AI trading features.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-surface-elevated transition-all"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 px-4 py-3 bg-danger text-white rounded-lg hover:bg-danger/90 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
