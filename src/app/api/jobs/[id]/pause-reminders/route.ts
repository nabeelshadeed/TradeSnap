import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // Toggle: if currently paused, unpause; if not, pause
  const newPausedState = !job.remindersPaused

  await db.update(schema.jobs)
    .set({ remindersPaused: newPausedState, updatedAt: new Date() })
    .where(eq(schema.jobs.id, params.id))

  // Log the pause/unpause action to contact log if reason provided
  if (body.reason && newPausedState) {
    await db.insert(schema.contactLogs).values({
      jobId: params.id,
      contractorId: ctx.contractorId,
      loggedBy: ctx.user.id,
      type: 'note',
      note: `Reminders paused. Reason: ${String(body.reason).slice(0, 500)}`,
      outcome: 'other',
    })
  }

  return NextResponse.json({ remindersPaused: newPausedState })
}
