import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect, notFound } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { JobDetailClient } from './JobDetailClient'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    with: {
      customer: true,
      lineItems: { orderBy: (li, { asc }) => [asc(li.sortOrder)] },
      payments: { orderBy: (p, { desc }) => [desc(p.paidAt)] },
    },
  })

  if (!job) notFound()

  const currency = ctx.contractor.currency ?? 'GBP'
  const country = (ctx.contractor.operatingCountry ?? 'UK') as 'UK' | 'US'

  return (
    <JobDetailClient
      job={{
        id: job.id,
        title: job.title,
        status: job.status ?? 'draft',
        total: String(job.total),
        subtotal: String(job.subtotal),
        taxAmount: String(job.taxAmount),
        balanceDue: String(job.balanceDue ?? 0),
        amountPaid: String(job.amountPaid ?? 0),
        referenceNumber: job.referenceNumber,
        invoiceNumber: job.invoiceNumber,
        quoteToken: job.quoteToken,
        invoiceToken: job.invoiceToken,
        quoteSentAt: job.quoteSentAt ? String(job.quoteSentAt) : null,
        quoteViewedAt: job.quoteViewedAt ? String(job.quoteViewedAt) : null,
        quoteViewedCount: job.quoteViewedCount ?? 0,
        quoteSignedAt: job.quoteSignedAt ? String(job.quoteSignedAt) : null,
        signerName: job.signerName,
        invoiceSentAt: job.invoiceSentAt ? String(job.invoiceSentAt) : null,
        invoiceViewedAt: job.invoiceViewedAt ? String(job.invoiceViewedAt) : null,
        dueDateAt: job.dueDateAt ? String(job.dueDateAt) : null,
        paidAt: job.paidAt ? String(job.paidAt) : null,
        customerSignatureDataUrl: job.customerSignatureDataUrl ?? null,
        notIncluded: job.notIncluded,
        lineItems: job.lineItems.map(i => ({
          id: i.id,
          description: i.description,
          quantity: String(i.quantity),
          unit: i.unit ?? 'item',
          unitPrice: String(i.unitPrice),
          total: String(i.total),
          category: i.category ?? 'labour',
        })),
        payments: job.payments.map(p => ({
          id: p.id,
          amount: String(p.amount),
          type: p.type ?? 'payment',
          method: p.method ?? 'unknown',
          paidAt: String(p.paidAt),
        })),
        customer: job.customer ? {
          id: job.customer.id,
          firstName: job.customer.firstName,
          lastName: job.customer.lastName,
          email: job.customer.email,
          phone: job.customer.phone,
        } : null,
      }}
      currency={currency}
      country={country}
      taxLabel={ctx.contractor.taxLabel ?? 'VAT'}
      taxRate={parseFloat(String(ctx.contractor.taxRate ?? 20))}
    />
  )
}
