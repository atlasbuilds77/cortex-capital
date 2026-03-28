export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get metadata
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        console.log('Checkout completed:', {
          userId,
          customerId,
          subscriptionId,
          email: session.customer_email,
        })

        // TODO: Update user tier in database
        // Example:
        // await prisma.user.update({
        //   where: { id: userId },
        //   data: {
        //     stripeCustomerId: customerId,
        //     stripeSubscriptionId: subscriptionId,
        //     tier: getTierFromPriceId(session.line_items?.data[0]?.price?.id),
        //     subscriptionStatus: 'active',
        //   },
        // })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        })

        // TODO: Update subscription status in database
        // await prisma.user.update({
        //   where: { stripeCustomerId: subscription.customer as string },
        //   data: {
        //     subscriptionStatus: subscription.status,
        //   },
        // })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Subscription deleted:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        })

        // TODO: Downgrade user to free tier
        // await prisma.user.update({
        //   where: { stripeCustomerId: subscription.customer as string },
        //   data: {
        //     tier: 'free',
        //     subscriptionStatus: 'canceled',
        //   },
        // })

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
