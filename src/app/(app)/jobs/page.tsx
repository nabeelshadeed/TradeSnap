import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { JobCard } from '@/components/jobs/JobCard'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Invoiced', value: 'invoiced' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
]

// Maps display filter → DB statuses
const FILTER_STATUS_MAP: Record<string, string[]> = {
  pending: ['draft', 'sent', 'viewed', 'accepted', 'in_progress', 'completed'],
  invoiced: ['invoiced', 'part_paid'],
  overdue: ['overdue', 'disputed'],
  paid: ['paid'],
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const statusFilter = searchParams.status || ''
  const dbStatuses = FILTER_STATUS_MAP[statusFilter]

  const jobs = await db.query.jobs.findMany({
    where: and(
      eq(schema.jobs.contractorId, ctx.contractorId),
      dbStatuses ? inArray(schema.jobs.status, dbStatuses as any) : undefined,
    ),
    with: { customer: true },
    orderBy: (jobs, { desc }) => [desc(jobs.updatedAt)],
    limit: 50,
  })

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-20">
        <h1 className="text-base font-semibold text-gray-900">Jobs</h1>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold active:bg-orange-600 transition-colors"
          style={{ minHeight: 40 }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New
        </Link>
      </header>

      <div className="px-4 pt-4 pb-32 max-w-2xl mx-auto w-full space-y-4">
        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {FILTER_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={opt.value ? `/jobs?status=${opt.value}` : '/jobs'}
              className={`shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {/* Jobs list */}
        {jobs.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="No jobs here"
            description={statusFilter ? `No ${FILTER_OPTIONS.find(f => f.value === statusFilter)?.label.toLowerCase() ?? statusFilter} jobs.` : 'Start by sending your first price.'}
            action={
              <Link
                href="/jobs/new"
                className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold"
                style={{ minHeight: 48 }}
              >
                New Job
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
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
                customerName={
                  job.customer
                    ? `${job.customer.firstName} ${job.customer.lastName ?? ''}`.trim()
                    : undefined
                }
                currency={ctx.contractor.currency ?? 'GBP'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
