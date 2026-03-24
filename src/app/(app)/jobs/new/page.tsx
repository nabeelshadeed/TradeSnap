import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { JobWizard } from './JobWizard'

export default async function NewJobPage({ searchParams }: { searchParams: { customerId?: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  return (
    <JobWizard
      contractorId={ctx.contractorId}
      tradeType={ctx.contractor.tradeType ?? 'other'}
      defaultDepositPct={parseFloat(String(ctx.contractor.defaultDepositPct ?? 25))}
      defaultPaymentDays={ctx.contractor.defaultPaymentDays ?? 14}
      taxRegistered={ctx.contractor.taxRegistered ?? false}
      taxRate={parseFloat(String(ctx.contractor.taxRate ?? 20))}
      currency={ctx.contractor.currency ?? 'GBP'}
      initialCustomerId={searchParams.customerId}
    />
  )
}
