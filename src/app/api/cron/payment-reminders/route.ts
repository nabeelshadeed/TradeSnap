import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { and, eq, isNotNull } from 'drizzle-orm'
import { getResend, EMAIL_FROM } from '@/lib/resend'
import { buildUkReminderEmail } from '@/lib/email/uk-reminders'
import { buildUsReminderEmail } from '@/lib/email/us-reminders'
import { calculateStatutoryInterest } from '@/lib/legal/uk'
import { calculateContractualLateFee, isLateFeeEnforceable } from '@/lib/legal/us'
import type { ReminderStage } from '@/lib/email/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const now = new Date()

    // Fetch all active invoiced jobs with reminders not paused and not yet paid
    const jobs = await db.query.jobs.findMany({
      where: and(
        eq(schema.jobs.status, 'invoiced'),
        isNotNull(schema.jobs.invoiceSentAt),
        isNotNull(schema.jobs.dueDateAt),
        eq(schema.jobs.remindersPaused, false),
      ),
      with: { contractor: true, customer: true },
    })

    let sent = 0
    let skipped = 0
    let errors = 0

    for (const job of jobs) {
      if (!job.customer?.email || !job.contractor?.email) { skipped++; continue }
      if (!job.dueDateAt) { skipped++; continue }

      const country = (job.contractor.operatingCountry ?? 'UK') as 'UK' | 'US'
      const dueDate = new Date(job.dueDateAt)
      const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000)
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / 86_400_000)

      // Determine which stage to send — evaluate in priority order
      let stage: ReminderStage | null = null

      if (daysLate >= 14 && !job.reminder14At) {
        stage = '14_days'
      } else if (daysLate >= 7 && !job.reminder7At) {
        stage = '7_days'
      } else if (daysLate >= 3 && !job.reminder3At) {
        stage = '3_days'
      } else if (daysLate >= 1 && !job.reminderDayAfterAt) {
        stage = 'day_after'
      } else if (daysUntilDue <= 2 && daysUntilDue >= 0 && !job.reminderPreDueAt) {
        stage = 'pre_due'
      }

      if (!stage) { skipped++; continue }

      try {
        const resend = getResend()
        const payUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${job.invoiceToken}`
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
          contractorEmail: job.contractor.email,
          invoiceNumber: job.invoiceNumber ?? '',
          amount,
          dueDate: dueDateFormatted,
          daysLate: Math.max(0, daysLate),
          payUrl,
          paymentTerms,
          currency: country === 'UK' ? 'GBP' as const : 'USD' as const,
        }

        let emailResult: { subject: string; html: string } | null = null

        if (country === 'UK') {
          let ukCtx: typeof baseCtx & {
            currency: 'GBP'
            bankSortCode?: string
            bankAccountNumber?: string
            bankAccountName?: string
            statutoryInterest?: string
            fixedCompensation?: string
          } = {
            ...baseCtx,
            currency: 'GBP' as const,
            bankSortCode: job.contractor.bankSortCode ?? undefined,
            bankAccountNumber: job.contractor.bankAccountNumber ?? undefined,
            bankAccountName: job.contractor.bankAccountName ?? undefined,
          }

          // For 7-day and 14-day reminders, calculate and attach statutory interest
          if (stage === '7_days' || stage === '14_days') {
            const invoiceAmount = parseFloat(String(job.total ?? 0))
            if (invoiceAmount > 0 && job.dueDateAt) {
              const result = calculateStatutoryInterest(invoiceAmount, job.dueDateAt.toISOString())
              ukCtx = {
                ...ukCtx,
                statutoryInterest: `£${result.interest.toFixed(2)}`,
                fixedCompensation: `£${result.fixedCompensation}`,
              }
            }
          }

          emailResult = buildUkReminderEmail(stage, ukCtx)
        } else {
          // US path — no statutory logic, no legal references
          let lateFeeAmount: string | undefined
          if (job.lateFeeType && job.lateFeeType !== 'none' && job.quoteSignedAt) {
            const enforceability = isLateFeeEnforceable(job)
            if (enforceability.enforceable && daysLate > 0) {
              const invoiceAmount = parseFloat(String(job.total ?? 0))
              const feeResult = calculateContractualLateFee(
                invoiceAmount,
                job.lateFeeType,
                parseFloat(String(job.lateFeeAmount ?? 0)),
                daysLate,
              )
              if (feeResult && feeResult.feeAmount > 0) {
                lateFeeAmount = `$${feeResult.feeAmount.toFixed(2)}`
              }
            }
          }

          emailResult = buildUsReminderEmail(stage, {
            ...baseCtx,
            currency: 'USD' as const,
            lateFeeAmount,
          })
        }

        if (!emailResult) { skipped++; continue }

        await resend.emails.send({
          from: `${job.contractor.name} <${EMAIL_FROM}>`,
          replyTo: job.contractor.email,
          to: job.customer.email,
          subject: emailResult.subject,
          html: emailResult.html,
        })

        // Mark reminder stage as sent
        const update: Record<string, Date | null> = { updatedAt: now }
        if (stage === 'pre_due') update.reminderPreDueAt = now
        else if (stage === 'day_after') update.reminderDayAfterAt = now
        else if (stage === '3_days') update.reminder3At = now
        else if (stage === '7_days') update.reminder7At = now
        else if (stage === '14_days') update.reminder14At = now

        await db.update(schema.jobs).set(update).where(eq(schema.jobs.id, job.id))
        sent++
      } catch (err) {
        console.error(`[cron/payment-reminders] Failed for job ${job.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, errors })
  } catch (err: any) {
    console.error('[cron/payment-reminders]', err)
    return NextResponse.json({ error: err.message ?? 'Cron failed' }, { status: 500 })
  }
}
