'use client'
import { useEffect } from 'react'

export function InvoiceViewTracker({ token }: { token: string }) {
  useEffect(() => {
    fetch(`/api/invoices/${token}/view`, { method: 'POST' }).catch(() => {})
  }, [token])
  return null
}
