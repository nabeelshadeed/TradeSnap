import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { BusinessSettingsForm } from './BusinessSettingsForm'

export default async function BusinessSettingsPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  return (
    <BusinessSettingsForm
      contractor={{
        name: ctx.contractor.name,
        phone: ctx.contractor.phone ?? null,
        email: ctx.contractor.email ?? null,
        logoUrl: ctx.contractor.logoUrl ?? null,
        primaryColour: ctx.contractor.primaryColour ?? '#f97316',
        invoicePrefix: ctx.contractor.invoicePrefix ?? null,
        invoiceFooter: ctx.contractor.invoiceFooter ?? null,
      }}
    />
  )
}
