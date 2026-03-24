import { auth } from '@clerk/nextjs/server'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

export interface AuthContext {
  clerkUserId: string
  contractorId: string
  role: 'owner' | 'admin' | 'worker'
  contractor: typeof schema.contractors.$inferSelect
  user: typeof schema.users.$inferSelect
  isTrialExpired: boolean
  planStatus: 'active' | 'trial' | 'trial_expired' | 'free'
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId } = await auth()
  if (!userId) return null

  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.clerkUserId, userId),
    with: {
      contractor: true,
    },
  })

  if (!user || !user.contractor) return null

  const contractor = user.contractor

  // Trial enforcement: if trialEndsAt is set and expired, and plan is still 'free',
  // the contractor is in expired trial state. Return context but add isTrialExpired flag.
  const isTrialExpired =
    contractor.trialEndsAt != null &&
    new Date(contractor.trialEndsAt) < new Date() &&
    contractor.plan === 'free'

  const isPaidPlan =
    contractor.plan === 'starter' ||
    contractor.plan === 'pro' ||
    contractor.plan === 'business'

  let planStatus: AuthContext['planStatus']
  if (isPaidPlan) {
    planStatus = 'active'
  } else if (contractor.trialEndsAt != null && new Date(contractor.trialEndsAt) >= new Date()) {
    planStatus = 'trial'
  } else if (contractor.trialEndsAt != null && new Date(contractor.trialEndsAt) < new Date()) {
    planStatus = 'trial_expired'
  } else {
    planStatus = 'free'
  }

  return {
    clerkUserId: userId,
    contractorId: user.contractorId!,
    role: user.role ?? 'owner',
    contractor,
    user,
    isTrialExpired,
    planStatus,
  }
}

export function requireRole(ctx: AuthContext, minRole: 'worker' | 'admin' | 'owner'): boolean {
  const roleOrder = { worker: 0, admin: 1, owner: 2 }
  return roleOrder[ctx.role] >= roleOrder[minRole]
}

/**
 * Returns a 402 Response if the trial has expired and no paid plan exists.
 * Call at the top of any feature-gated API route handler:
 *   const block = trialGuard(ctx); if (block) return block;
 */
export function trialGuard(ctx: AuthContext): Response | null {
  if (ctx.isTrialExpired) {
    return Response.json(
      { error: 'Your free trial has expired. Upgrade to continue.', code: 'TRIAL_EXPIRED' },
      { status: 402 },
    )
  }
  return null
}
