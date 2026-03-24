import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | string,
  currency = 'GBP',
  locale = 'en-GB'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '£0'
  if (Math.abs(num) >= 1_000_000) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 1 }).format(num / 1_000_000) + 'm'
  }
  if (Math.abs(num) >= 10_000) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 1 }).format(num / 1_000) + 'k'
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num)
}

export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' | 'relative' = 'short'): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (format === 'relative') {
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

export function daysOverdue(dueDateIso: string | Date | null): number {
  if (!dueDateIso) return 0
  const due = new Date(dueDateIso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
