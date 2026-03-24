import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { rateLimitByIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const rl = await rateLimitByIp(req, 'quote-view', 30, 60)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = getDb()

  const job = await db.query.jobs.findFirst({
    where: eq(schema.jobs.quoteToken, params.token),
    with: {
      customer: true,
      lineItems: { orderBy: (li, { asc }) => [asc(li.sortOrder)] },
      contractor: true,
    },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if expired
  if (job.quoteSentAt) {
    const validDays = 30
    const expiresAt = new Date(job.quoteSentAt)
    expiresAt.setDate(expiresAt.getDate() + validDays)
    if (expiresAt < new Date() && (job.status === 'sent' || job.status === 'viewed')) {
      return NextResponse.json({ expired: true, expiresAt: expiresAt.toISOString() })
    }
  }

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      referenceNumber: job.referenceNumber,
      status: job.status,
      quoteSentAt: job.quoteSentAt,
      subtotal: job.subtotal,
      taxAmount: job.taxAmount,
      total: job.total,
      depositPct: job.depositPct,
      depositAmount: job.depositAmount,
      paymentTermsDays: job.paymentTermsDays,
      earlyPayDiscountPct: job.earlyPayDiscountPct,
      earlyPayDays: job.earlyPayDays,
      customerNotes: job.customerNotes,
      notIncluded: job.notIncluded,
      lineItems: job.lineItems,
    },
    contractor: {
      name: job.contractor.name,
      logoUrl: job.contractor.logoUrl,
      primaryColour: job.contractor.primaryColour,
      phone: job.contractor.phone,
      email: job.contractor.email,
      taxLabel: job.contractor.taxLabel,
      taxRate: job.contractor.taxRate,
      taxRegistered: job.contractor.taxRegistered,
      currency: job.contractor.currency,
    },
    customer: job.customer ? {
      firstName: job.customer.firstName,
      lastName: job.customer.lastName,
      email: job.customer.email,
      addressLine1: job.customer.addressLine1,
      addressCity: job.customer.addressCity,
      addressPostcode: job.customer.addressPostcode,
    } : null,
  })
}
