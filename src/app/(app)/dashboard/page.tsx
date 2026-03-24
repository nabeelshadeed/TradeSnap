import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, and, or } from 'drizzle-orm'
import Link from 'next/link'
import { Settings, Plus, Briefcase, CreditCard } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { VoiceJobButton } from '@/components/jobs/VoiceJobButton'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')
  if (!ctx.contractor.onboardingDone) redirect('/onboarding')

  const db = getDb()

  // Single number that matters: total owed
  const outstandingJobs = await db.query.jobs.findMany({
    where: and(
      eq(schema.jobs.contractorId, ctx.contractorId),
      or(
        eq(schema.jobs.status, 'invoiced'),
        eq(schema.jobs.status, 'part_paid'),
        eq(schema.jobs.status, 'overdue'),
      ),
    ),
    columns: { balanceDue: true, dueDateAt: true, status: true },
    limit: 100,
  })

  const totalOwed = outstandingJobs.reduce((s, j) => s + parseFloat(String(j.balanceDue ?? 0)), 0)
  const overdueCount = outstandingJobs.filter(j => {
    if (!j.dueDateAt) return false
    return new Date(j.dueDateAt) < new Date()
  }).length

  const currency = ctx.contractor.currency ?? 'GBP'
  const symbol = currency === 'GBP' ? '£' : '$'
  const firstName = ctx.user.firstName ?? ctx.contractor.name.split(' ')[0]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 pt-safe flex items-center justify-between h-14 sticky top-0 z-20">
        <p className="text-base font-semibold text-gray-900">Hi, {firstName}</p>
        <Link href="/settings" className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Settings size={20} />
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-5 pt-6 pb-32 max-w-md mx-auto w-full">

        {/* Money summary — only shows if owed */}
        {totalOwed > 0 && (
          <Link
            href="/payments"
            className="mb-6 bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">
                {symbol}{totalOwed.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {overdueCount > 0 && (
                <p className="text-xs text-red-500 font-semibold mt-1">{overdueCount} overdue</p>
              )}
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <CreditCard size={20} className="text-orange-500" />
            </div>
          </Link>
        )}

        {/* Primary action */}
        <Link
          href="/jobs/new"
          className="flex items-center justify-center gap-3 bg-orange-500 active:bg-orange-600 text-white rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-sm"
          style={{ minHeight: 64 }}
        >
          <Plus size={22} strokeWidth={2.5} />
          New Job
        </Link>

        {/* Voice job */}
        <VoiceJobButton currency={currency} />

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <Link
            href="/jobs"
            className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl active:bg-gray-50 transition-all active:scale-[0.98]"
            style={{ minHeight: 80 }}
          >
            <Briefcase size={22} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">View Jobs</span>
          </Link>
          <Link
            href="/payments"
            className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl active:bg-gray-50 transition-all active:scale-[0.98]"
            style={{ minHeight: 80 }}
          >
            <CreditCard size={22} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Payments</span>
          </Link>
        </div>

      </main>
    </div>
  )
}
