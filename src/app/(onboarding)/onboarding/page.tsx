import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { OnboardingFlow } from './OnboardingFlow'

export default async function OnboardingPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')
  if (ctx.contractor.onboardingDone) redirect('/dashboard')

  return <OnboardingFlow contractorId={ctx.contractorId} firstName={ctx.user.firstName ?? 'there'} />
}
