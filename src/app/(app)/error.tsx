'use client'
import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl mb-4">⚡</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong — try again</h2>
      <p className="text-sm text-gray-500 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
      >
        Try again
      </button>
    </div>
  )
}
