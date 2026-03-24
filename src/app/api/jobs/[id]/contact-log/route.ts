import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()

    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const logs = await db.query.contactLogs.findMany({
      where: eq(schema.contactLogs.jobId, params.id),
      orderBy: [desc(schema.contactLogs.createdAt)],
    })

    return NextResponse.json({ logs })
  } catch (err: any) {
    console.error('[contact-log/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch contact logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()

    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()

    const VALID_TYPES = ['call', 'email', 'message', 'visit', 'note'] as const
    const VALID_OUTCOMES = ['promised_payment', 'no_answer', 'dispute_raised', 'paid', 'referred_to_manager', 'other'] as const

    if (!body.type || !(VALID_TYPES as readonly string[]).includes(body.type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    const nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : undefined

    const [log] = await db.insert(schema.contactLogs).values({
      jobId: params.id,
      contractorId: ctx.contractorId,
      loggedBy: ctx.user.id,
      type: body.type,
      note: body.note ? String(body.note).slice(0, 2000) : undefined,
      response: body.response ? String(body.response).slice(0, 2000) : undefined,
      outcome: body.outcome && (VALID_OUTCOMES as readonly string[]).includes(body.outcome)
        ? (body.outcome as typeof VALID_OUTCOMES[number])
        : undefined,
      nextFollowUpAt: nextFollowUpAt,
    }).returning()

    // If customer promised payment, flip job into soft chasing mode
    if (body.outcome === 'promised_payment') {
      await db.update(schema.jobs)
        .set({ softChasingMode: true, updatedAt: new Date() })
        .where(eq(schema.jobs.id, params.id))
    }

    return NextResponse.json({ log }, { status: 201 })
  } catch (err: any) {
    console.error('[contact-log/POST]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create contact log' }, { status: 500 })
  }
}
