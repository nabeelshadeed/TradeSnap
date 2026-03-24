import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, and, or, gte, lt } from 'drizzle-orm'
import { AgingBuckets } from '@/components/payments/AgingBuckets'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { calculateStatutoryInterest } from '@/lib/legal'
import { daysOverdue, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Send, FileText, Phone, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const now = new Date()

  const invoicedJobs = await db.query.jobs.findMany({
    where: and(
      eq(schema.jobs.contractorId, ctx.contractorId),
      or(
        eq(schema.jobs.status, 'invoiced'),
        eq(schema.jobs.status, 'part_paid'),
        eq(schema.jobs.status, 'overdue'),
        eq(schema.jobs.status, 'disputed'),
      ),
    ),
    with: { customer: true },
    orderBy: (jobs, { asc }) => [asc(jobs.dueDateAt)],
    limit: 50,
  })

  const currency = ctx.contractor.currency ?? 'GBP'

  // Aging buckets
  const current = invoicedJobs.filter(j => {
    if (!j.dueDateAt) return true
    return new Date(j.dueDateAt) >= now
  })
  const late1_30 = invoicedJobs.filter(j => {
    if (!j.dueDateAt) return false
    const days = daysOverdue(j.dueDateAt)
    return days >= 1 && days <= 30
  })
  const late31_60 = invoicedJobs.filter(j => {
    if (!j.dueDateAt) return false
    const days = daysOverdue(j.dueDateAt)
    return days >= 31 && days <= 60
  })
  const late60plus = invoicedJobs.filter(j => {
    if (!j.dueDateAt) return false
    return daysOverdue(j.dueDateAt) > 60
  })

  const sumJobs = (jobs: typeof invoicedJobs) =>
    jobs.reduce((s, j) => s + parseFloat(String(j.balanceDue ?? 0)), 0)

  const buckets = [
    { label: 'Current', amount: sumJobs(current), count: current.length, colour: 'green' as const },
    { label: '1-30 Days', amount: sumJobs(late1_30), count: late1_30.length, colour: 'amber' as const },
    { label: '31-60 Days', amount: sumJobs(late31_60), count: late31_60.length, colour: 'orange' as const },
    { label: '60+ Days', amount: sumJobs(late60plus), count: late60plus.length, colour: 'red' as const },
  ]

  const filterMap: Record<string, typeof invoicedJobs> = {
    '': invoicedJobs,
    'current': current,
    '1-30 Days': late1_30,
    '31-60 Days': late31_60,
    '60+ Days': late60plus,
    'overdue': [...late1_30, ...late31_60, ...late60plus],
  }
  const displayJobs = filterMap[searchParams.filter ?? ''] ?? invoicedJobs

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-5 h-14 flex items-center sticky top-0 z-20">
        <h1 className="text-base font-semibold text-gray-900">Payments</h1>
      </header>
      <div className="px-4 py-5 max-w-2xl mx-auto w-full space-y-4 pb-32">
        {/* Aging buckets */}
        <AgingBuckets buckets={buckets} activeFilter={searchParams.filter} currency={currency} />

        {/* Payments table */}
        {displayJobs.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Nothing overdue. Nice work."
            description="All your invoices are current."
          />
        ) : (
          <div className="space-y-2">
            {displayJobs.map(job => {
              const days = job.dueDateAt ? daysOverdue(job.dueDateAt) : 0
              const isOverdue = days > 0
              const customerName = job.customer
                ? `${job.customer.firstName} ${job.customer.lastName ?? ''}`.trim()
                : 'Unknown'
              const statutoryInfo = isOverdue && days > 14
                ? calculateStatutoryInterest(parseFloat(String(job.total)), String(job.dueDateAt))
                : null

              return (
                <div
                  key={job.id}
                  className={`bg-white rounded-xl border p-4 ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{job.invoiceNumber ?? job.referenceNumber}</span>
                        <Badge status={job.status ?? 'invoiced'} />
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-bold">{days}d overdue</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                      <p className="text-xs text-gray-500 truncate">{job.title}</p>
                      {job.dueDateAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Due: {formatDate(job.dueDateAt, 'short')}
                        </p>
                      )}
                      {statutoryInfo && (
                        <p className="text-xs text-red-600 mt-1">
                          Legal interest: £{statutoryInfo.interest.toFixed(2)} + £{statutoryInfo.fixedCompensation} compensation = £{statutoryInfo.totalClaim.toFixed(2)} claimable
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <MoneyDisplay
                        amount={String(job.balanceDue)}
                        currency={currency}
                        size="lg"
                        colour={isOverdue ? 'negative' : 'neutral'}
                      />
                    </div>
                  </div>

                  {/* Action buttons — touch-friendly height */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {!isOverdue && (
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 active:bg-blue-600 text-white rounded-xl text-sm font-semibold" style={{ minHeight: 44 }}>
                        <Send size={14} />
                        Remind
                      </button>
                    )}
                    {isOverdue && days < 7 && (
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 active:bg-amber-600 text-white rounded-xl text-sm font-semibold" style={{ minHeight: 44 }}>
                        <Send size={14} />
                        Firm Reminder
                      </button>
                    )}
                    {isOverdue && days >= 7 && days < 14 && (
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 active:bg-orange-600 text-white rounded-xl text-sm font-semibold" style={{ minHeight: 44 }}>
                        <Zap size={14} />
                        Escalate
                      </button>
                    )}
                    {isOverdue && days >= 14 && (
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-red-600 active:bg-red-700 text-white rounded-xl text-sm font-semibold" style={{ minHeight: 44 }}>
                        <Zap size={14} />
                        Final Notice
                      </button>
                    )}
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold"
                      style={{ minHeight: 44 }}
                    >
                      View
                    </Link>
                    {job.customer?.phone && (
                      <a
                        href={`tel:${job.customer.phone}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold"
                        style={{ minHeight: 44 }}
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

