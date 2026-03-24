'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import {
  Mic, MicOff, Wand2, Plus, Trash2, ArrowLeft,
  AlertTriangle, Hammer, ChevronDown, ChevronUp,
  Check, Copy, Send, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  category: 'labour' | 'materials' | 'other'
}

interface Customer {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
}

interface JobWizardProps {
  contractorId: string
  tradeType: string
  defaultDepositPct: number
  defaultPaymentDays: number
  taxRegistered: boolean
  taxRate: number
  currency: string
  initialCustomerId?: string
}

const UNITS = ['hr', 'day', 'item', 'm²', 'm', 'kg', 'sheet', 'bag', 'litre']

const TRADE_HINTS: Record<string, string> = {
  electrician: 'Consumer unit swap at 26 Elm St. Old wylex, 18 circuits, 18th ed cert. About 1.5 days, all supplies included.',
  plumber: 'Bathroom refit at 12 Church Lane. New suite from client. Remove old, install new. Re-run soil pipe. Day and a half labour.',
  roofer: 'Re-felt garage roof at 45 Park Ave. Strip existing felt, new breathable membrane. About 40m². Half day including skip.',
  painter: 'Redecorate living room and hallway. 2 coats, client supplying paint. Prep, fill, sand. 3 days.',
  'gas-engineer': 'Boiler service at 22 Mill Rd. Worcester Bosch combi, 5 years old. Gas safety cert for landlord.',
  default: 'Describe the job — what, where, how long, what materials…',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Job', 'Price', 'Send']
  return (
    <div className="flex items-center justify-center gap-0 px-6">
      {labels.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center">
            <div className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all',
              done  && 'bg-green-500 text-white',
              active && 'bg-orange-500 text-white',
              !done && !active && 'bg-gray-200 text-gray-400',
            )}>
              {done ? <Check size={12} strokeWidth={3} /> : step}
            </div>
            <span className={cn(
              'ml-1.5 text-xs font-medium',
              active ? 'text-gray-900' : 'text-gray-400',
            )}>{label}</span>
            {i < labels.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-2',
                done ? 'bg-green-400' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function JobWizard({
  tradeType,
  defaultDepositPct,
  defaultPaymentDays,
  taxRegistered,
  taxRate,
  currency,
  initialCustomerId,
}: JobWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [jobId, setJobId] = useState<string | null>(null)

  // ─ Step 1: Job details ─────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [jobTitle, setJobTitle] = useState('')
  const [creating, setCreating] = useState(false)

  // ─ Step 2: Pricing ─────────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStage, setGenStage] = useState(0) // 0-3
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [notIncluded, setNotIncluded] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [depositPct, setDepositPct] = useState(defaultDepositPct)
  const [paymentDays, setPaymentDays] = useState(defaultPaymentDays)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ─ Step 3: Send ────────────────────────────────────────────────────────────
  const [quoteToken, setQuoteToken] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  // Totals
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = taxRegistered ? subtotal * (taxRate / 100) : 0
  const total = subtotal + taxAmount
  const sym = currency === 'GBP' ? '£' : '$'

  // Load initial customer
  useEffect(() => {
    if (!initialCustomerId) return
    fetch(`/api/customers/${initialCustomerId}`)
      .then(r => r.json())
      .then(d => d.customer && setSelectedCustomer(d.customer))
  }, [initialCustomerId])

  // Customer search debounce
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerSearch)}`)
        .then(r => r.json())
        .then(d => setCustomers(d.customers ?? []))
    }, 280)
    return () => clearTimeout(t)
  }, [customerSearch])

  const go = useCallback((to: 1 | 2 | 3) => {
    setDirection(to > step ? 'forward' : 'back')
    setStep(to)
  }, [step])

  // ─── Step 1: create job ────────────────────────────────────────────────────
  async function handleCreateJob() {
    if (!jobTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          title: jobTitle,
          paymentTermsDays: paymentDays,
          depositPct: String(depositPct),
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Failed to create job'); return }
      setJobId(data.job.id)
      go(2)
    } finally {
      setCreating(false)
    }
  }

  // ─── Step 2: AI generate ──────────────────────────────────────────────────
  const GEN_STAGES = ['Reading your notes…', 'Breaking down items…', 'Setting prices…', 'Almost done…']

  async function handleGenerate() {
    if (!transcript.trim() || !jobId) return
    setIsGenerating(true)
    setGenStage(0)

    const interval = setInterval(() => {
      setGenStage(s => Math.min(s + 1, GEN_STAGES.length - 1))
    }, 700)

    try {
      const res = await fetch(`/api/jobs/${jobId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) { alert(data.error ?? 'Generation failed'); return }

      const jobRes = await fetch(`/api/jobs/${jobId}`)
      const jobData = await jobRes.json()
      if (jobData.job?.lineItems) {
        setLineItems(jobData.job.lineItems.map((i: any) => ({
          id: i.id,
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          unitPrice: parseFloat(i.unitPrice),
          total: parseFloat(i.total),
          category: i.category,
        })))
        if (data.generated?.jobTitle) setJobTitle(data.generated.jobTitle)
        setNotIncluded(data.generated?.notIncluded ?? '')
        setWarnings(data.generated?.warnings ?? [])
      }
    } finally {
      clearInterval(interval)
      setIsGenerating(false)
      setGenStage(0)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mr.start()
      setIsRecording(true)
      navigator.vibrate?.(80)
    } catch {
      alert('Microphone access denied. Please type instead.')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setIsRecording(false)
    navigator.vibrate?.([80, 40, 80])
  }

  function updateItem(id: string, field: keyof LineItem, val: any) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const u = { ...item, [field]: val }
      if (field === 'quantity' || field === 'unitPrice') u.total = u.quantity * u.unitPrice
      return u
    }))
  }

  function addItem() {
    setLineItems(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      description: '',
      quantity: 1,
      unit: 'item',
      unitPrice: 0,
      total: 0,
      category: 'labour',
    }])
  }

  // ─── Step 3: Send ─────────────────────────────────────────────────────────
  async function handleGoToSend() {
    if (!jobId) return
    // Fetch quote token
    const res = await fetch(`/api/jobs/${jobId}`)
    const data = await res.json()
    setQuoteToken(data.job?.quoteToken ?? null)
    go(3)
  }

  async function handleSend() {
    if (!jobId) return
    setSending(true)
    try {
      await fetch(`/api/jobs/${jobId}/send-price`, { method: 'POST' })
      const res = await fetch(`/api/jobs/${jobId}`)
      const data = await res.json()
      const token = data.job?.quoteToken
      if (token) {
        const url = `${window.location.origin}/q/${token}`
        if (navigator.share) {
          await navigator.share({ title: 'Your quote', url }).catch(() => {})
        } else {
          await navigator.clipboard.writeText(url)
        }
        setSent(true)
        navigator.vibrate?.([100, 50, 200])
        setTimeout(() => router.push(`/jobs/${jobId}`), 1200)
      }
    } finally {
      setSending(false)
    }
  }

  async function handleCopy() {
    if (!jobId) return
    const res = await fetch(`/api/jobs/${jobId}`)
    const data = await res.json()
    const token = data.job?.quoteToken
    if (token) {
      await navigator.clipboard.writeText(`${window.location.origin}/q/${token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const animClass = direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-14">
          {step > 1 ? (
            <button
              onClick={() => go((step - 1) as 1 | 2 | 3)}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X size={22} />
            </button>
          )}
          <Steps current={step} />
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-32">

          {/* ── SCREEN 1: Job Details ───────────────────────────────────── */}
          {step === 1 && (
            <div key="s1" className={animClass}>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">New Job</h1>
              <p className="text-sm text-gray-500 mb-6">Who's it for, and what's the job?</p>

              {/* Customer */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      {selectedCustomer.phone && <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>}
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search customers…"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />
                    {customers.length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 shadow-sm">
                        {customers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
                            style={{ minHeight: 56 }}
                          >
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-bold shrink-0">
                              {c.firstName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                              {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowNewCustomer(v => !v)}
                      className="flex items-center gap-1.5 text-sm text-orange-500 font-medium py-1"
                    >
                      <Plus size={14} />
                      New customer
                    </button>
                    {showNewCustomer && (
                      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pop-in">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={newCust.firstName}
                            onChange={e => setNewCust(p => ({ ...p, firstName: e.target.value }))}
                            placeholder="First name *"
                            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={newCust.lastName}
                            onChange={e => setNewCust(p => ({ ...p, lastName: e.target.value }))}
                            placeholder="Last name"
                            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <input
                          type="tel"
                          value={newCust.phone}
                          onChange={e => setNewCust(p => ({ ...p, phone: e.target.value }))}
                          placeholder="Phone"
                          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <input
                          type="email"
                          value={newCust.email}
                          onChange={e => setNewCust(p => ({ ...p, email: e.target.value }))}
                          placeholder="Email (for invoice delivery)"
                          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <button
                          onClick={async () => {
                            if (!newCust.firstName) return
                            const res = await fetch('/api/customers', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newCust),
                            })
                            const data = await res.json()
                            if (data.customer) {
                              setSelectedCustomer(data.customer)
                              setShowNewCustomer(false)
                              setNewCust({ firstName: '', lastName: '', phone: '', email: '' })
                            }
                          }}
                          disabled={!newCust.firstName}
                          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-40"
                          style={{ minHeight: 48 }}
                        >
                          Save customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Job title */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Kitchen rewire — 14 Oak St"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && jobTitle.trim() && handleCreateJob()}
                />
              </div>

              <button
                onClick={handleCreateJob}
                disabled={!jobTitle.trim() || creating}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 active:bg-orange-600 text-white rounded-2xl font-bold text-lg disabled:opacity-40 transition-all active:scale-[0.98]"
                style={{ minHeight: 60 }}
              >
                {creating ? (
                  <span className="animate-pulse">Creating…</span>
                ) : (
                  <>Next: Price it</>
                )}
              </button>

              {!selectedCustomer && (
                <p className="text-center text-xs text-gray-400 mt-3">No customer yet? That's fine — add one later.</p>
              )}
            </div>
          )}

          {/* ── SCREEN 2: Price ─────────────────────────────────────────── */}
          {step === 2 && (
            <div key="s2" className={animClass}>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Price it</h1>
              <p className="text-sm text-gray-500 mb-5">Describe the job and we'll build the quote.</p>

              {/* Voice + text */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
                <div className="flex gap-3 mb-3">
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0',
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse-ring'
                        : 'bg-orange-100 text-orange-600 active:bg-orange-200',
                    )}
                    style={{ minHeight: 44 }}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                    {isRecording ? 'Release' : 'Hold'}
                  </button>
                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder={TRADE_HINTS[tradeType] ?? TRADE_HINTS.default}
                    rows={4}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!transcript.trim() || isGenerating}
                  className="w-full flex items-center justify-center gap-2.5 bg-orange-500 active:bg-orange-600 text-white rounded-xl font-bold disabled:opacity-40 transition-all"
                  style={{ minHeight: 52 }}
                >
                  {isGenerating ? (
                    <>
                      <span className={cn('text-xl', isGenerating && 'animate-hammer')}>🔨</span>
                      <span>{GEN_STAGES[genStage]}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Generate Quote
                    </>
                  )}
                </button>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Line items */}
              {lineItems.length > 0 && (
                <div className="space-y-2 mb-4 animate-float-up">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price breakdown</p>
                  {lineItems.map(item => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      sym={sym}
                      units={UNITS}
                      onChange={(field, val) => updateItem(item.id, field, val)}
                      onRemove={() => setLineItems(prev => prev.filter(i => i.id !== item.id))}
                    />
                  ))}
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-sm text-orange-500 font-medium py-1"
                  >
                    <Plus size={14} />
                    Add line
                  </button>
                </div>
              )}

              {lineItems.length === 0 && (
                <button
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 font-medium mb-4 active:bg-gray-50"
                >
                  <Plus size={16} />
                  Add items manually instead
                </button>
              )}

              {/* Not included */}
              {lineItems.length > 0 && (
                <div className="mb-4">
                  <textarea
                    value={notIncluded}
                    onChange={e => setNotIncluded(e.target.value)}
                    placeholder="Not included (scope protection)…"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-white"
                  />
                </div>
              )}

              {/* Total */}
              {lineItems.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black text-orange-500 tabular-nums">
                    {sym}{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Options collapse */}
              <button
                onClick={() => setShowOptions(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-3 py-1"
              >
                {showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Payment terms & deposit
              </button>
              {showOptions && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-4 animate-pop-in">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Payment terms</p>
                    <div className="flex gap-2">
                      {[7, 14, 30].map(d => (
                        <button
                          key={d}
                          onClick={() => setPaymentDays(d)}
                          className={cn(
                            'flex-1 py-2.5 rounded-xl text-sm font-semibold',
                            paymentDays === d ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600',
                          )}
                        >{d}d</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      Deposit: {depositPct === 0 ? 'None' : `${depositPct}% = ${sym}${((total * depositPct) / 100).toFixed(2)}`}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDepositPct(0)}
                        className={cn('px-3 py-2 rounded-lg text-xs font-semibold', depositPct === 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600')}
                      >Off</button>
                      <input
                        type="range" min={10} max={50} step={5}
                        value={depositPct || 25}
                        disabled={depositPct === 0}
                        onChange={e => setDepositPct(parseInt(e.target.value))}
                        className="flex-1 accent-orange-500"
                      />
                      <button
                        onClick={() => setDepositPct(25)}
                        className={cn('px-3 py-2 rounded-lg text-xs font-semibold', depositPct > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600')}
                      >On</button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGoToSend}
                disabled={lineItems.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 active:bg-orange-600 text-white rounded-2xl font-bold text-lg disabled:opacity-40 transition-all active:scale-[0.98]"
                style={{ minHeight: 60 }}
              >
                Review & Send →
              </button>
            </div>
          )}

          {/* ── SCREEN 3: Send ───────────────────────────────────────────── */}
          {step === 3 && (
            <div key="s3" className={animClass}>
              {sent ? (
                <div className="flex flex-col items-center justify-center py-16 animate-pop-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                    <Check size={40} className="text-green-500" strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote sent!</h2>
                  <p className="text-gray-500 text-sm text-center">Customer can view, accept, and sign their quote.</p>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Ready to send</h1>
                  <p className="text-sm text-gray-500 mb-5">Share the quote link with your customer.</p>

                  {/* Preview card */}
                  <div className="bg-white rounded-2xl border-2 border-orange-200 p-5 mb-5 animate-pop-in">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Quote</p>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{jobTitle}</h3>
                        {selectedCustomer && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-black text-orange-500 tabular-nums">
                        {sym}{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-50">
                      {lineItems.slice(0, 4).map(item => (
                        <div key={item.id} className="flex justify-between py-1.5 text-sm text-gray-600">
                          <span className="truncate pr-4">{item.description}</span>
                          <span className="font-mono shrink-0">{sym}{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                      {lineItems.length > 4 && (
                        <p className="text-xs text-gray-400 pt-1.5">+{lineItems.length - 4} more items</p>
                      )}
                    </div>

                    {depositPct > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Deposit {depositPct}%: {sym}{((total * depositPct) / 100).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-3 bg-orange-500 active:bg-orange-600 text-white rounded-2xl font-bold text-lg disabled:opacity-60 mb-3 transition-all active:scale-[0.98]"
                    style={{ minHeight: 64 }}
                  >
                    {sending ? (
                      <span className="animate-pulse">Sending…</span>
                    ) : (
                      <>
                        <Send size={20} />
                        Send to customer
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200 active:bg-gray-50 text-gray-700 rounded-2xl font-semibold mb-3 transition-all"
                    style={{ minHeight: 52 }}
                  >
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>

                  <button
                    onClick={() => jobId && router.push(`/jobs/${jobId}`)}
                    className="w-full text-sm text-gray-400 py-3"
                  >
                    Save as draft
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item, sym, units, onChange, onRemove,
}: {
  item: LineItem
  sym: string
  units: string[]
  onChange: (field: keyof LineItem, val: any) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={item.description}
            onChange={e => onChange('description', e.target.value)}
            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-100 focus:border-orange-300 pb-1 focus:outline-none"
            placeholder="Description"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              value={item.quantity}
              onChange={e => onChange('quantity', parseFloat(e.target.value) || 0)}
              className="w-14 text-sm text-center rounded-lg border border-gray-200 px-1 py-1.5 text-base"
              min="0" step="0.5"
            />
            <select
              value={item.unit}
              onChange={e => onChange('unit', e.target.value)}
              className="text-sm rounded-lg border border-gray-200 px-2 py-1.5 text-base"
            >
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <span className="text-gray-400 text-xs">@</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
              <input
                type="number"
                value={item.unitPrice}
                onChange={e => onChange('unitPrice', parseFloat(e.target.value) || 0)}
                className="w-24 text-sm rounded-lg border border-gray-200 pl-5 pr-2 py-1.5 text-base"
                min="0" step="0.5"
              />
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold font-mono text-gray-900">{sym}{item.total.toFixed(2)}</p>
          <button
            onClick={onRemove}
            className="text-gray-300 active:text-red-500 mt-1 p-1 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
