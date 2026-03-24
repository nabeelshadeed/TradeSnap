import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft, Landmark, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function BankPage({ searchParams }: { searchParams: { connected?: string; error?: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const contractor = ctx.contractor
  const isPro = ['pro', 'business'].includes(contractor.plan ?? 'free')

  return (
    <div>
      <TopBar title="Bank & Open Banking" />
      <div className="p-5 max-w-2xl space-y-4">
        <Link href="/settings" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} />Back to settings
        </Link>

        {searchParams.connected && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm font-medium text-green-800">Bank connected successfully! Auto-reconciliation is now active.</p>
          </div>
        )}
        {searchParams.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-red-600" />
            <p className="text-sm font-medium text-red-800">Connection failed. Please try again.</p>
          </div>
        )}

        {/* Bank details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Landmark size={16} />
            Bank details (shown on invoices)
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Bank name', value: contractor.bankName ?? '—' },
              { label: 'Account name', value: contractor.bankAccountName ?? '—' },
              { label: 'Sort code', value: contractor.bankSortCode ?? '—' },
              { label: 'Account number', value: contractor.bankAccountNumber ?? '—' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-mono font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-orange-500 hover:text-orange-600 font-medium">
            Edit bank details
          </button>
        </div>

        {/* Open Banking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Auto-reconciliation</h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect your bank to automatically match incoming payments to invoices. No manual marking as paid.
          </p>

          {!isPro && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-orange-800 font-medium">Open banking requires Pro plan.</p>
              <Link href="/settings/billing" className="text-xs text-orange-600 underline">Upgrade now →</Link>
            </div>
          )}

          {contractor.obConnected ? (
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Bank connected via {contractor.obProvider}</p>
                {contractor.obLastSyncAt && (
                  <p className="text-xs text-gray-500">Last synced: {new Date(contractor.obLastSyncAt).toLocaleString()}</p>
                )}
              </div>
              <form action="/api/open-banking/sync" method="POST" className="ml-auto">
                <button className="text-xs text-orange-500 font-medium">Sync now</button>
              </form>
            </div>
          ) : (
            <form action="/api/open-banking/connect" method="POST">
              <button
                disabled={!isPro}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
              >
                Connect bank account
              </button>
            </form>
          )}
          <p className="text-xs text-gray-400 mt-3 text-center">Read-only access · We cannot move money · FCA regulated</p>
        </div>
      </div>
    </div>
  )
}
