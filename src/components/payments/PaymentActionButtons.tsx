'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Zap } from 'lucide-react'

interface PaymentActionButtonsProps {
  jobId: string
  isOverdue: boolean
  days: number
}

export function PaymentActionButtons({ jobId, isOverdue, days }: PaymentActionButtonsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const act = async (endpoint: string) => {
    setLoading(true)
    try {
      await fetch(`/api/jobs/${jobId}/${endpoint}`, { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {!isOverdue && (
        <button
          onClick={() => act('remind')}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 active:bg-blue-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold"
          style={{ minHeight: 44 }}
        >
          <Send size={14} />
          {loading ? '...' : 'Remind'}
        </button>
      )}
      {isOverdue && days < 7 && (
        <button
          onClick={() => act('remind')}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 active:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold"
          style={{ minHeight: 44 }}
        >
          <Send size={14} />
          {loading ? '...' : 'Firm Reminder'}
        </button>
      )}
      {isOverdue && days >= 7 && days < 14 && (
        <button
          onClick={() => act('escalate')}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 active:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold"
          style={{ minHeight: 44 }}
        >
          <Zap size={14} />
          {loading ? '...' : 'Escalate'}
        </button>
      )}
      {isOverdue && days >= 14 && (
        <button
          onClick={() => act('escalate')}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 active:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold"
          style={{ minHeight: 44 }}
        >
          <Zap size={14} />
          {loading ? '...' : 'Final Notice'}
        </button>
      )}
    </div>
  )
}
