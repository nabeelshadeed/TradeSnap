'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import {
  ArrowLeft, Send, FileText, Copy, Check, Edit2,
  Phone, X, Pencil, Files,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  total: string
  category: string
}

interface Job {
  id: string
  title: string
  status: string
  total: string
  subtotal: string
  taxAmount: string
  balanceDue: string
  amountPaid: string
  referenceNumber: string | null
  invoiceNumber: string | null
  quoteToken: string | null
  invoiceToken: string | null
  quoteSentAt: string | null
  quoteViewedAt: string | null
  quoteViewedCount: number
  quoteSignedAt: string | null
  signerName: string | null
  invoiceSentAt: string | null
  invoiceViewedAt: string | null
  dueDateAt: string | null
  paidAt: string | null
  customerSignatureDataUrl: string | null
  notIncluded: string | null
  lineItems: LineItem[]
  payments: { id: string; amount: string; type: string; method: string; paidAt: string }[]
  customer: { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null } | null
}

interface Props {
  job: Job
  currency: string
  country: 'UK' | 'US'
  taxLabel: string
  taxRate: number
}

// ─── Invoice Status Tracker ───────────────────────────────────────────────────

function InvoiceStatusTracker({ sentAt, viewedAt, paidAt }: {
  sentAt: string
  viewedAt: string | null
  paidAt: string | null
}) {
  const steps = [
    { label: 'Sent', done: !!sentAt, at: sentAt },
    { label: 'Viewed', done: !!viewedAt, at: viewedAt },
    { label: 'Paid', done: !!paidAt, at: paidAt },
  ]
  const activeIdx = paidAt ? 2 : viewedAt ? 1 : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Invoice status</p>
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                step.done ? 'bg-green-500 text-white' : i === activeIdx + 1 ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-300',
              )}>
                {step.done ? <Check size={13} strokeWidth={3} /> : <span>{i + 1}</span>}
              </div>
              <p className={cn(
                'text-xs mt-1 font-medium',
                step.done ? 'text-green-600' : 'text-gray-400',
              )}>{step.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-1 mb-4',
                steps[i + 1].done ? 'bg-green-300' : 'bg-gray-100',
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Action config ────────────────────────────────────────────────────────────

type ActionKey = 'send_quote' | 'resend_quote' | 'send_invoice' | 'share_payment' | 'paid'

function getAction(job: Job): ActionKey | null {
  const s = job.status
  if (s === 'draft') return 'send_quote'
  if (s === 'sent' || s === 'viewed') return job.invoiceSentAt ? 'share_payment' : 'send_invoice'
  if (s === 'accepted' || s === 'completed') return 'send_invoice'
  if (s === 'invoiced' || s === 'part_paid' || s === 'overdue') return 'share_payment'
  if (s === 'paid') return 'paid'
  return null
}

const ACTION_LABELS: Record<ActionKey, { label: string; icon: any; colour: string }> = {
  send_quote:    { label: 'Send Quote',        icon: Send,     colour: 'bg-orange-500 active:bg-orange-600' },
  resend_quote:  { label: 'Resend Quote',      icon: Send,     colour: 'bg-orange-500 active:bg-orange-600' },
  send_invoice:  { label: 'Send Invoice',      icon: FileText, colour: 'bg-orange-500 active:bg-orange-600' },
  share_payment: { label: 'Share Payment Link',icon: Send,     colour: 'bg-green-600 active:bg-green-700' },
  paid:          { label: '✓ Paid',            icon: Check,    colour: 'bg-green-500 cursor-default' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobDetailClient({ job: initialJob, currency, country, taxLabel, taxRate }: Props) {
  const router = useRouter()
  const [job, setJob] = useState(initialJob)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionDone, setActionDone] = useState(false)

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(job.title)
  const [editingItem, setEditingItem] = useState<string | null>(null)

  const sym = currency === 'GBP' ? '£' : '$'
  const isOverdue = job.dueDateAt && new Date(job.dueDateAt) < new Date()
  const customerName = job.customer
    ? `${job.customer.firstName} ${job.customer.lastName ?? ''}`.trim()
    : 'No customer'

  const action = getAction(job)
  const actionCfg = action ? ACTION_LABELS[action] : null
  const canRemind = (job.status === 'invoiced' || job.status === 'part_paid' || job.status === 'overdue') && !!job.customer?.email
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  // ─── Reminder ──────────────────────────────────────────────────────────────
  async function sendReminder() {
    if (reminding) return
    setReminding(true)
    try {
      await fetch(`/api/jobs/${job.id}/remind`, { method: 'POST' })
      setReminded(true)
      setTimeout(() => setReminded(false), 3000)
    } finally {
      setReminding(false)
    }
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────────
  async function duplicate() {
    if (duplicating) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) router.push(`/jobs/${data.job.id}`)
    } finally {
      setDuplicating(false)
    }
  }

  // ─── Title edit ────────────────────────────────────────────────────────────
  async function saveTitle() {
    if (titleDraft.trim() === job.title) { setEditingTitle(false); return }
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft.trim() }),
    })
    setJob(j => ({ ...j, title: titleDraft.trim() }))
    setEditingTitle(false)
  }

  // ─── Primary action ────────────────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (!action || action === 'paid' || loading) return
    setLoading(true)
    try {
      if (action === 'send_quote' || action === 'resend_quote') {
        await fetch(`/api/jobs/${job.id}/send-price`, { method: 'POST' })
        const res = await fetch(`/api/jobs/${job.id}`)
        const data = await res.json()
        const token = data.job?.quoteToken
        if (token) {
          const url = `${window.location.origin}/q/${token}`
          if (navigator.share) {
            await navigator.share({ title: 'Your quote', url }).catch(() => {})
          } else {
            await navigator.clipboard.writeText(url)
          }
          setJob(j => ({ ...j, status: 'sent', quoteToken: token, quoteSentAt: new Date().toISOString() }))
          setActionDone(true)
          navigator.vibrate?.([100, 50, 200])
        }
      } else if (action === 'send_invoice') {
        const res = await fetch(`/api/jobs/${job.id}/send-invoice`, { method: 'POST' })
        const data = await res.json()
        if (res.ok) {
          setJob(j => ({
            ...j,
            status: 'invoiced',
            invoiceNumber: data.invoiceNumber,
            invoiceToken: data.invoiceToken,
            invoiceSentAt: new Date().toISOString(),
          }))
          setActionDone(true)
          navigator.vibrate?.([100, 50, 200])
        }
      } else if (action === 'share_payment') {
        const token = job.invoiceToken
        if (token) {
          const url = `${window.location.origin}/pay/${token}`
          if (navigator.share) {
            await navigator.share({ title: 'Pay your invoice', url }).catch(() => {})
          } else {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }, [action, job.id, job.invoiceToken, loading])

  // ─── Copy link ─────────────────────────────────────────────────────────────
  async function copyLink() {
    const token = job.invoiceToken ?? job.quoteToken
    if (!token) return
    const base = job.invoiceToken ? '/pay/' : '/q/'
    await navigator.clipboard.writeText(`${window.location.origin}${base}${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/jobs" className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="flex-1 text-sm font-semibold bg-transparent border-b border-orange-400 focus:outline-none"
              />
              <button onClick={saveTitle} className="text-green-500 shrink-0"><Check size={16} /></button>
              <button onClick={() => setEditingTitle(false)} className="text-gray-400 shrink-0"><X size={16} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setTitleDraft(job.title); setEditingTitle(true) }}
              className="flex items-center gap-1.5 min-w-0 group"
            >
              <span className="text-sm font-semibold text-gray-900 truncate">{job.title}</span>
              <Pencil size={12} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
            </button>
          )}
          <p className="text-xs text-gray-400 truncate">{customerName}</p>
        </div>
        <Badge status={job.status} size="sm" />
      </header>

      <div className="flex-1 px-4 py-5 space-y-3 max-w-lg mx-auto w-full pb-36">

        {/* Money summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {sym}{parseFloat(job.total || '0').toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Paid</p>
            <p className="text-lg font-bold text-green-600 tabular-nums">
              {sym}{parseFloat(job.amountPaid || '0').toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">
              {isOverdue ? <span className="text-red-500 font-semibold">Overdue</span> : 'Balance'}
            </p>
            <p className={cn('text-lg font-bold tabular-nums', isOverdue ? 'text-red-500' : 'text-gray-900')}>
              {sym}{parseFloat(job.balanceDue || '0').toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Invoice status tracker */}
        {job.invoiceSentAt && (
          <InvoiceStatusTracker
            sentAt={job.invoiceSentAt}
            viewedAt={job.invoiceViewedAt}
            paidAt={job.paidAt}
          />
        )}

        {/* Action done confirmation */}
        {actionDone && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 animate-pop-in">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <Check size={16} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {action === 'send_quote' ? 'Quote sent!' : action === 'send_invoice' ? 'Invoice sent!' : 'Shared!'}
              </p>
              <p className="text-xs text-green-600">Customer will receive it shortly.</p>
            </div>
            <button onClick={() => setActionDone(false)} className="ml-auto text-green-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Line items (editable) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Price breakdown</h3>
            <Link href={`/jobs/${job.id}/edit`} className="flex items-center gap-1 text-xs text-orange-500 font-medium">
              <Edit2 size={12} />
              Edit
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {job.lineItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.description}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} × {item.unit} @ {sym}{parseFloat(item.unitPrice).toFixed(2)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 tabular-nums ml-4">
                  {sym}{parseFloat(item.total).toFixed(2)}
                </p>
              </div>
            ))}
            {job.lineItems.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No items yet</p>
                <Link href={`/jobs/${job.id}/edit`} className="text-sm text-orange-500 font-medium mt-1 block">
                  Add items →
                </Link>
              </div>
            )}
          </div>
          {/* Totals */}
          {job.lineItems.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-1">
              {parseFloat(job.taxAmount || '0') > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>{sym}{parseFloat(job.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{taxLabel} ({taxRate}%)</span>
                    <span>{sym}{parseFloat(job.taxAmount).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{sym}{parseFloat(job.total).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Not included */}
        {job.notIncluded && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Not included</p>
            <p className="text-sm text-amber-800">{job.notIncluded}</p>
          </div>
        )}

        {/* Customer signature */}
        {job.customerSignatureDataUrl && (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer signature</p>
            <img
              src={job.customerSignatureDataUrl}
              alt="Customer signature"
              className="max-h-16 w-auto object-contain"
            />
            {job.signerName && (
              <p className="text-xs text-gray-500 mt-1">{job.signerName} · {job.quoteSignedAt ? formatDate(job.quoteSignedAt, 'short') : ''}</p>
            )}
          </div>
        )}

        {/* Customer */}
        {job.customer && (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{customerName}</p>
              {job.customer.email && <p className="text-xs text-gray-400">{job.customer.email}</p>}
            </div>
            {job.customer.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold"
                style={{ minHeight: 40 }}
              >
                <Phone size={14} />
                Call
              </a>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
          <div className="space-y-2">
            {[
              { label: 'Quote sent', at: job.quoteSentAt },
              { label: `Viewed ${job.quoteViewedCount > 1 ? `(${job.quoteViewedCount}×)` : ''}`.trim(), at: job.quoteViewedAt },
              { label: `Accepted by ${job.signerName ?? ''}`.trim(), at: job.quoteSignedAt },
              { label: 'Invoice sent', at: job.invoiceSentAt },
              { label: 'Invoice viewed', at: job.invoiceViewedAt },
              { label: `Due date${isOverdue ? ' — OVERDUE' : ''}`, at: job.dueDateAt, red: !!isOverdue },
              { label: 'Paid', at: job.paidAt, green: true },
            ].filter(e => e.at).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className={cn(
                  'text-gray-500 text-xs',
                  e.red && 'text-red-500 font-semibold',
                  e.green && 'text-green-600 font-semibold',
                )}>{e.label}</span>
                <span className="text-xs text-gray-400">{formatDate(e.at!, 'short')}</span>
              </div>
            ))}
            {!job.quoteSentAt && !job.invoiceSentAt && (
              <p className="text-xs text-gray-400">Nothing sent yet.</p>
            )}
          </div>
        </div>

        {/* Payments */}
        {job.payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payments</h3>
            <div className="space-y-2">
              {job.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 capitalize">{p.type}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.paidAt, 'short')} · {p.method}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 tabular-nums">
                    +{sym}{parseFloat(p.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ─── Sticky action bar ─────────────────────────────────────────────── */}
      {actionCfg && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 pt-3 pb-safe safe-area-pb z-30">
          <div className="max-w-lg mx-auto space-y-2">
            {/* Duplicate row */}
            <button
              onClick={duplicate}
              disabled={duplicating}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 active:bg-gray-200 text-gray-600 rounded-xl font-medium text-sm disabled:opacity-60 transition-all"
              style={{ minHeight: 36 }}
            >
              <Files size={13} />
              {duplicating ? 'Duplicating…' : 'Duplicate job'}
            </button>

            {/* Reminder row — only on unpaid invoices */}
            {canRemind && (
              <button
                onClick={sendReminder}
                disabled={reminding}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm disabled:opacity-60 transition-all"
                style={{ minHeight: 40 }}
              >
                {reminded ? (
                  <><Check size={14} className="text-green-500" /> Reminder sent!</>
                ) : reminding ? (
                  <span className="animate-pulse">Sending…</span>
                ) : (
                  <><Send size={14} /> Send Reminder</>
                )}
              </button>
            )}

            {/* Primary action row */}
            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={loading || action === 'paid'}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2.5 text-white font-bold rounded-2xl transition-all active:scale-[0.98]',
                  actionCfg.colour,
                  (loading || action === 'paid') && 'opacity-70',
                )}
                style={{ minHeight: 56 }}
              >
                {loading ? (
                  <span className="animate-pulse">Working…</span>
                ) : (
                  <>
                    <actionCfg.icon size={18} />
                    {actionCfg.label}
                  </>
                )}
              </button>

              {(job.quoteToken || job.invoiceToken) && action !== 'paid' && (
                <button
                  onClick={copyLink}
                  className="w-14 flex items-center justify-center bg-gray-100 active:bg-gray-200 rounded-2xl transition-colors"
                  style={{ minHeight: 56 }}
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-500" />}
                </button>
              )}
            </div>
          </div>
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      )}
    </div>
  )
}
