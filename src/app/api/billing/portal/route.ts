import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ctx.contractor.stripeCustomerId) {
    return NextResponse.redirect(new URL('/settings/billing', req.url), 303)
  }

  const stripe = require('@/lib/stripe').getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: ctx.contractor.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  })

  return NextResponse.redirect(session.url, 303)
}
