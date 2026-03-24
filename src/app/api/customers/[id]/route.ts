import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const customer = await db.query.customers.findFirst({
    where: and(eq(schema.customers.id, params.id), eq(schema.customers.contractorId, ctx.contractorId)),
    with: { jobs: { orderBy: (j, { desc }) => [desc(j.updatedAt)], limit: 20 } },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const body = await req.json()

  const [customer] = await db.update(schema.customers)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(schema.customers.id, params.id), eq(schema.customers.contractorId, ctx.contractorId)))
    .returning()

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}
