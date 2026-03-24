import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const PATCHABLE_FIELDS = [
  'firstName', 'lastName', 'companyName', 'email', 'phone',
  'addressLine1', 'addressCity', 'addressPostcode', 'notes', 'source',
] as const

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const customer = await db.query.customers.findFirst({
      where: and(eq(schema.customers.id, params.id), eq(schema.customers.contractorId, ctx.contractorId)),
      with: { jobs: { orderBy: (j, { desc }) => [desc(j.updatedAt)], limit: 20 } },
    })

    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ customer })
  } catch (err: any) {
    console.error('[customer/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const rawBody = await req.json()

    const updates: Record<string, unknown> = {}
    for (const field of PATCHABLE_FIELDS) {
      if (field in rawBody) updates[field] = rawBody[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 })
    }

    const [customer] = await db.update(schema.customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.customers.id, params.id), eq(schema.customers.contractorId, ctx.contractorId)))
      .returning()

    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ customer })
  } catch (err: any) {
    console.error('[customer/PATCH]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update customer' }, { status: 500 })
  }
}
