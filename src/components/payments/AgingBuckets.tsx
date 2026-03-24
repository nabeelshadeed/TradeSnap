import { cn } from '@/lib/utils'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'

interface AgingBucket {
  label: string
  amount: number
  count: number
  colour: 'green' | 'amber' | 'orange' | 'red'
}

interface AgingBucketsProps {
  buckets: AgingBucket[]
  activeFilter?: string
  onFilterChange?: (label: string) => void
  currency?: string
}

const COLOUR_MAP = {
  green: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', active: 'bg-green-100 border-green-400' },
  amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', active: 'bg-amber-100 border-amber-400' },
  orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', active: 'bg-orange-100 border-orange-400' },
  red: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', active: 'bg-red-100 border-red-400' },
}

export function AgingBuckets({ buckets, activeFilter, onFilterChange, currency = 'GBP' }: AgingBucketsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {buckets.map(bucket => {
        const colours = COLOUR_MAP[bucket.colour]
        const isActive = activeFilter === bucket.label
        return (
          <button
            key={bucket.label}
            onClick={() => onFilterChange?.(bucket.label === activeFilter ? '' : bucket.label)}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              isActive ? colours.active : colours.bg,
              'hover:opacity-90 active:scale-95'
            )}
          >
            <p className={cn('text-xs font-semibold mb-1', colours.text)}>{bucket.label}</p>
            <MoneyDisplay amount={bucket.amount} currency={currency} size="lg" colour={
              bucket.colour === 'green' ? 'positive' :
              bucket.colour === 'red' ? 'negative' : 'warning'
            } />
            <p className={cn('text-xs mt-1', colours.text)}>{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
          </button>
        )
      })}
    </div>
  )
}
