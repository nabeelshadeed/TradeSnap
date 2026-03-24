import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Fields a user is allowed to update via PATCH (allowlist prevents mass-assignment)
const PATCHABLE_FIELDS = [
  'title', 'customerId', 'siteAddress', 'siteCity', 'sitePostcode',
  'visitDate', 'startDate', 'endDate', 'estimatedDays',
  'internalNotes', 'customerNotes', 'notIncluded',
  'depositPct', 'paymentTermsType', 'paymentTermsDays',
  'lateFeeType', 'lateFeeAmount', 'status',
  'tradeCategory',
] as const

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
      with: { customer: true, lineItems: true, photos: true, payments: true },
    })

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ job })
  } catch (err: any) {
    console.error('[job/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const rawBody = await req.json()

    // Allowlist — prevent mass-assignment of protected fields (contractorId, tokens, etc.)
    const updates: Record<string, unknown> = {}
    for (const field of PATCHABLE_FIELDS) {
      if (field in rawBody) updates[field] = rawBody[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 })
    }

    const [job] = await db.update(schema.jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)))
      .returning()

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ job })
  } catch (err: any) {
    console.error('[job/PATCH]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update job' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['owner', 'admin'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getDb()
    await db.delete(schema.jobs)
      .where(and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[job/DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}
