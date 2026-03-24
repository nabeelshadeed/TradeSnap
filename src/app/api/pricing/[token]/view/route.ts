import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const db = getDb()

  await db.update(schema.jobs)
    .set({
      quoteViewedAt: new Date(),
      quoteViewedCount: sql`${schema.jobs.quoteViewedCount} + 1`,
      status: 'viewed',
      updatedAt: new Date(),
    })
    .where(eq(schema.jobs.quoteToken, params.token))

  return NextResponse.json({ ok: true })
}
