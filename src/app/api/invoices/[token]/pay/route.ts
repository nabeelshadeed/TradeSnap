import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params
    const db = getDb()
    const { amount } = await req.json()

    const job = await db.query.jobs.findFirst({
      where: eq(schema.jobs.invoiceToken, params.token),
      with: { contractor: true },
    })

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((amount ?? parseFloat(String(job.balanceDue))) * 100),
      currency: (job.contractor.currency ?? 'gbp').toLowerCase(),
      metadata: {
        jobId: job.id,
        invoiceToken: params.token,
        invoiceNumber: job.invoiceNumber ?? '',
      },
      description: `Invoice ${job.invoiceNumber ?? job.referenceNumber} — ${job.title}`,
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('[invoices/pay]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create payment intent' }, { status: 500 })
  }
}
