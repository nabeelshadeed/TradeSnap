import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'orange'

const JOB_STATUS_STYLES: Record<string, string> = {
  // Pending group — quote not yet invoiced
  draft:       'bg-gray-100 text-gray-600',
  sent:        'bg-orange-100 text-orange-700',
  viewed:      'bg-orange-100 text-orange-700',
  accepted:    'bg-orange-100 text-orange-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-orange-100 text-orange-700',
  // Sent group — invoice out, awaiting payment
  invoiced:    'bg-blue-100 text-blue-700',
  part_paid:   'bg-blue-100 text-blue-700',
  overdue:     'bg-red-100 text-red-700',
  disputed:    'bg-red-100 text-red-700',
  // Paid
  paid:        'bg-green-100 text-green-700',
  // Archive
  cancelled:   'bg-gray-100 text-gray-500',
  lost:        'bg-gray-100 text-gray-400',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  draft:       'Pending',
  sent:        'Pending',
  viewed:      'Pending',
  accepted:    'Pending',
  in_progress: 'Pending',
  completed:   'Pending',
  invoiced:    'Sent',
  part_paid:   'Part paid',
  overdue:     'Overdue',
  disputed:    'Disputed',
  paid:        'Paid',
  cancelled:   'Cancelled',
  lost:        'Lost',
}

interface BadgeProps {
  children?: React.ReactNode
  status?: string
  variant?: BadgeVariant
  className?: string
  size?: 'sm' | 'md'
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
}

export function Badge({ children, status, variant = 'default', className, size = 'sm' }: BadgeProps) {
  const style = status ? JOB_STATUS_STYLES[status] ?? VARIANT_STYLES.default : VARIANT_STYLES[variant]
  const label = status ? JOB_STATUS_LABELS[status] ?? status : children

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
