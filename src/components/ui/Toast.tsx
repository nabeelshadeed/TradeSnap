'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (params: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((params: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...params, id }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((title: string, description?: string) => {
    toast({ type: 'success', title, description })
  }, [toast])

  const error = useCallback((title: string, description?: string) => {
    toast({ type: 'error', title, description })
  }, [toast])

  const info = useCallback((title: string, description?: string) => {
    toast({ type: 'info', title, description })
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'bg-white rounded-xl shadow-lg border p-4 flex items-start gap-3 pointer-events-auto animate-fade-in',
              t.type === 'success' && 'border-green-200',
              t.type === 'error' && 'border-red-200',
              t.type === 'info' && 'border-blue-200',
              t.type === 'warning' && 'border-amber-200',
            )}
          >
            {t.type === 'success' && <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />}
            {t.type === 'error' && <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />}
            {t.type === 'info' && <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />}
            {t.type === 'warning' && <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t.title}</p>
              {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
