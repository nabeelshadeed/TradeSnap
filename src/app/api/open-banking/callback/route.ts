import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { exchangeCodeForToken } from '@/lib/open-banking/truelayer'
import { encryptToken } from '@/lib/encrypt'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) return NextResponse.redirect(new URL('/settings/bank?error=missing', req.url))

  let contractorId: string
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64').toString())
    contractorId = parsed.contractorId
  } catch {
    return NextResponse.redirect(new URL('/settings/bank?error=invalid', req.url))
  }

  try {
    const tokens = await exchangeCodeForToken(code)
    const [encAccess, encRefresh] = await Promise.all([
      encryptToken(tokens.access_token),
      encryptToken(tokens.refresh_token),
    ])
    const db = getDb()
    await db.update(schema.contractors).set({
      obConnected: true,
      obProvider: 'truelayer',
      obAccessToken: encAccess,
      obRefreshToken: encRefresh,
      obTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      updatedAt: new Date(),
    }).where(eq(schema.contractors.id, contractorId))

    return NextResponse.redirect(new URL('/settings/bank?connected=1', req.url))
  } catch {
    return NextResponse.redirect(new URL('/settings/bank?error=auth', req.url))
  }
}
