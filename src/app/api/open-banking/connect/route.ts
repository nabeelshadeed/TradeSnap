import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { generateAuthUrl } from '@/lib/open-banking/truelayer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['pro', 'business'].includes(ctx.contractor.plan ?? 'free')) {
      return NextResponse.json({ error: 'Open banking requires Pro plan or above' }, { status: 403 })
    }

    const state = Buffer.from(JSON.stringify({ contractorId: ctx.contractorId })).toString('base64')
    const authUrl = generateAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (err: any) {
    console.error('[open-banking/connect]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to initiate open banking' }, { status: 500 })
  }
}
