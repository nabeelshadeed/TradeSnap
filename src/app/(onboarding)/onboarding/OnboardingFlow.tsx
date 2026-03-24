'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const TRADES = [
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'roofer', label: 'Roofer', icon: '🏠' },
  { value: 'hvac', label: 'HVAC', icon: '❄️' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'tiler', label: 'Tiler', icon: '🔲' },
  { value: 'landscaper', label: 'Landscaper', icon: '🌿' },
  { value: 'carpenter', label: 'Carpenter', icon: '🪵' },
  { value: 'gas-engineer', label: 'Gas Engineer', icon: '🔥' },
  { value: 'general-builder', label: 'Builder', icon: '🏗️' },
  { value: 'other', label: 'Other', icon: '🛠️' },
]

const TEAM_SIZES = [
  { value: 'solo', label: 'Just me', icon: '👤' },
  { value: '2-5', label: '2-5 people', icon: '👥' },
  { value: '6+', label: '6+ people', icon: '👨‍👩‍👧‍👦' },
]

const PROBLEMS = [
  { value: 'late-payments', label: 'Getting paid late', icon: '💸' },
  { value: 'quoting-slow', label: 'Quoting takes too long', icon: '📝' },
  { value: 'chasing-awkward', label: "Chasing payments is awkward", icon: '😤' },
  { value: 'forgetting-invoice', label: 'Forgetting to invoice', icon: '🧾' },
  { value: 'dont-know-owed', label: "I never know what I'm owed", icon: '📊' },
]

const TRADE_AVG_VALUES: Record<string, number> = {
  electrician: 800, plumber: 600, roofer: 2500, hvac: 1200, painter: 900,
  tiler: 700, landscaper: 1500, carpenter: 800, 'gas-engineer': 600, 'general-builder': 1500, other: 500,
}

interface OnboardingFlowProps {
  contractorId: string
  firstName: string
}

