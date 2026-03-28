import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, STRIPE_PRICES, PriceTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, email, userId } = body

    // Validate tier
    if (!tier || !(tier in STRIPE_PRICES)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      )
    }

    // Free tier doesn't need Stripe
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Free tier does not require checkout' },
        { status: 400 }
      )
    }

    // Get price ID
    const priceId = STRIPE_PRICES[tier as PriceTier]

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      email,
      userId,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
