import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!ctx.contractor.stripeCustomerId) {
      return NextResponse.redirect(new URL('/settings/billing', req.url), 303)
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.contractor.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.redirect(session.url, 303)
  } catch (err: any) {
    console.error('[billing/portal]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to open billing portal' }, { status: 500 })
  }
}
