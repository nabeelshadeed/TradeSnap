import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    with: { customer: true, contractor: true },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  await db.update(schema.jobs).set({
    status: 'sent',
    quoteSentAt: now,
    updatedAt: now,
  }).where(eq(schema.jobs.id, params.id))

  // Send email if customer has email
  if (job.customer?.email) {
    try {
      const { getResend, EMAIL_FROM } = require('@/lib/resend')
      const resend = getResend()
      const priceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/q/${job.quoteToken}`
      await resend.emails.send({
        from: `${job.contractor.name} <${EMAIL_FROM}>`,
        replyTo: job.contractor.email ?? undefined,
        to: job.customer.email,
        subject: `Your price from ${job.contractor.name} — ${job.title}`,
        html: `<p>Hi ${job.customer.firstName},</p>
               <p>Here's your price for <strong>${job.title}</strong>.</p>
               <p><a href="${priceUrl}" style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View and Accept Price →</a></p>
               <p>Total: £${job.total} | Valid for 30 days</p>
               <p>Questions? Call ${job.contractor.phone ?? 'us'}</p>
               <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
               <p style="color:#999;font-size:12px">Sent via TradeSnap</p>`,
      })
    } catch {}
  }

  return NextResponse.json({ success: true })
}
