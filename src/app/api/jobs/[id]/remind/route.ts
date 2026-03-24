import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

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
  if (!job.invoiceToken) return NextResponse.json({ error: 'No invoice to remind about' }, { status: 400 })
  if (!job.customer?.email) return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 })

  const country = (job.contractor.operatingCountry ?? 'UK') as 'UK' | 'US'
  const sym = country === 'UK' ? '£' : '$'
  const balance = parseFloat(String(job.balanceDue ?? 0))
  const payUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${job.invoiceToken}`
  const dueDate = job.dueDateAt
    ? new Date(job.dueDateAt).toLocaleDateString(country === 'UK' ? 'en-GB' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'as agreed'

  const isOverdue = job.dueDateAt && new Date(job.dueDateAt) < new Date()

  const subject = isOverdue
    ? `Friendly reminder — ${job.invoiceNumber ?? job.referenceNumber} overdue`
    : `Payment reminder — ${job.invoiceNumber ?? job.referenceNumber}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:32px auto;padding:0 16px">
    <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">

      <!-- Header -->
      <div style="padding:24px 24px 20px;border-bottom:1px solid #f3f4f6">
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827">${job.contractor.name}</p>
        ${job.contractor.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280">${job.contractor.phone}</p>` : ''}
      </div>

      <!-- Body -->
      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:15px;color:#374151">
          Hi ${job.customer.firstName},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151">
          ${isOverdue
            ? `This is a friendly reminder that invoice <strong>${job.invoiceNumber ?? job.referenceNumber}</strong> for <strong>${sym}${balance.toFixed(2)}</strong> was due on ${dueDate} and is now overdue.`
            : `Just a quick reminder that invoice <strong>${job.invoiceNumber ?? job.referenceNumber}</strong> for <strong>${sym}${balance.toFixed(2)}</strong> is due on ${dueDate}.`
          }
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151">
          You can pay securely online using the button below.
        </p>

        <!-- Pay button -->
        <a href="${payUrl}"
           style="display:block;background:#f97316;color:#fff;text-decoration:none;text-align:center;padding:16px 24px;border-radius:12px;font-size:16px;font-weight:700;margin-bottom:16px">
          Pay ${sym}${balance.toFixed(2)} now →
        </a>

        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
          Or copy this link: ${payUrl}
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6">
        <p style="margin:0;font-size:12px;color:#9ca3af">
          Sent by ${job.contractor.name}
          ${job.contractor.email ? ` · <a href="mailto:${job.contractor.email}" style="color:#9ca3af">${job.contractor.email}</a>` : ''}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim()

  try {
    const { getResend, EMAIL_FROM } = require('@/lib/resend')
    const resend = getResend()
    await resend.emails.send({
      from: `${job.contractor.name} <${EMAIL_FROM}>`,
      replyTo: job.contractor.email ?? undefined,
      to: job.customer.email,
      subject,
      html,
    })
  } catch (err) {
    console.error('[remind] email send failed:', err)
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }

  // Track that a reminder was sent
  await db.update(schema.jobs)
    .set({ updatedAt: new Date() })
    .where(eq(schema.jobs.id, params.id))

  return NextResponse.json({ ok: true })
}
