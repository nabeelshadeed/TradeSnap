import { cn } from '@/lib/utils'

type RiskLevel = 'good' | 'average' | 'slow' | 'avoid'

const RISK_CONFIG = {
  good: { label: '⚡ Fast Payer', className: 'bg-green-100 text-green-700' },
  average: { label: '👍 Reliable', className: 'bg-gray-100 text-gray-700' },
  slow: { label: '🐢 Slow Payer', className: 'bg-amber-100 text-amber-700' },
  avoid: { label: '⚠️ High Risk', className: 'bg-red-100 text-red-700' },
}

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
  size?: 'sm' | 'md'
}

export function RiskBadge({ level, className, size = 'sm' }: RiskBadgeProps) {
  const config = RISK_CONFIG[level]
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      config.className,
      className,
    )}>
      {config.label}
    </span>
  )
}
