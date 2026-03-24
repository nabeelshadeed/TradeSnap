import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq, and, sum, count } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const contractors = await db.query.contractors.findMany({ columns: { id: true } })

  for (const contractor of contractors) {
    try {
      // Reset monthly counters on 1st of month
      const now = new Date()
      if (now.getDate() === 1) {
        await db.update(schema.contractors).set({
          jobsThisMonth: 0,
          aiUsesThisMonth: 0,
          updatedAt: now,
        }).where(eq(schema.contractors.id, contractor.id))
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, processed: contractors.length })
}
