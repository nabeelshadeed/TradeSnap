import { cn } from '@/lib/utils'

interface MoneyDisplayProps {
  amount: number | string
  currency?: string
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  colour?: 'positive' | 'negative' | 'warning' | 'neutral' | 'auto'
  className?: string
  abbreviated?: boolean
}

export function MoneyDisplay({
  amount,
  currency = 'GBP',
  size = 'base',
  colour = 'neutral',
  className,
  abbreviated = false,
}: MoneyDisplayProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const isNegative = num < 0

  let formatted: string
  if (abbreviated && Math.abs(num) >= 10_000) {
    const val = Math.abs(num) >= 1_000_000
      ? (num / 1_000_000).toFixed(1) + 'm'
      : (num / 1_000).toFixed(1) + 'k'
    formatted = `£${val}`
  } else {
    formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(num)
  }

  const colourClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    warning: 'text-amber-600',
    neutral: 'text-gray-900',
    auto: isNegative ? 'text-red-600' : num > 0 ? 'text-green-600' : 'text-gray-900',
  }[colour]

  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  }[size]

  return (
    <span className={cn('font-mono tabular-nums font-semibold', sizeClass, colourClass, className)}>
      {formatted}
    </span>
  )
}
