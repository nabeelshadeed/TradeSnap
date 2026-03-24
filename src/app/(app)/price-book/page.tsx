import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { TopBar } from '@/components/layout/TopBar'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus, Star } from 'lucide-react'

export default async function PriceBookPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const db = getDb()
  const items = await db.query.priceBook.findMany({
    where: eq(schema.priceBook.contractorId, ctx.contractorId),
    orderBy: (pb, { desc, asc }) => [desc(pb.isFavourite), desc(pb.useCount), asc(pb.name)],
  })

  const currency = ctx.contractor.currency ?? 'GBP'

  return (
    <div>
      <TopBar
        title="Price Book"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold">
            <Plus size={15} />
            Add item
          </button>
        }
      />
      <div className="p-5 max-w-3xl">
        {items.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Price book is empty"
            description="Add your standard items and prices. They'll appear when creating quotes."
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4"
              >
                {item.isFavourite && <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                  <p className="text-xs text-gray-400">{item.category} · {item.defaultQty} {item.unit}</p>
                </div>
                <div className="text-right shrink-0">
                  <MoneyDisplay amount={String(item.unitPrice)} currency={currency} size="sm" />
                  <p className="text-xs text-gray-400">per {item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
