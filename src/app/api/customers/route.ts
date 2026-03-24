import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and, or, ilike } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const url = new URL(req.url)
  const q = url.searchParams.get('q')

  const customers = await db.query.customers.findMany({
    where: and(
      eq(schema.customers.contractorId, ctx.contractorId),
      q ? or(
        ilike(schema.customers.firstName, `%${q}%`),
        ilike(schema.customers.lastName, `%${q}%`),
        ilike(schema.customers.companyName, `%${q}%`),
        ilike(schema.customers.email, `%${q}%`),
        ilike(schema.customers.phone, `%${q}%`),
      ) : undefined,
    ),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    limit: 20,
  })

  return NextResponse.json({ customers })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const body = await req.json()

  const [customer] = await db.insert(schema.customers).values({
    contractorId: ctx.contractorId,
    firstName: body.firstName,
    lastName: body.lastName,
    companyName: body.companyName,
    email: body.email,
    phone: body.phone,
    addressLine1: body.addressLine1,
    addressCity: body.addressCity,
    addressPostcode: body.addressPostcode,
    notes: body.notes,
    source: body.source,
  }).returning()

  return NextResponse.json({ customer }, { status: 201 })
}
