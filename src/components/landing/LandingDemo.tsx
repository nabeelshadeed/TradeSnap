'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Zap, CheckCircle2 } from 'lucide-react'

const PLACEHOLDERS = [
  'Install 3 double sockets in kitchen',
  'Fix leaking bathroom tap',
  'Replace boiler in semi-detached',
  'Paint 2 bedroom walls and ceiling',
  'Lay laminate flooring in lounge',
]

type QuoteResult = {
  items: { label: string; amount: number }[]
  subtotal: number
  deposit: number
  depositPct: number
  total: number
}

function buildQuote(description: string): QuoteResult {
  const lower = description.toLowerCase()
  const items: { label: string; amount: number }[] = []

  // Labour + materials based on keywords
  if (lower.includes('rewire') || lower.includes('re-wire')) {
    items.push({ label: 'Labour — full rewire (3 days)', amount: 1800 })
    items.push({ label: 'Materials — cable, CU, accessories', amount: 650 })
    items.push({ label: 'Testing & certification', amount: 150 })
  } else if (lower.includes('boiler')) {
    items.push({ label: 'Labour — boiler removal & fit', amount: 350 })
    items.push({ label: 'Boiler unit + flue kit', amount: 1250 })
    items.push({ label: 'Controls & thermostat', amount: 180 })
  } else if (lower.includes('bathroom') && (lower.includes('fit') || lower.includes('install') || lower.includes('suite'))) {
    items.push({ label: 'Labour — full bathroom fit (4 days)', amount: 1200 })
    items.push({ label: 'Sanitaryware supply', amount: 850 })
    items.push({ label: 'Tiling (per spec)', amount: 480 })
    items.push({ label: 'Plumbing materials', amount: 220 })
  } else if (lower.includes('socket') || lower.includes('plug') || lower.includes('outlet')) {
    const n = parseInt(lower.match(/(\d+)\s*(double|single)?\s*(socket|plug|outlet)/)?.[1] ?? '2')
    const count = Math.min(Math.max(n, 1), 10)
    items.push({ label: `Labour — ${count} socket${count > 1 ? 's' : ''} (${count} hr${count > 1 ? 's' : ''})`, amount: count * 45 })
    items.push({ label: `Materials — ${count}× double socket + back box`, amount: count * 14 })
  } else if (lower.includes('tap') || lower.includes('drip') || lower.includes('leak')) {
    items.push({ label: 'Labour — tap replacement (1.5 hrs)', amount: 90 })
    items.push({ label: 'Tap supply', amount: 55 })
    items.push({ label: 'Fittings & sealant', amount: 12 })
  } else if (lower.includes('paint') || lower.includes('decor') || lower.includes('redecor')) {
    const rooms = parseInt(lower.match(/(\d+)\s*(bedroom|room|wall)/)?.[1] ?? '2')
    const r = Math.min(Math.max(rooms, 1), 6)
    items.push({ label: `Labour — ${r} room${r > 1 ? 's' : ''} (${r * 0.5} days)`, amount: r * 160 })
    items.push({ label: 'Paint & primer (trade quality)', amount: r * 45 })
    items.push({ label: 'Prep materials', amount: 25 })
  } else if (lower.includes('tile') || lower.includes('tiling') || lower.includes('floor')) {
    items.push({ label: 'Labour — floor tiling (2 days)', amount: 480 })
    items.push({ label: 'Tiles supply (per spec)', amount: 320 })
    items.push({ label: 'Adhesive, grout & trim', amount: 85 })
  } else if (lower.includes('roof') || lower.includes('felt') || lower.includes('slate') || lower.includes('gutter')) {
    items.push({ label: 'Labour — roofing works (2 days)', amount: 900 })
    items.push({ label: 'Materials — felt/slates/fixings', amount: 680 })
    items.push({ label: 'Scaffold hire (half day)', amount: 180 })
  } else if (lower.includes('fence') || lower.includes('gate') || lower.includes('panel')) {
    items.push({ label: 'Labour — fence installation (1 day)', amount: 280 })
    items.push({ label: 'Panels, posts & gravel boards', amount: 320 })
    items.push({ label: 'Concrete & fixings', amount: 45 })
  } else if (lower.includes('driveway') || lower.includes('patio') || lower.includes('block pav')) {
    items.push({ label: 'Labour — excavation & laying (3 days)', amount: 1100 })
    items.push({ label: 'Block paving / slabs', amount: 980 })
    items.push({ label: 'Sub-base materials & skip', amount: 320 })
  } else {
    // Generic fallback — produce a plausible looking result
    const words = description.trim().split(/\s+/).length
    const hrs = Math.max(1, Math.min(words, 6))
    items.push({ label: `Labour (${hrs} hr${hrs > 1 ? 's' : ''} @ £55/hr)`, amount: hrs * 55 })
    items.push({ label: 'Materials & consumables', amount: Math.round(hrs * 38) })
  }

  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const depositPct = 25
  const deposit = Math.round(subtotal * (depositPct / 100))

  return { items, subtotal, deposit, depositPct, total: subtotal }
}

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function LandingDemo() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<'idle' | 'generating' | 'done'>('idle')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cycle placeholder text
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length
      setPlaceholder(PLACEHOLDERS[i])
    }, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!input.trim() || input.trim().length < 8) {
      setState('idle')
      setQuote(null)
      return
    }
    setState('generating')
    timerRef.current = setTimeout(() => {
      setQuote(buildQuote(input))
      setState('done')
    }, 900)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [input])

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Input card */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-slate-500 font-mono">snaptrade — quick quote</span>
        </div>

        {/* Input */}
        <div className="px-4 pt-4 pb-3">
          <label className="block text-xs text-slate-500 font-mono mb-2">describe the job →</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm font-medium resize-none outline-none border border-slate-700 focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Output */}
        <div className="px-4 pb-4 min-h-[160px]">
          {state === 'idle' && (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm font-mono">
              → type a job above to generate a quote
            </div>
          )}

          {state === 'generating' && (
            <div className="flex items-center gap-3 h-32 text-orange-400 text-sm font-mono">
              <Loader2 className="animate-spin" size={16} />
              <span>generating quote...</span>
            </div>
          )}

          {state === 'done' && quote && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green-400 text-xs font-mono mb-3">
                <CheckCircle2 size={13} />
                <span>generated — ready to send</span>
              </div>

              {/* Line items */}
              <div className="space-y-1.5 mb-3">
                {quote.items.map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-slate-400 truncate pr-4">{item.label}</span>
                    <span className="text-white font-mono shrink-0">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-2 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-mono">{fmt(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-400">Deposit ({quote.depositPct}%)</span>
                  <span className="text-orange-400 font-mono font-bold">{fmt(quote.deposit)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white font-mono">{fmt(quote.total)}</span>
                </div>
              </div>

              <div className="pt-3">
                <div className="w-full bg-orange-500 text-white text-center py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-orange-600 transition-colors">
                  Send to client →
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        <Zap size={10} className="inline mr-1 text-orange-400" />
        Live demo — try typing any job description
      </p>
    </div>
  )
}
