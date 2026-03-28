export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

// Reverse lookup: price ID to tier name
const PRICE_TO_TIER: Record<string, string> = Object.entries(STRIPE_PRICES).reduce(
  (acc, [tier, priceId]) => ({ ...acc, [priceId]: tier }),
  {} as Record<string, string>
)

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Get tier from line items
    const priceId = session.line_items?.data[0]?.price?.id
    const tier = priceId ? PRICE_TO_TIER[priceId] : null

    if (!tier) {
      return NextResponse.json(
        { error: 'Could not determine tier' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      verified: true,
      tier,
      email: session.customer_email,
      customerId: session.customer,
      subscriptionId: session.subscription,
    })
  } catch (error: any) {
    console.error('Verify checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
