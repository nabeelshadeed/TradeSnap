'use client'
import dynamic from 'next/dynamic'

const LandingDemo = dynamic(
  () => import('./LandingDemo').then(m => m.LandingDemo),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-lg mx-auto h-72 bg-slate-800 rounded-2xl animate-pulse" />
    ),
  },
)

export function LandingDemoWrapper() {
  return <LandingDemo />
}
