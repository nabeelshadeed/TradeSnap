import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq, ilike, and, or } from 'drizzle-orm'
import { TopBar } from '@/components/layout/TopBar'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const customers = await db.query.customers.findMany({
    where: and(
      eq(schema.customers.contractorId, ctx.contractorId),
      searchParams.q
        ? or(
            ilike(schema.customers.firstName, `%${searchParams.q}%`),
            ilike(schema.customers.lastName, `%${searchParams.q}%`),
            ilike(schema.customers.companyName, `%${searchParams.q}%`),
          )
        : undefined,
    ),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    limit: 50,
  })

  return (
    <div>
      <TopBar title="Customers" />
      <div className="p-5 max-w-3xl space-y-3">
        {customers.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No customers yet"
            description="They'll appear when you create your first job."
          />
        ) : (
          customers.map(c => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                {c.firstName[0]}{c.lastName?.[0] ?? ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
                <div className="flex items-center gap-2 mt-0.5">
                  {c.riskLevel && <RiskBadge level={c.riskLevel} />}
                  {c.totalJobs !== null && c.totalJobs > 0 && (
                    <span className="text-xs text-gray-400">{c.totalJobs} jobs</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {parseFloat(String(c.totalOutstanding ?? 0)) > 0 && (
                  <MoneyDisplay amount={String(c.totalOutstanding)} colour="warning" size="sm" />
                )}
                <ChevronRight size={16} className="text-gray-400 ml-auto mt-1" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
