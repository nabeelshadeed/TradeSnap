import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { slugify, generateToken } from '@/lib/utils'
import { OnboardingFlow } from './OnboardingFlow'

// JIT provision a user + contractor when the Clerk webhook hasn't fired yet.
// This handles the race condition between Clerk redirect and webhook delivery.
async function provisionUserJit(clerkUserId: string) {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const db = getDb()

  // Double-check it wasn't just created by a concurrent request
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.clerkUserId, clerkUserId),
    with: { contractor: true },
  })
  if (existing) return existing

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const firstName = clerkUser.firstName ?? ''
  const lastName = clerkUser.lastName ?? ''
  const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]
  const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber

  let operatingCountry: 'UK' | 'US' = 'UK'
  let legalMode: 'statutory' | 'contract_only' = 'statutory'
  if (phone?.startsWith('+1')) {
    operatingCountry = 'US'
    legalMode = 'contract_only'
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

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

  const [user] = await db.insert(schema.users).values({
    clerkUserId,
    contractorId: contractor.id,
    role: 'owner',
    firstName,
    lastName,
    email,
    avatarUrl: clerkUser.imageUrl,
  }).returning()

  return { ...user, contractor }
}

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')

  let ctx = await getAuthContext()

  // Clerk webhook may not have fired yet — provision the user JIT
  if (!ctx) {
    await provisionUserJit(userId)
    ctx = await getAuthContext()
    if (!ctx) redirect('/auth/sign-in')
  }

  if (ctx.contractor.onboardingDone) redirect('/dashboard')

  return <OnboardingFlow contractorId={ctx.contractorId} firstName={ctx.user.firstName ?? 'there'} />
}
