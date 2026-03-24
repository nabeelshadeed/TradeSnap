import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const VALID_PLANS = ['starter', 'pro', 'business'] as const
type ValidPlan = typeof VALID_PLANS[number]

const VALID_INTERVALS = ['monthly', 'annual'] as const
type ValidInterval = typeof VALID_INTERVALS[number]

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan: ValidPlan = body.plan ?? 'starter'
  const interval: ValidInterval = body.interval ?? 'monthly'

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json(
      { error: `Invalid interval. Must be one of: ${VALID_INTERVALS.join(', ')}` },
      { status: 400 }
    )
  }

  const { getStripe, PLAN_PRICES } = require('@/lib/stripe')
  const stripe = getStripe()

  const priceId = PLAN_PRICES[plan]?.[interval]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })

  const db = getDb()
  let customerId = ctx.contractor.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.contractor.email ?? ctx.user.email,
      name: ctx.contractor.name,
      metadata: { contractorId: ctx.contractorId },
    })
    customerId = customer.id
    await db
      .update(schema.contractors)
      .set({ stripeCustomerId: customerId })
      .where(eq(schema.contractors.id, ctx.contractorId))
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    allow_promotion_codes: true,
    subscription_data: { trial_from_plan: false },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
