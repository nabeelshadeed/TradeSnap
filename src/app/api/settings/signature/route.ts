import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Accept null to clear, or a data: URL string
    if (body.signatureDataUrl !== null && body.signatureDataUrl !== undefined) {
      if (typeof body.signatureDataUrl !== 'string') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
      if (body.signatureDataUrl.length > 200_000) {
        return NextResponse.json({ error: 'Signature too large' }, { status: 400 })
      }
    }

    const db = getDb()
    await db.update(schema.contractors)
      .set({ signatureDataUrl: body.signatureDataUrl ?? null, updatedAt: new Date() })
      .where(eq(schema.contractors.id, ctx.contractorId))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[settings/signature/PATCH]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update signature' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    await db.update(schema.contractors)
      .set({ signatureDataUrl: null, updatedAt: new Date() })
      .where(eq(schema.contractors.id, ctx.contractorId))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[settings/signature/DELETE]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to delete signature' }, { status: 500 })
  }
}
