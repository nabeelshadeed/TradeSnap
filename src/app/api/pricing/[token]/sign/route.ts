import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { generateToken } from '@/lib/utils'
import { rateLimitByIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const rl = await rateLimitByIp(req, 'quote-sign', 10, 60)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = getDb()
  const body = await req.json()

  const signerName = typeof body.signerName === 'string' ? body.signerName.trim().slice(0, 100) : ''
  const signerEmail = typeof body.signerEmail === 'string' ? body.signerEmail.trim().toLowerCase().slice(0, 255) : ''
  if (!signerName || !signerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
    return NextResponse.json({ error: 'signerName and a valid signerEmail are required' }, { status: 400 })
  }
  const customerSignatureDataUrl = typeof body.customerSignatureDataUrl === 'string' && body.customerSignatureDataUrl.length < 200_000
    ? body.customerSignatureDataUrl
    : null

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const ua = req.headers.get('user-agent') ?? ''

  const job = await db.query.jobs.findFirst({
    where: eq(schema.jobs.quoteToken, params.token),
    with: { contractor: true },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.status === 'accepted' || job.quoteSignedAt) {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 })
  }

  const invoiceToken = generateToken(32)

  await db.update(schema.jobs).set({
    status: 'accepted',
    quoteSignedAt: new Date(),
    signerName,
    signerEmail,
    signerIp: ip,
    signerUa: ua,
    customerSignatureDataUrl,
    invoiceToken,
    updatedAt: new Date(),
  }).where(eq(schema.jobs.id, job.id))

  // Log audit entry
  await db.insert(schema.auditLogs).values({
    contractorId: job.contractorId,
    actorEmail: signerEmail,
    actorIp: ip,
    actorUa: ua,
    action: 'quote_signed',
    resourceType: 'job',
    resourceId: job.id,
    payload: {
      signerName,
      signerEmail,
      total: job.total,
      referenceNumber: job.referenceNumber,
    },
  })

  // Send notification to contractor (fire and forget)
  try {
    const { getResend, EMAIL_FROM } = require('@/lib/resend')
    const resend = getResend()
    if (job.contractor.email) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: job.contractor.email,
        subject: `Quote accepted by ${signerName} — £${job.total}`,
        html: `<p>${signerName} (${signerEmail}) just accepted your price for <strong>${job.title}</strong>.</p><p>Total: £${job.total}</p>`,
      })
    }
  } catch {}

  return NextResponse.json({ success: true, invoiceToken })
}