export function OnboardingFlow({ contractorId, firstName }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    tradeType: '',
    teamSize: '',
    avgJobValue: 800,
    biggestProblem: '',
    businessName: '',
    paymentDays: 14,
    depositPct: 25,
    taxRegistered: false,
  })
  const [saving, setSaving] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const setField = (key: string, value: any) => setData(prev => ({ ...prev, [key]: value }))

  const selectTrade = (value: string) => {
    setField('tradeType', value)
    setField('avgJobValue', TRADE_AVG_VALUES[value] ?? 800)
    setTimeout(() => setStep(2), 300)
  }

  const selectTeam = (value: string) => {
    setField('teamSize', value)
    setTimeout(() => setStep(3), 300)
  }

  const selectProblem = (value: string) => {
    setField('biggestProblem', value)
    setTimeout(() => setStep(4), 300)
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setStep(5)
      setShowConfetti(true)
      // Dynamic import to avoid SSR issues
      import('canvas-confetti').then(module => {
        const confetti = module.default
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Progress dots */}
      {step < 5 && (
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                s <= step ? 'bg-orange-500 w-6' : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      )}

      {/* STEP 1: Trade selection */}
      {step === 1 && (
        <div className="w-full max-w-lg animate-fade-in">
          <h1 className="text-3xl font-black text-gray-900 text-center mb-2">What&apos;s your trade?</h1>
          <p className="text-gray-500 text-center mb-8">We&apos;ll customise everything for you</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {TRADES.map(trade => (
              <button
                key={trade.value}
                onClick={() => selectTrade(trade.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95',
                  data.tradeType === trade.value
                    ? 'border-orange-500 bg-orange-50 scale-105'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                )}
              >
                <span className="text-3xl">{trade.icon}</span>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{trade.label}</span>
                {data.tradeType === trade.value && (
                  <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Team size + job value */}
      {step === 2 && (
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-3xl font-black text-gray-900 text-center mb-2">Just you, or a team?</h1>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {TEAM_SIZES.map(size => (
              <button
                key={size.value}
                onClick={() => selectTeam(size.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95',
                  data.teamSize === size.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                )}
              >
                <span className="text-3xl">{size.icon}</span>
                <span className="text-sm font-semibold text-gray-700">{size.label}</span>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">What&apos;s your average job value?</p>
            <div className="text-center mb-4">
              <span className="text-4xl font-black text-orange-500">£{data.avgJobValue.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={50}
              max={10000}
              step={50}
              value={data.avgJobValue}
              onChange={e => setField('avgJobValue', parseInt(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>£50</span>
              <span>£10,000</span>
            </div>
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full mt-4 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* STEP 3: Biggest problem */}
      {step === 3 && (
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-3xl font-black text-gray-900 text-center mb-2">What&apos;s your biggest headache?</h1>
          <p className="text-gray-500 text-center mb-8">We&apos;ll prioritise this for you</p>
          <div className="space-y-3">
            {PROBLEMS.map(prob => (
              <button
                key={prob.value}
                onClick={() => selectProblem(prob.value)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-95 text-left',
                  data.biggestProblem === prob.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                )}
              >
                <span className="text-2xl">{prob.icon}</span>
                <span className="text-base font-semibold text-gray-800">{prob.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Setup preview */}
      {step === 4 && (
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-3xl font-black text-gray-900 text-center mb-2">Set up your first price</h1>
          <p className="text-gray-500 text-center mb-6">Here&apos;s what your customers will see</p>

          {/* Live preview card */}
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-5 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                {firstName[0]}
              </div>
              <div>
                <p className="font-bold text-gray-900">{firstName}&apos;s {data.tradeType} Services</p>
                <p className="text-xs text-gray-400">Professional {data.tradeType}</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">QUOTATION · QT-0001</p>
            <p className="text-sm font-semibold text-gray-900 mb-3">Example job at 12 Oak Street</p>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <div className="flex justify-between">
                <span>{data.tradeType} Labour (8hrs)</span>
                <span className="font-mono">£{(8 * (TRADE_AVG_VALUES[data.tradeType] / 10)).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials</span>
                <span className="font-mono">£{Math.round(data.avgJobValue * 0.2)}</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-lg font-black text-orange-500">
                <span>TOTAL</span>
                <span>£{data.avgJobValue.toLocaleString()}</span>
              </div>
              {data.depositPct > 0 && (
                <p className="text-xs text-gray-500 mt-1">Deposit: £{Math.round(data.avgJobValue * data.depositPct / 100)} ({data.depositPct}%)</p>
              )}
            </div>
          </div>

          {/* Config options */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Payment terms</p>
                <p className="text-xs text-gray-500">Invoice due within</p>
              </div>
              <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setField('paymentDays', d)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium',
                      data.paymentDays === d ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                    )}
                  >{d}d</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Deposit</p>
                <p className="text-xs text-gray-500">{data.depositPct}% upfront</p>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={data.depositPct}
                onChange={e => setField('depositPct', parseInt(e.target.value))}
                className="w-24 accent-orange-500"
              />
            </div>
          </div>

          <button
            onClick={completeOnboarding}
            disabled={saving}
            className="w-full mt-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-2xl font-bold text-lg transition-colors"
          >
            {saving ? 'Setting up...' : 'This looks good →'}
          </button>
        </div>
      )}

      {/* STEP 5: Done */}
      {step === 5 && (
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">You&apos;re ready, {firstName}!</h1>
          <p className="text-gray-500 mb-8">Your account is set up. Time to send your first price.</p>

          {/* Setup checklist */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-3">Getting started</p>
            <div className="space-y-2">
              {[
                { label: 'Trade set up', done: true },
                { label: 'Business configured', done: true },
                { label: 'Add your logo', done: false },
                { label: 'Send first price', done: false },
                { label: 'Get first payment', done: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                    item.done ? 'bg-green-500 text-white' : 'border-2 border-gray-200'
                  )}>
                    {item.done && '✓'}
                  </div>
                  <span className={cn('text-sm', item.done ? 'text-gray-400 line-through' : 'text-gray-700')}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/jobs/new')}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-xl transition-colors mb-3"
          >
            Send your first price →
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Explore on my own
          </button>
        </div>
      )}
    </div>
  )
}
