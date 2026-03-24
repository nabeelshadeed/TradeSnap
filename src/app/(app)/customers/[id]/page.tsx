import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect, notFound } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { TopBar } from '@/components/layout/TopBar'
import { RiskScore } from '@/components/customers/RiskScore'
import { JobCard } from '@/components/jobs/JobCard'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const customer = await db.query.customers.findFirst({
    where: and(eq(schema.customers.id, params.id), eq(schema.customers.contractorId, ctx.contractorId)),
    with: {
      jobs: {
        orderBy: (j, { desc }) => [desc(j.updatedAt)],
        limit: 10,
      },
    },
  })

  if (!customer) notFound()

  const currency = ctx.contractor.currency ?? 'GBP'

  return (
    <div>
      <TopBar title={`${customer.firstName} ${customer.lastName ?? ''}`.trim()} />
      <div className="p-5 max-w-3xl space-y-4">
        <Link href="/customers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} />Back to customers
        </Link>

        {/* Customer header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-lg">
              {customer.firstName[0]}{customer.lastName?.[0] ?? ''}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{customer.firstName} {customer.lastName}</h2>
              {customer.companyName && <p className="text-sm text-gray-500">{customer.companyName}</p>}
              {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
              {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total invoiced</p>
            <MoneyDisplay amount={String(customer.totalInvoiced ?? 0)} currency={currency} size="lg" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total paid</p>
            <MoneyDisplay amount={String(customer.totalPaid ?? 0)} currency={currency} size="lg" colour="positive" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Outstanding</p>
            <MoneyDisplay
              amount={String(customer.totalOutstanding ?? 0)}
              currency={currency}
              size="lg"
              colour={parseFloat(String(customer.totalOutstanding ?? 0)) > 0 ? 'warning' : 'neutral'}
            />
          </div>
        </div>

        {/* Risk */}
        {customer.riskLevel && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment reliability</h3>
            <RiskScore
              riskLevel={customer.riskLevel}
              avgPaymentDays={customer.avgPaymentDays}
              latePaymentCount={customer.latePaymentCount ?? 0}
              communityRiskScore={customer.communityRiskScore}
              communityReportCount={customer.communityReportCount ?? 0}
            />
          </div>
        )}

        {/* Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Jobs ({customer.jobs.length})</h3>
            <Link href={`/jobs/new?customerId=${customer.id}`} className="text-xs text-orange-500 font-medium">
              + New job
            </Link>
          </div>
          <div className="space-y-2">
            {customer.jobs.map(job => (
              <JobCard
                key={job.id}
                job={{
                  id: job.id,
                  title: job.title,
                  status: job.status ?? 'draft',
                  total: String(job.total),
                  balanceDue: String(job.balanceDue),
                  updatedAt: String(job.updatedAt),
                  dueDateAt: job.dueDateAt ? String(job.dueDateAt) : null,
                  referenceNumber: job.referenceNumber,
                }}
                currency={currency}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
