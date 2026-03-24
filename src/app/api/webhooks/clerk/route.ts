import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { slugify, generateToken } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let evt: any
  try {
    evt = wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = getDb()
  const { type, data } = evt

  if (type === 'user.created') {
    const email = data.email_addresses?.[0]?.email_address ?? ''
    const firstName = data.first_name ?? ''
    const lastName = data.last_name ?? ''
    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]
    const phone: string | undefined = data.phone_numbers?.[0]?.phone_number

    // Detect country from phone prefix: +44 → UK, +1 → US, default UK
    let operatingCountry: 'UK' | 'US' = 'UK'
    let legalMode: 'statutory' | 'contract_only' = 'statutory'
    if (phone) {
      if (phone.startsWith('+1')) {
        operatingCountry = 'US'
        legalMode = 'contract_only'
      } else if (phone.startsWith('+44')) {
        operatingCountry = 'UK'
        legalMode = 'statutory'
      }
    }

    // 14-day free trial from signup
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // Create contractor
    const slug = slugify(fullName) + '-' + generateToken(4).toLowerCase()
    const [contractor] = await db.insert(schema.contractors).values({
      name: fullName,
      slug,
      email,
      phone,
      operatingCountry,
      legalMode,
      trialEndsAt,
    }).returning()

    // Create user
    await db.insert(schema.users).values({
      clerkUserId: data.id,
      contractorId: contractor.id,
      role: 'owner',
      firstName,
      lastName,
      email,
      avatarUrl: data.image_url,
    })
  }

  if (type === 'user.updated') {
    await db.update(schema.users).set({
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email_addresses?.[0]?.email_address,
      avatarUrl: data.image_url,
      updatedAt: new Date(),
    }).where(eq(schema.users.clerkUserId, data.id))
  }

  return NextResponse.json({ ok: true })
}
