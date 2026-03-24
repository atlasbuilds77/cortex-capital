// Payment Routes (Stripe Integration)
// Checkout, webhooks, and subscription management

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import {
  stripe,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  constructWebhookEvent,
  ensureStripeProducts,
  getPriceId,
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
} from '../lib/stripe';
import { sendSubscriptionConfirmation, sendCancellationConfirmation } from '../lib/email';
import { authenticate, AuthenticatedRequest } from '../lib/auth';
import { query } from '../integrations/database';

const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function paymentRoutes(server: FastifyInstance) {
  // Initialize Stripe products on startup (if Stripe is configured)
  if (stripe) {
    try {
      await ensureStripeProducts();
      server.log.info('[STRIPE] Products and prices initialized');
    } catch (error: any) {
      server.log.error(`[STRIPE] Failed to initialize products: ${error?.message || error}`);
    }
  }

  // GET /api/subscription/tiers - Get available subscription tiers
  server.get('/api/subscription/tiers', async (request, reply) => {
    const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.price / 100, // Convert cents to dollars (free = 0)
      interval: config.interval,
      features: config.features,
      limits: config.limits,
      priceId: key === 'free' ? null : getPriceId(key as SubscriptionTier),
    }));

    return {
      success: true,
      data: tiers,
    };
  });

  // POST /api/checkout - Create Stripe checkout session
  server.post<{
    Body: {
      tier: SubscriptionTier;
    };
  }>(
    '/api/checkout',
    {
      preHandler: authenticate,
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        if (!stripe) {
          return reply.status(503).send({
            success: false,
            error: 'Payment processing not available',
          });
        }

        const body = request.body as { tier: SubscriptionTier };
        const { tier } = body;

        if (!SUBSCRIPTION_TIERS[tier]) {
          return reply.status(400).send({
            success: false,
            error: `Invalid tier: ${tier}. Must be one of: ${Object.keys(SUBSCRIPTION_TIERS).join(', ')}`,
          });
        }

        const session = await createCheckoutSession({
          userId: request.user!.userId,
          email: request.user!.email,
          tier,
          successUrl: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${APP_URL}/checkout/cancel`,
        });

        return {
          success: true,
          data: {
            session_id: session.id,
            url: session.url,
          },
        };
      } catch (error: any) {
        server.log.error('[CHECKOUT] Failed:', error);
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // POST /api/webhook - Stripe webhook handler
  server.post(
    '/api/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!stripe || !STRIPE_WEBHOOK_SECRET) {
          return reply.status(503).send({
            success: false,
            error: 'Webhook processing not available',
          });
        }

        const signature = request.headers['stripe-signature'] as string;
        if (!signature) {
          return reply.status(400).send({
            success: false,
            error: 'Missing stripe-signature header',
          });
        }

        // Get raw body for signature verification
        const rawBody = (request as any).rawBody || JSON.stringify(request.body);

        let event;
        try {
          event = constructWebhookEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err: any) {
          server.log.error('[WEBHOOK] Signature verification failed:', err.message);
          return reply.status(400).send({
            success: false,
            error: 'Webhook signature verification failed',
          });
        }

        server.log.info(`[WEBHOOK] Received event: ${event.type}`);

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata?.user_id;
            const tier = session.metadata?.tier;

            if (userId && tier) {
              // Update user subscription in database
              await query(
                `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_start, current_period_end)
                 VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '1 month')
                 ON CONFLICT (user_id) DO UPDATE SET
                   stripe_customer_id = EXCLUDED.stripe_customer_id,
                   stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                   tier = EXCLUDED.tier,
                   status = 'active',
                   current_period_start = NOW(),
                   current_period_end = NOW() + INTERVAL '1 month',
                   updated_at = NOW()`,
                [userId, session.customer, session.subscription, tier]
              );

              // Update user tier
              await query(`UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2`, [tier, userId]);

              // Send confirmation email
              const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
              if (userResult.rows[0]) {
                await sendSubscriptionConfirmation({ id: userId, email: userResult.rows[0].email }, tier);
              }

              server.log.info(`[WEBHOOK] Subscription activated for user ${userId}: ${tier}`);
            }
            break;
          }

          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.user_id;

            if (userId) {
              // Get billing period from items
              const item = subscription.items.data[0];
              const periodStart = item?.billing_thresholds ? Date.now() / 1000 : (subscription as any).current_period_start;
              const periodEnd = (subscription as any).current_period_end;

              await query(
                `UPDATE subscriptions SET
                   status = $1,
                   current_period_start = to_timestamp($2),
                   current_period_end = to_timestamp($3),
                   cancel_at_period_end = $4,
                   updated_at = NOW()
                 WHERE stripe_subscription_id = $5`,
                [
                  subscription.status,
                  periodStart,
                  periodEnd,
                  subscription.cancel_at_period_end,
                  subscription.id,
                ]
              );

              server.log.info(`[WEBHOOK] Subscription updated for user ${userId}: ${subscription.status}`);
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object;

            await query(
              `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE stripe_subscription_id = $1`,
              [subscription.id]
            );

            // Also update user tier back to free/none
            const subResult = await query(
              `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1`,
              [subscription.id]
            );
            if (subResult.rows[0]) {
              const userId = subResult.rows[0].user_id;
              await query(`UPDATE users SET tier = 'free', updated_at = NOW() WHERE id = $1`, [userId]);

              // Send cancellation email
              const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
              if (userResult.rows[0]) {
                await sendCancellationConfirmation(
                  { id: userId, email: userResult.rows[0].email },
                  new Date()
                );
              }
            }

            server.log.info(`[WEBHOOK] Subscription cancelled: ${subscription.id}`);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object;
            server.log.warn(`[WEBHOOK] Payment failed for invoice ${invoice.id}`);
            // TODO: Send payment failed email
            break;
          }

          default:
            server.log.info(`[WEBHOOK] Unhandled event type: ${event.type}`);
        }

        return { received: true };
      } catch (error: any) {
        server.log.error('[WEBHOOK] Error:', error);
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // GET /api/subscription - Get current user's subscription
  server.get(
    '/api/subscription',
    {
      preHandler: authenticate,
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const result = await query(
          `SELECT s.*, u.email, u.tier as user_tier
           FROM subscriptions s
           JOIN users u ON s.user_id = u.id
           WHERE s.user_id = $1`,
          [request.user!.userId]
        );

        if (result.rows.length === 0) {
          return {
            success: true,
            data: {
              status: 'none',
              tier: null,
              message: 'No active subscription',
            },
          };
        }

        const subscription = result.rows[0];

        // Get Stripe subscription details if available
        let stripeDetails = null;
        if (stripe && subscription.stripe_subscription_id) {
          stripeDetails = await getSubscription(subscription.stripe_subscription_id);
        }

        return {
          success: true,
          data: {
            id: subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            features: SUBSCRIPTION_TIERS[subscription.tier as SubscriptionTier]?.features || [],
            limits: SUBSCRIPTION_TIERS[subscription.tier as SubscriptionTier]?.limits || {},
            stripe_details: stripeDetails
              ? {
                  status: stripeDetails.status,
                  current_period_end: new Date(((stripeDetails as any).current_period_end as number) * 1000),
                  cancel_at_period_end: stripeDetails.cancel_at_period_end,
                }
              : null,
          },
        };
      } catch (error: any) {
        server.log.error('[SUBSCRIPTION] Get failed:', error);
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // POST /api/subscription/cancel - Cancel subscription
  server.post(
    '/api/subscription/cancel',
    {
      preHandler: authenticate,
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        if (!stripe) {
          return reply.status(503).send({
            success: false,
            error: 'Payment processing not available',
          });
        }

        const result = await query(
          `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
          [request.user!.userId]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'No active subscription found',
          });
        }

        const subscription = await cancelSubscription(result.rows[0].stripe_subscription_id, false);

        // Update local record
        await query(
          `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE user_id = $1`,
          [request.user!.userId]
        );

        return {
          success: true,
          data: {
            message: 'Subscription will be cancelled at the end of the billing period',
            cancel_at: new Date(((subscription as any).current_period_end as number) * 1000),
          },
        };
      } catch (error: any) {
        server.log.error('[SUBSCRIPTION] Cancel failed:', error);
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // POST /api/subscription/portal - Create customer portal session
  server.post(
    '/api/subscription/portal',
    {
      preHandler: authenticate,
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        if (!stripe) {
          return reply.status(503).send({
            success: false,
            error: 'Payment processing not available',
          });
        }

        const result = await query(
          `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1`,
          [request.user!.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
          return reply.status(404).send({
            success: false,
            error: 'No customer record found',
          });
        }

        const session = await createPortalSession({
          customerId: result.rows[0].stripe_customer_id,
          returnUrl: `${APP_URL}/settings`,
        });

        return {
          success: true,
          data: {
            url: session.url,
          },
        };
      } catch (error: any) {
        server.log.error('[PORTAL] Create failed:', error);
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
