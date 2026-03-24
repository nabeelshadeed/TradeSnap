import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const allowed = ['name', 'phone', 'email', 'logoUrl', 'invoicePrefix', 'invoiceFooter', 'primaryColour'] as const
  type Field = typeof allowed[number]

  const updates: Partial<Record<Field, string>> = {}
  for (const field of allowed) {
    if (field in body && body[field] !== undefined) {
      const val = String(body[field]).trim()
      if (val.length > 0) updates[field] = val.slice(0, 500)
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const db = getDb()
  await db.update(schema.contractors)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.contractors.id, ctx.contractorId))

  return NextResponse.json({ ok: true })
}
