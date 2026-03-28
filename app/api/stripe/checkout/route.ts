export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const VALID_PRICES = [
  'price_1TDqOlQVfeouH9H6DJv5CtWl', // recovery
  'price_1TDqOiQVfeouH9H6ucOCqNnK', // scout
  'price_1TDqOjQVfeouH9H6SwXQbcX0', // operator
];

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { priceId, planId } = body;

    if (!priceId || !VALID_PRICES.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3005'}/settings/billing?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3005'}/settings/billing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.userId,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: user.userId,
          planId: planId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});
