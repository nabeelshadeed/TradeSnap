import { cn } from '@/lib/utils'
import { MoneyDisplay } from './MoneyDisplay'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  subtext?: string
  isMoney?: boolean
  colour?: 'positive' | 'negative' | 'warning' | 'neutral' | 'auto'
  icon?: LucideIcon
  onClick?: () => void
  className?: string
  currency?: string
}

export function StatCard({
  label,
  value,
  subtext,
  isMoney = true,
  colour = 'neutral',
  icon: Icon,
  onClick,
  className,
  currency,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-5 shadow-sm',
        onClick && 'cursor-pointer hover:border-orange-300 hover:shadow-md transition-all active:scale-95',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {Icon && <Icon size={16} className="text-gray-400 mt-0.5" />}
      </div>
      {isMoney ? (
        <MoneyDisplay
          amount={typeof value === 'string' ? parseFloat(value) || 0 : value}
          size="2xl"
          colour={colour}
          currency={currency}
          className="block"
        />
      ) : (
        <p className={cn(
          'text-2xl font-black tabular-nums',
          colour === 'positive' && 'text-green-600',
          colour === 'negative' && 'text-red-600',
          colour === 'warning' && 'text-amber-600',
          colour === 'neutral' && 'text-gray-900',
        )}>
          {value}
        </p>
      )}
      {subtext && (
        <p className="text-xs text-gray-500 mt-1">{subtext}</p>
      )}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
      <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  )
}
