import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const payments = await db.query.payments.findMany({
      where: eq(schema.payments.contractorId, ctx.contractorId),
      with: { job: true, customer: true },
      orderBy: (p, { desc }) => [desc(p.paidAt)],
      limit: 50,
    })

    return NextResponse.json({ payments })
  } catch (err: any) {
    console.error('[payments/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const body = await req.json()

    const amount = parseFloat(String(body.amount))
    if (!body.jobId || typeof body.jobId !== 'string') {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 })
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, body.jobId), eq(schema.jobs.contractorId, ctx.contractorId)),
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const currentBalance = parseFloat(String(job.balanceDue ?? 0))
    if (amount > currentBalance + 0.01) {
      return NextResponse.json({ error: 'Payment exceeds balance due' }, { status: 400 })
    }

    const [payment] = await db.insert(schema.payments).values({
      jobId: body.jobId,
      contractorId: ctx.contractorId,
      customerId: job.customerId ?? undefined,
      amount: String(amount),
      method: body.method ?? 'cash',
      status: 'completed',
      type: body.type ?? 'payment',
      reference: typeof body.reference === 'string' ? body.reference.slice(0, 100) : undefined,
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 1000) : undefined,
      recordedBy: ctx.user.id,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    }).returning()

    // Update job totals
    const newAmountPaid = parseFloat(String(job.amountPaid ?? 0)) + amount
    const newBalanceDue = parseFloat(String(job.total ?? 0)) - newAmountPaid
    const newPaymentStatus = newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'none'
    const newStatus = newBalanceDue <= 0 ? 'paid' : job.status

    await db.update(schema.jobs).set({
      amountPaid: String(newAmountPaid),
      balanceDue: String(Math.max(0, newBalanceDue)),
      paymentStatus: newPaymentStatus as any,
      status: newStatus as any,
      paidAt: newBalanceDue <= 0 ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(schema.jobs.id, body.jobId))

    return NextResponse.json({ payment }, { status: 201 })
  } catch (err: any) {
    console.error('[payments/POST]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to record payment' }, { status: 500 })
  }
}
