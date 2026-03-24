import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  const stripe = getStripe()
  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = getDb()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const jobId = pi.metadata?.jobId
    if (jobId) {
      const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) })
      if (job) {
        const amount = pi.amount / 100
        const newAmountPaid = parseFloat(String(job.amountPaid ?? 0)) + amount
        const newBalanceDue = Math.max(0, parseFloat(String(job.total ?? 0)) - newAmountPaid)
        await db.update(schema.jobs).set({
          amountPaid: String(newAmountPaid),
          balanceDue: String(newBalanceDue),
          paymentStatus: newBalanceDue <= 0 ? 'paid' : 'partial',
          status: newBalanceDue <= 0 ? 'paid' : job.status,
          paidAt: newBalanceDue <= 0 ? new Date() : undefined,
          updatedAt: new Date(),
        }).where(eq(schema.jobs.id, jobId))

        await db.insert(schema.payments).values({
          jobId,
          contractorId: job.contractorId,
          customerId: job.customerId ?? undefined,
          amount: String(amount),
          method: 'card',
          status: 'completed',
          type: 'payment',
          stripePiId: pi.id,
          paidAt: new Date(),
        })
      }
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object
    const planMap: Record<string, string> = {
      [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'starter',
      [process.env.STRIPE_PRICE_STARTER_ANNUAL!]: 'starter',
      [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
      [process.env.STRIPE_PRICE_PRO_ANNUAL!]: 'pro',
      [process.env.STRIPE_PRICE_BUSINESS_MONTHLY!]: 'business',
      [process.env.STRIPE_PRICE_BUSINESS_ANNUAL!]: 'business',
    }
    const priceId = sub.items.data[0]?.price?.id
    const plan = planMap[priceId] ?? 'free'
    await db.update(schema.contractors).set({
      stripeSubId: sub.id,
      plan: plan as any,
      planExpiresAt: new Date(sub.current_period_end * 1000),
      updatedAt: new Date(),
    }).where(eq(schema.contractors.stripeCustomerId, sub.customer))
  }

  return NextResponse.json({ received: true })
}
