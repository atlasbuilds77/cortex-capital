export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { query } from '@/lib/db'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Price ID to tier mapping
const PRICE_TO_TIER: Record<string, string> = {
  'price_1TDsH9QVfeouH9H6zb4IAh2s': 'free',
  'price_1TDqOlQVfeouH9H6DJv5CtWl': 'recovery',
  'price_1TDqOiQVfeouH9H6ucOCqNnK': 'scout',
  'price_1TDqOjQVfeouH9H6SwXQbcX0': 'operator',
}

function getTierFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'free'
  return PRICE_TO_TIER[priceId] || 'free'
}

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
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const email = session.customer_email

        // Retrieve subscription to get price ID
        let tier = 'free'
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const priceId = subscription.items.data[0]?.price?.id
            tier = getTierFromPriceId(priceId)
          } catch (err) {
            console.error('Failed to retrieve subscription:', err)
          }
        }

        console.log('Checkout completed:', {
          customerId,
          subscriptionId,
          email,
          tier,
        })

        // Update user tier in database by email or stripe customer ID
        if (email) {
          try {
            const result = await query(
              `UPDATE users 
               SET tier = $1, 
                   stripe_customer_id = $2, 
                   stripe_subscription_id = $3,
                   subscription_status = 'active',
                   updated_at = NOW()
               WHERE email = $4
               RETURNING id, email, tier`,
              [tier, customerId, subscriptionId, email]
            )
            
            if (result.rows.length > 0) {
              console.log('User tier updated:', result.rows[0])
            } else {
              console.log('No user found with email:', email)
            }
          } catch (dbErr) {
            console.error('Database update failed:', dbErr)
          }
        }

        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price?.id
        const tier = getTierFromPriceId(priceId)
        const customerId = subscription.customer as string

        console.log('Subscription created:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId,
          tier,
        })

        // Update user tier by stripe customer ID
        try {
          await query(
            `UPDATE users 
             SET tier = $1,
                 stripe_subscription_id = $2,
                 subscription_status = $3,
                 updated_at = NOW()
             WHERE stripe_customer_id = $4`,
            [tier, subscription.id, subscription.status, customerId]
          )
        } catch (dbErr) {
          console.error('Database update failed:', dbErr)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price?.id
        const tier = getTierFromPriceId(priceId)
        const customerId = subscription.customer as string

        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId,
          tier,
        })

        // Update subscription status and tier
        try {
          await query(
            `UPDATE users 
             SET tier = $1,
                 subscription_status = $2,
                 updated_at = NOW()
             WHERE stripe_customer_id = $3`,
            [tier, subscription.status, customerId]
          )
        } catch (dbErr) {
          console.error('Database update failed:', dbErr)
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription deleted:', {
          subscriptionId: subscription.id,
          customerId,
        })

        // Downgrade user to free tier
        try {
          await query(
            `UPDATE users 
             SET tier = 'free',
                 subscription_status = 'canceled',
                 stripe_subscription_id = NULL,
                 updated_at = NOW()
             WHERE stripe_customer_id = $1`,
            [customerId]
          )
        } catch (dbErr) {
          console.error('Database update failed:', dbErr)
        }

        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        console.log('Invoice paid:', {
          invoiceId: invoice.id,
          customerId,
          amountPaid: invoice.amount_paid,
        })

        // Update subscription status to active (in case it was past_due)
        try {
          await query(
            `UPDATE users 
             SET subscription_status = 'active',
                 updated_at = NOW()
             WHERE stripe_customer_id = $1`,
            [customerId]
          )
        } catch (dbErr) {
          console.error('Database update failed:', dbErr)
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        console.log('Invoice payment failed:', {
          invoiceId: invoice.id,
          customerId,
        })

        // Mark subscription as past_due
        try {
          await query(
            `UPDATE users 
             SET subscription_status = 'past_due',
                 updated_at = NOW()
             WHERE stripe_customer_id = $1`,
            [customerId]
          )
        } catch (dbErr) {
          console.error('Database update failed:', dbErr)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
