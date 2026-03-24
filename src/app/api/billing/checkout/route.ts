import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { getStripe, PLAN_PRICES } from '@/lib/stripe'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const VALID_PLANS = ['starter', 'pro', 'business'] as const
const VALID_INTERVALS = ['monthly', 'annual'] as const
type ValidPlan = typeof VALID_PLANS[number]
type ValidInterval = typeof VALID_INTERVALS[number]

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Accept both JSON (API clients) and form data (HTML form submissions)
    let plan: ValidPlan = 'starter'
    let interval: ValidInterval = 'monthly'
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      plan = (body.plan ?? 'starter') as ValidPlan
      interval = (body.interval ?? 'monthly') as ValidInterval
    } else {
      const form = await req.formData().catch(() => new FormData())
      plan = ((form.get('plan') as string) ?? 'starter') as ValidPlan
      interval = ((form.get('interval') as string) ?? 'monthly') as ValidInterval
    }

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` }, { status: 400 })
    }
    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json({ error: `Invalid interval. Must be one of: ${VALID_INTERVALS.join(', ')}` }, { status: 400 })
    }

    const priceId = PLAN_PRICES[plan]?.[interval]
    if (!priceId) return NextResponse.json({ error: 'Price not configured for this plan/interval' }, { status: 400 })

    const stripe = getStripe()
    const db = getDb()

    let customerId = ctx.contractor.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.contractor.email ?? ctx.user.email ?? undefined,
        name: ctx.contractor.name,
        metadata: { contractorId: ctx.contractorId },
      })
      customerId = customer.id
      await db.update(schema.contractors)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(schema.contractors.id, ctx.contractorId))
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    // Redirect for browser form submissions; return JSON for API clients
    const acceptsHtml = req.headers.get('accept')?.includes('text/html')
    if (acceptsHtml && session.url) {
      return NextResponse.redirect(session.url, 303)
    }
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing/checkout]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create checkout session' }, { status: 500 })
  }
}
