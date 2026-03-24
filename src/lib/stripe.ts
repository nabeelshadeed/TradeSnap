import type Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-09-30.acacia',
  })
  return _stripe!
}

export const PLAN_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL!,
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL!,
  },
}

export const PLAN_LIMITS = {
  free: { jobsPerMonth: 3, aiPerMonth: 0, users: 1, openBanking: false },
  starter: { jobsPerMonth: 50, aiPerMonth: 5, users: 1, openBanking: false },
  pro: { jobsPerMonth: Infinity, aiPerMonth: Infinity, users: 5, openBanking: true },
  business: { jobsPerMonth: Infinity, aiPerMonth: Infinity, users: 20, openBanking: true },
}
