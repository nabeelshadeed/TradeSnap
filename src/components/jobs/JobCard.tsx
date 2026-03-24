import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { formatDate, daysOverdue } from '@/lib/utils'
import { ChevronRight, AlertCircle } from 'lucide-react'

interface JobCardProps {
  job: {
    id: string
    title: string
    status: string
    total: string | number
    balanceDue: string | number
    updatedAt: string | Date
    dueDateAt?: string | Date | null
    referenceNumber?: string | null
  }
  customerName?: string
  currency?: string
}

export function JobCard({ job, customerName, currency = 'GBP' }: JobCardProps) {
  const overdue = job.dueDateAt ? daysOverdue(job.dueDateAt) : 0
  const sym = currency === 'GBP' ? '£' : '$'
  const amount = parseFloat(String(job.total))

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 px-4 bg-white rounded-2xl border border-gray-200 active:bg-gray-50 active:scale-[0.99] transition-all"
      style={{ minHeight: 72 }}
    >
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        overdue > 0 ? 'bg-red-500' :
        job.status === 'paid' ? 'bg-green-500' :
        job.status === 'invoiced' ? 'bg-blue-500' :
        job.status === 'draft' ? 'bg-gray-300' :
        'bg-orange-400'
      }`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {customerName && <span className="text-xs text-gray-500 truncate max-w-32">{customerName}</span>}
          {overdue > 0 ? (
            <span className="flex items-center gap-0.5 text-xs text-red-500 font-semibold shrink-0">
              <AlertCircle size={10} />
              {overdue}d overdue
            </span>
          ) : (
            <span className="text-xs text-gray-400 shrink-0">{formatDate(job.updatedAt, 'relative')}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900 tabular-nums">{sym}{amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <StatusBadge status={job.status} size="sm" />
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </Link>
  )
}
