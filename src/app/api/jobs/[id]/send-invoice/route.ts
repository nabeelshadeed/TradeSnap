import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, trialGuard } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { getResend, EMAIL_FROM } from '@/lib/resend'
import { eq, and } from 'drizzle-orm'
import { generateToken } from '@/lib/utils'
import { buildInvoiceEmail } from '@/lib/email/invoice'
import type { UkEmailContext, UsEmailContext } from '@/lib/email/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const block = trialGuard(ctx)
    if (block) return block

    const db = getDb()
    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
      with: { customer: true, contractor: true },
    })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const contractor = ctx.contractor
    const country = (contractor.operatingCountry ?? 'UK') as 'UK' | 'US'
    const seq = contractor.invoiceSequence ?? 1000
    const invoiceNumber = `${contractor.invoicePrefix ?? 'INV'}-${seq}`
    const invoiceToken = job.invoiceToken ?? generateToken(32)
    const receiptToken = generateToken(32)

    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + (job.paymentTermsDays ?? 30))

    await db.update(schema.jobs).set({
      invoiceNumber,
      invoiceToken,
      receiptToken,
      status: 'invoiced',
      invoiceSentAt: now,
      dueDateAt: dueDate,
      updatedAt: now,
    }).where(eq(schema.jobs.id, params.id))

    // Increment invoice sequence
    await db.update(schema.contractors).set({
      invoiceSequence: seq + 1,
      updatedAt: now,
    }).where(eq(schema.contractors.id, ctx.contractorId))

    // Send email
    if (job.customer?.email) {
      try {
        const resend = getResend()
        const payUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceToken}`
        const currencySymbol = country === 'UK' ? '£' : '$'
        const amount = `${currencySymbol}${parseFloat(String(job.balanceDue ?? 0)).toFixed(2)}`
        const paymentTermsDays = job.paymentTermsDays ?? 30
        const paymentTerms = `Net ${paymentTermsDays}`
        const dueDateFormatted = country === 'UK'
          ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

        const baseCtx = {
          customerFirstName: job.customer.firstName,
          contractorName: job.contractor.name,
          contractorEmail: job.contractor.email ?? '',
          invoiceNumber,
          amount,
          dueDate: dueDateFormatted,
          daysLate: 0,
          payUrl,
          paymentTerms,
          currency: country === 'UK' ? 'GBP' as const : 'USD' as const,
        }

        let emailCtx: UkEmailContext | UsEmailContext
        if (country === 'UK') {
          emailCtx = {
            ...baseCtx,
            currency: 'GBP' as const,
            bankSortCode: job.contractor.bankSortCode ?? undefined,
            bankAccountNumber: job.contractor.bankAccountNumber ?? undefined,
            bankAccountName: job.contractor.bankAccountName ?? undefined,
            invoiceRef: invoiceNumber,
          } satisfies UkEmailContext
        } else {
          let lateFeeClause: string | undefined
          if (job.lateFeeType && job.lateFeeType !== 'none' && job.quoteSignedAt) {
            if (job.lateFeeType === 'percent' && job.lateFeeAmount) {
              lateFeeClause = `A late fee of ${job.lateFeeAmount}% per month will apply to overdue balances per the signed agreement.`
            } else if (job.lateFeeType === 'fixed' && job.lateFeeAmount) {
              lateFeeClause = `A late fee of $${parseFloat(String(job.lateFeeAmount)).toFixed(2)} applies to overdue balances per the signed agreement.`
            }
          }
          emailCtx = {
            ...baseCtx,
            currency: 'USD' as const,
            lateFeeClause,
            stateCode: job.contractor.operatingState ?? undefined,
          } satisfies UsEmailContext
        }

        const emailResult = buildInvoiceEmail(country, emailCtx)

        await resend.emails.send({
          from: `${job.contractor.name} <${EMAIL_FROM}>`,
          replyTo: job.contractor.email ?? undefined,
          to: job.customer.email,
          subject: emailResult.subject,
          html: emailResult.html,
        })
      } catch {}
    }

    return NextResponse.json({ success: true, invoiceNumber, invoiceToken })
  } catch (err: any) {
    console.error('[send-invoice]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send invoice' }, { status: 500 })
  }
}
