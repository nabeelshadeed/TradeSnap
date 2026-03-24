import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getSignedUploadUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    columns: { id: true },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { fileName, contentType, photoType } = await req.json()
  const key = `jobs/${params.id}/photos/${Date.now()}-${fileName}`
  const uploadUrl = await getSignedUploadUrl(key, contentType)

  await db.insert(schema.jobPhotos).values({
    jobId: params.id,
    fileKey: key,
    originalName: fileName,
    mimeType: contentType,
    photoType: photoType ?? 'site',
    uploadedBy: ctx.user.id,
  })

  return NextResponse.json({ uploadUrl, key })
}
