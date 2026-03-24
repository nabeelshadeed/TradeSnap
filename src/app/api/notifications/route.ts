import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const notifications = await db.query.notifications.findMany({
      where: eq(schema.notifications.contractorId, ctx.contractorId),
      orderBy: [desc(schema.notifications.createdAt)],
      limit: 20,
    })

    return NextResponse.json({ notifications })
  } catch (err: any) {
    console.error('[notifications/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
