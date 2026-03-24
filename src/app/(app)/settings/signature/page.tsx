import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { SignatureSettingsClient } from './SignatureSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SignaturePage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const contractor = await db.query.contractors.findFirst({
    where: eq(schema.contractors.id, ctx.contractorId),
    columns: { signatureDataUrl: true },
  })

  return <SignatureSettingsClient existingSignature={contractor?.signatureDataUrl ?? null} />
}
