// Stripe Integration for Cortex Capital
// Handles products, prices, and checkout sessions

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not set - Stripe features disabled');
}

// Initialize Stripe client (will be null if no key)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Tier configurations
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    features: [
      'Portfolio overview',
      'Basic health score',
      'Weekly market summary email',
      '1 portfolio analysis per month',
    ],
    limits: {
      portfolioValue: 10000,
      rebalancingPlans: 0,
    },
  },
  scout: {
    name: 'Scout',
    price: 4900, // $49.00 in cents
    interval: 'month' as const,
    features: [
      'Portfolio analysis',
      'Weekly reports',
      'Email alerts',
      'Basic rebalancing suggestions',
    ],
    limits: {
      portfolioValue: 50000,
      rebalancingPlans: 2,
    },
  },
  operator: {
    name: 'Operator',
    price: 9900, // $99.00 in cents
    interval: 'month' as const,
    features: [
      'Everything in Scout',
      'Auto-rebalancing execution',
      'Options suggestions',
      'Real-time monitoring',
      'Priority support',
    ],
    limits: {
      portfolioValue: 250000,
      rebalancingPlans: 10,
    },
  },
  partner: {
    name: 'Partner',
    price: 24900, // $249.00 in cents
    interval: 'month' as const,
    features: [
      'Everything in Operator',
      'Day trading signals',
      'Momentum rotation',
      'LEAPS strategies',
      'Covered calls automation',
      'Dedicated support',
      'Custom risk profiles',
    ],
    limits: {
      portfolioValue: null, // Unlimited
      rebalancingPlans: null, // Unlimited
    },
  },
  recovery: {
    name: 'Recovery',
    price: 2900, // $29.00 in cents
    interval: 'month' as const,
    features: [
      'Portfolio recovery analysis',
      'Loss mitigation strategies',
      'Monthly check-ins',
      'Basic alerts',
    ],
    limits: {
      portfolioValue: 25000,
      rebalancingPlans: 1,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Cached price IDs (populated on server start)
let priceIds: Record<SubscriptionTier, string | null> = {
  free: null, // No Stripe price needed
  scout: null,
  operator: null,
  partner: null,
  recovery: null,
};

/**
 * Ensure Stripe products and prices exist, return price IDs
 */
export async function ensureStripeProducts(): Promise<Record<SubscriptionTier, string>> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const result: Record<string, string> = {};

  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    // Skip free tier - no Stripe product needed
    if (tier === 'free') {
      result[tier] = 'free';
      continue;
    }

    const productId = `cortex_${tier}`;

    // Check if product exists
    let product: Stripe.Product | null = null;
    try {
      product = await stripe.products.retrieve(productId);
    } catch {
      // Product doesn't exist, create it
      product = await stripe.products.create({
        id: productId,
        name: `Cortex Capital - ${config.name}`,
        description: config.features.join(', '),
        metadata: {
          tier,
        },
      });
      console.log(`[STRIPE] Created product: ${productId}`);
    }

    // Check for existing price
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    const matchingPrice = prices.data.find(
      (p) => p.unit_amount === config.price && p.recurring?.interval === config.interval
    );

    if (matchingPrice) {
      result[tier] = matchingPrice.id;
    } else {
      // Create price
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: config.price,
        currency: 'usd',
        recurring: {
          interval: config.interval,
        },
        metadata: {
          tier,
        },
      });
      result[tier] = newPrice.id;
      console.log(`[STRIPE] Created price for ${tier}: ${newPrice.id}`);
    }
  }

  // Cache the price IDs
  priceIds = result as Record<SubscriptionTier, string>;
  return result as Record<SubscriptionTier, string>;
}

/**
 * Get price ID for a tier
 */
export function getPriceId(tier: SubscriptionTier): string | null {
  return priceIds[tier];
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const priceId = priceIds[params.tier];
  if (!priceId) {
    throw new Error(`Price not found for tier: ${params.tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: params.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId,
      tier: params.tier,
    },
    subscription_data: {
      metadata: {
        user_id: params.userId,
        tier: params.tier,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a customer portal session for subscription management
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session;
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  if (!stripe) {
    return null;
  }

  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] || null;
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
