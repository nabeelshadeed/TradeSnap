import { Badge } from '@/components/ui/Badge'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size, className }: StatusBadgeProps) {
  return <Badge status={status} size={size} className={className} />
}
