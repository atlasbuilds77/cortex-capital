import Stripe from 'stripe'

// Lazy-initialize Stripe (avoid build-time initialization)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return _stripe
}

// Keep for backward compatibility but use getStripe() in new code
export const stripe = typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null as unknown as Stripe

// Price ID mapping
export const STRIPE_PRICES = {
  free: 'price_1TDsH9QVfeouH9H6zb4IAh2s',
  recovery: 'price_1TDqOlQVfeouH9H6DJv5CtWl',
  scout: 'price_1TDqOiQVfeouH9H6ucOCqNnK',
  operator: 'price_1TDqOjQVfeouH9H6SwXQbcX0',
  partner: 'price_1TFPuVQVfeouH9H6ZvN4W9oy',
} as const

export type PriceTier = keyof typeof STRIPE_PRICES

// Helper to create checkout session
export async function createCheckoutSession({
  priceId,
  email,
  userId,
}: {
  priceId: string
  email?: string
  userId?: string
}) {
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    customer_email: email,
    metadata: {
      userId: userId || '',
    },
    subscription_data: {
      metadata: {
        userId: userId || '',
      },
    },
  })

  return session
}

// Helper to retrieve session
export async function getCheckoutSession(sessionId: string) {
  return await getStripe().checkout.sessions.retrieve(sessionId)
}

// Helper to get price info
// Only shows active tiers (Recovery, Scout, Operator)
// Free and Partner kept in STRIPE_PRICES for existing users but hidden from UI
export function getPriceInfo(tier: PriceTier) {
  const prices = {
    free: { amount: 0, name: 'Free' },
    recovery: { amount: 29, name: 'Recovery', description: 'I\'m learning' },
    scout: { amount: 49, name: 'Scout', description: 'I\'m trading' },
    operator: { amount: 99, name: 'Operator', description: 'It trades for me' },
    partner: { amount: 149.99, name: 'Partner' },
  }
  return prices[tier]
}

// Get only visible tiers for UI display
export function getVisibleTiers(): PriceTier[] {
  return ['recovery', 'scout', 'operator']
}
