import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function BillingPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const plan = ctx.contractor.plan ?? 'free'

  return (
    <div>
      <TopBar title="Billing & Plan" />
      <div className="p-5 max-w-2xl space-y-4">
        <Link href="/settings" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} />Back to settings
        </Link>

        {/* Current plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Current plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-orange-500">
                {plan === 'free' ? 'Free' : plan === 'starter' ? 'Solo' : plan === 'pro' ? 'Growing' : 'Business'}
              </p>
              {plan === 'free' && <p className="text-sm text-gray-500">3 jobs/month</p>}
              {plan === 'starter' && <p className="text-sm text-gray-500">50 jobs/month · AI quotes · Auto reminders</p>}
              {plan === 'pro' && <p className="text-sm text-gray-500">Unlimited jobs · Up to 5 users · Open banking</p>}
              {plan === 'business' && <p className="text-sm text-gray-500">Everything + API access</p>}
            </div>
            {plan !== 'free' && (
              <form action="/api/billing/portal" method="POST">
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Manage subscription
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Upgrade options */}
        {plan !== 'business' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Upgrade your plan</h3>
            {[
              { id: 'starter', name: 'Solo', price: '£29/mo', features: ['50 jobs/month', 'AI quotes', 'Auto reminders', 'Remove branding'] },
              { id: 'pro', name: 'Growing', price: '£49/mo', features: ['Unlimited jobs', 'Up to 5 users', 'Open banking', 'Change orders'] },
              { id: 'business', name: 'Business', price: '£99/mo', features: ['Up to 20 users', 'API access', 'VAT reports'] },
            ].filter(p => p.id !== plan).map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.name} — {p.price}</p>
                  <p className="text-xs text-gray-500">{p.features.join(' · ')}</p>
                </div>
                <form action="/api/billing/checkout" method="POST">
                  <input type="hidden" name="plan" value={p.id} />
                  <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold">
                    Upgrade
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
