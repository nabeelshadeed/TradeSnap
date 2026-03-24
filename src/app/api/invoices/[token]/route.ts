import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params
    const db = getDb()

    const job = await db.query.jobs.findFirst({
      where: eq(schema.jobs.invoiceToken, params.token),
      with: {
        contractor: true,
        customer: true,
        lineItems: { orderBy: (li, { asc }) => [asc(li.sortOrder)] },
        payments: { orderBy: (p, { desc }) => [desc(p.paidAt)] },
      },
    })

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        invoiceNumber: job.invoiceNumber,
        referenceNumber: job.referenceNumber,
        status: job.status,
        total: job.total,
        subtotal: job.subtotal,
        taxAmount: job.taxAmount,
        depositAmount: job.depositAmount,
        depositPaid: job.depositPaid,
        amountPaid: job.amountPaid,
        balanceDue: job.balanceDue,
        dueDate: job.dueDate,
        dueDateAt: job.dueDateAt,
        invoiceSentAt: job.invoiceSentAt,
        lineItems: job.lineItems,
        payments: job.payments,
      },
      contractor: {
        name: job.contractor.name,
        logoUrl: job.contractor.logoUrl,
        primaryColour: job.contractor.primaryColour,
        phone: job.contractor.phone,
        email: job.contractor.email,
        bankName: job.contractor.bankName,
        bankAccountName: job.contractor.bankAccountName,
        bankSortCode: job.contractor.bankSortCode,
        bankAccountNumber: job.contractor.bankAccountNumber,
        taxLabel: job.contractor.taxLabel,
        taxRegistered: job.contractor.taxRegistered,
        currency: job.contractor.currency,
      },
      customer: job.customer,
    })
  } catch (err: any) {
    console.error('[invoice/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
