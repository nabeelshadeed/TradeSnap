import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const db = getDb()
  const { amount } = await req.json()

  const job = await db.query.jobs.findFirst({
    where: eq(schema.jobs.invoiceToken, params.token),
    with: { contractor: true },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stripe = require('@/lib/stripe').getStripe()
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
}
