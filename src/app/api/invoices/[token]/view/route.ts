import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params
    const db = getDb()
    await db.update(schema.jobs).set({
      invoiceViewedAt: sql`COALESCE(invoice_viewed_at, now())`,
      invoiceViewedCount: sql`COALESCE(invoice_viewed_count, 0) + 1`,
      updatedAt: new Date(),
    }).where(eq(schema.jobs.invoiceToken, params.token))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[invoice/view]', err)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}
