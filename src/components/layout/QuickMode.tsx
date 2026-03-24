'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Plus, CheckCircle, DollarSign, X } from 'lucide-react'

interface QuickModeProps {
  open: boolean
  onClose: () => void
}

export function QuickMode({ open, onClose }: QuickModeProps) {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAction = (path: string) => {
    router.push(path)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/60 hover:text-white"
      >
        <X size={28} />
      </button>
      <h2 className="text-white/60 text-sm font-medium uppercase tracking-widest mb-8">Quick Action</h2>
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => handleAction('/jobs/new')}
          className="w-full flex items-center gap-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-2xl p-6 text-white transition-colors active:scale-95"
          style={{ minHeight: 80 }}
        >
          <Plus size={28} className="shrink-0" />
          <span className="text-xl font-bold">New Price</span>
        </button>
        <button
          onClick={() => handleAction('/jobs?filter=in_progress')}
          className="w-full flex items-center gap-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 rounded-2xl p-6 text-white transition-colors active:scale-95"
          style={{ minHeight: 80 }}
        >
          <CheckCircle size={28} className="shrink-0" />
          <span className="text-xl font-bold">Mark Job Done</span>
        </button>
        <button
          onClick={() => handleAction('/payments?filter=overdue')}
          className="w-full flex items-center gap-4 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-2xl p-6 text-white transition-colors active:scale-95"
          style={{ minHeight: 80 }}
        >
          <DollarSign size={28} className="shrink-0" />
          <span className="text-xl font-bold">Get Paid</span>
        </button>
      </div>
    </div>
  )
}
