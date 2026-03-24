'use client'
import { useState } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { JobCard } from '@/components/jobs/JobCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, ChevronRight, Zap, Send, Phone } from 'lucide-react'
import { daysOverdue, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DashboardClientProps {
  totalOwed: number
  totalOverdue: number
  thisWeekTotal: number
  lastWeekTotal: number
  overdueJobs: Array<{
    id: string
    title: string
    balanceDue: string
    dueDateAt: string | null
    customerName: string
    escalationStage: string
    invoiceNumber: string | null
  }>
  recentJobs: Array<{
    id: string
    title: string
    status: string
    total: string
    balanceDue: string
    updatedAt: string
    dueDateAt: string | null
    referenceNumber: string | null
    customerName: string | null
  }>
  statusCounts: Record<string, number>
  missedRevenue: Array<{
    id: string
    title: string
    total: string
    completedAt: string | null
    customerName: string | null
  }>
  currency: string
  biggestProblem: string | null | undefined
  onboardingDone: boolean
}

const PROBLEM_MESSAGES: Record<string, string> = {
  'late-payments': 'payments are automated — we\'re chasing on your behalf.',
  'quoting-slow': 'AI quote ready in 90 seconds. Tap \'New Price\'.',
  'chasing-awkward': 'Payment reminders are sent automatically so you don\'t have to.',
  'forgetting-invoice': 'Never forget again — we track every completed job.',
  'dont-know-owed': 'Your full cash position is live below.',
}

const PIPELINE_STATUSES = ['draft', 'sent', 'accepted', 'in_progress', 'completed', 'invoiced']

export function DashboardClient({
  totalOwed,
  totalOverdue,
  thisWeekTotal,
  lastWeekTotal,
  overdueJobs,
  recentJobs,
  statusCounts,
  missedRevenue,
  currency,
  biggestProblem,
  onboardingDone,
}: DashboardClientProps) {
  const [remindLoading, setRemindLoading] = useState<string | null>(null)

  const weekChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0
  const weekChangeText = lastWeekTotal === 0 ? '' : weekChange >= 0 ? `↑ ${weekChange.toFixed(0)}% vs last week` : `↓ ${Math.abs(weekChange).toFixed(0)}% vs last week`

  const sendReminder = async (jobId: string) => {
    setRemindLoading(jobId)
    try {
      await fetch(`/api/jobs/${jobId}/escalate`, { method: 'POST' })
    } finally {
      setRemindLoading(null)
    }
  }

  const missedTotal = missedRevenue.reduce((s, j) => s + parseFloat(j.total || '0'), 0)

  return (
    <div className="space-y-5">
      {/* Personalised message */}
      {biggestProblem && PROBLEM_MESSAGES[biggestProblem] && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Zap size={16} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>SnapTrade</strong> — {PROBLEM_MESSAGES[biggestProblem]}
          </p>
        </div>
      )}

      {/* Live cash position */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Owed to you"
          value={totalOwed}
          subtext={`${overdueJobs.length} invoices pending`}
          colour="neutral"
          isMoney
          currency={currency}
          onClick={() => window.location.href = '/payments'}
        />
        <StatCard
          label="Overdue"
          value={totalOverdue}
          subtext={`${overdueJobs.length} job${overdueJobs.length !== 1 ? 's' : ''} overdue`}
          colour={totalOverdue > 0 ? 'negative' : 'neutral'}
          isMoney
          currency={currency}
          onClick={() => window.location.href = '/payments?filter=overdue'}
        />
        <StatCard
          label="This week"
          value={thisWeekTotal}
          subtext={weekChangeText || 'vs last week'}
          colour="positive"
          isMoney
          currency={currency}
          onClick={() => window.location.href = '/payments?filter=paid'}
        />
      </div>

      {/* Urgent actions */}
      {overdueJobs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">Action required</h3>
          </div>
          <div className="space-y-2">
            {overdueJobs.slice(0, 3).map(job => {
              const days = daysOverdue(job.dueDateAt)
              return (
                <div key={job.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.customerName}</p>
                    <p className="text-xs text-gray-500 truncate">{job.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <MoneyDisplay amount={job.balanceDue} currency={currency} size="sm" colour="negative" />
                    <p className="text-xs text-red-600">{days}d overdue</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => sendReminder(job.id)}
                      disabled={remindLoading === job.id}
                      className="flex items-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Send size={10} />
                      {remindLoading === job.id ? '...' : 'Remind'}
                    </button>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
          {overdueJobs.length > 3 && (
            <Link href="/payments?filter=overdue" className="flex items-center gap-1 text-xs text-red-700 font-medium mt-3 hover:underline">
              See all {overdueJobs.length} overdue <ChevronRight size={12} />
            </Link>
          )}
        </div>
      )}

      {/* Missed revenue detector */}
      {missedRevenue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Missed revenue</h3>
            </div>
            <MoneyDisplay amount={missedTotal} currency={currency} size="sm" colour="warning" />
          </div>
          <div className="space-y-2">
            {missedRevenue.map(job => (
              <div key={job.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500">Completed {job.completedAt ? formatDate(job.completedAt, 'relative') : 'recently'} — not invoiced</p>
                </div>
                <Link
                  href={`/jobs/${job.id}?action=invoice`}
                  className="ml-3 shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                >
                  Send Invoice
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Jobs pipeline</h3>
          <Link href="/jobs" className="text-xs text-orange-500 hover:text-orange-600 font-medium">View all</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STATUSES.map(status => {
            const count = statusCounts[status] ?? 0
            if (count === 0) return null
            return (
              <Link key={status} href={`/jobs?status=${status}`}>
                <Badge status={status} size="md">
                  {count}
                </Badge>
              </Link>
            )
          })}
          {PIPELINE_STATUSES.every(s => !statusCounts[s]) && (
            <p className="text-sm text-gray-400">No active jobs</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/jobs/new"
          className="flex flex-col items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 transition-colors active:scale-95"
        >
          <span className="text-xl">+</span>
          <span className="text-xs font-semibold">New Price</span>
        </Link>
        <Link
          href="/jobs?status=completed&action=invoice"
          className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 hover:border-orange-300 text-gray-700 rounded-xl py-4 transition-colors active:scale-95"
        >
          <span className="text-xl">✓</span>
          <span className="text-xs font-semibold">Mark Done</span>
        </Link>
        <Link
          href="/payments"
          className="flex flex-col items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl py-4 transition-colors active:scale-95"
        >
          <span className="text-xl">💰</span>
          <span className="text-xs font-semibold">Get Paid</span>
        </Link>
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent jobs</h3>
          <Link href="/jobs" className="text-xs text-orange-500 hover:text-orange-600 font-medium">See all</Link>
        </div>
        {recentJobs.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="No jobs yet"
            description="Tap '+ New Price' to send your first one."
            action={
              <Link href="/jobs/new" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                Send first price
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {recentJobs.map(job => (
              <JobCard key={job.id} job={job} customerName={job.customerName ?? undefined} currency={currency} />
            ))}
          </div>
        )}
      </div>

      {/* Weekly summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">This week</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Received</p>
            <MoneyDisplay amount={thisWeekTotal} currency={currency} size="lg" colour="positive" />
          </div>
          {lastWeekTotal > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Last week</p>
              <MoneyDisplay amount={lastWeekTotal} currency={currency} size="lg" colour="neutral" />
            </div>
          )}
        </div>
        {/* Simple bar chart */}
        {lastWeekTotal > 0 && (
          <div className="mt-3 flex items-end gap-1 h-8">
            <div
              className="bg-gray-200 rounded flex-1"
              style={{ height: `${lastWeekTotal > 0 ? Math.min(100, (lastWeekTotal / Math.max(thisWeekTotal, lastWeekTotal)) * 100) : 20}%` }}
            />
            <div
              className="bg-orange-400 rounded flex-1"
              style={{ height: `${thisWeekTotal > 0 ? Math.min(100, (thisWeekTotal / Math.max(thisWeekTotal, lastWeekTotal)) * 100) : 20}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
