import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const ESCALATION_ORDER = ['none', 'reminder_1', 'reminder_2', 'firm_notice', 'final_notice', 'legal'] as const

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    with: { customer: true, contractor: true },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentStage = job.escalationStage ?? 'none'
  const currentIdx = ESCALATION_ORDER.indexOf(currentStage as any)
  const nextStage = currentIdx < ESCALATION_ORDER.length - 1
    ? ESCALATION_ORDER[currentIdx + 1]
    : currentStage

  await db.update(schema.jobs).set({
    escalationStage: nextStage,
    updatedAt: new Date(),
  }).where(eq(schema.jobs.id, params.id))

  // Send escalation email
  if (job.customer?.email) {
    try {
      const { getResend, EMAIL_FROM } = require('@/lib/resend')
      const resend = getResend()
      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${job.invoiceToken}`

      const stageSubjects: Record<string, string> = {
        reminder_1: `Friendly reminder — Invoice ${job.invoiceNumber}`,
        reminder_2: `Invoice ${job.invoiceNumber} — payment overdue`,
        firm_notice: `Firm notice — Invoice ${job.invoiceNumber}`,
        final_notice: `Final notice before further action — Invoice ${job.invoiceNumber}`,
        legal: `Notice of intention to claim — Invoice ${job.invoiceNumber}`,
      }

      await resend.emails.send({
        from: `${job.contractor.name} <${EMAIL_FROM}>`,
        replyTo: job.contractor.email ?? undefined,
        to: job.customer.email,
        subject: stageSubjects[nextStage] ?? `Reminder — Invoice ${job.invoiceNumber}`,
        html: `<p>Hi ${job.customer.firstName},</p>
               <p>This is a reminder about Invoice ${job.invoiceNumber} for £${job.balanceDue} which remains unpaid.</p>
               ${job.invoiceToken ? `<p><a href="${paymentUrl}" style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Pay Now →</a></p>` : ''}
               <p>Thank you,<br/>${job.contractor.name}</p>`,
      })
    } catch {}
  }

  // Log in audit trail
  await db.insert(schema.auditLogs).values({
    contractorId: ctx.contractorId,
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: 'escalation_sent',
    resourceType: 'job',
    resourceId: job.id,
    payload: { stage: nextStage, previousStage: currentStage },
  })

  return NextResponse.json({ success: true, stage: nextStage })
}
