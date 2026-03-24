'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Building2, Phone, Mail, Hash, FileText, ImageIcon, Palette } from 'lucide-react'

const PRESET_COLOURS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#1e293b']

interface Props {
  contractor: {
    name: string
    phone: string | null
    email: string | null
    logoUrl: string | null
    primaryColour: string
    invoicePrefix: string | null
    invoiceFooter: string | null
  }
}

export function BusinessSettingsForm({ contractor }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: contractor.name ?? '',
    phone: contractor.phone ?? '',
    email: contractor.email ?? '',
    logoUrl: contractor.logoUrl ?? '',
    primaryColour: contractor.primaryColour ?? '#f97316',
    invoicePrefix: contractor.invoicePrefix ?? 'INV',
    invoiceFooter: contractor.invoiceFooter ?? '',
  })

  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/settings" className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Business Details</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60 active:bg-orange-600 transition-colors"
          style={{ minHeight: 40 }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </header>

      <div className="flex-1 px-4 py-5 space-y-3 max-w-lg mx-auto w-full pb-32">

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <ImageIcon size={13} />
            Logo URL
          </label>
          {form.logoUrl && (
            <img
              src={form.logoUrl}
              alt="Logo preview"
              className="w-16 h-16 object-contain rounded-xl border border-gray-200 mb-3"
            />
          )}
          <input
            type="url"
            value={form.logoUrl}
            onChange={e => set('logoUrl', e.target.value)}
            placeholder="https://yoursite.com/logo.png"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            style={{ minHeight: 48 }}
          />
          <p className="text-xs text-gray-400 mt-2">Appears on all invoices and quotes</p>
        </div>

        {/* Company name */}
        <FieldCard icon={<Building2 size={14} />} label="Company Name">
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Your trading name"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            style={{ minHeight: 56 }}
          />
        </FieldCard>

        {/* Phone */}
        <FieldCard icon={<Phone size={14} />} label="Contact Number">
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="07700 900000"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            style={{ minHeight: 56 }}
          />
        </FieldCard>

        {/* Email */}
        <FieldCard icon={<Mail size={14} />} label="Business Email">
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="hello@yourbusiness.com"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            style={{ minHeight: 56 }}
          />
        </FieldCard>

        {/* Brand colour */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <Palette size={13} />
            Brand Colour
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            {PRESET_COLOURS.map(colour => (
              <button
                key={colour}
                type="button"
                onClick={() => set('primaryColour', colour)}
                className="w-9 h-9 rounded-xl transition-all"
                style={{
                  backgroundColor: colour,
                  outline: form.primaryColour === colour ? `3px solid ${colour}` : 'none',
                  outlineOffset: 2,
                  transform: form.primaryColour === colour ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            <input
              type="color"
              value={form.primaryColour}
              onChange={e => set('primaryColour', e.target.value)}
              className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer"
              title="Custom colour"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-md" style={{ backgroundColor: form.primaryColour }} />
            <span className="text-xs font-mono text-gray-500">{form.primaryColour}</span>
          </div>
        </div>

        {/* Invoice prefix */}
        <FieldCard icon={<Hash size={14} />} label="Invoice Prefix">
          <input
            type="text"
            value={form.invoicePrefix}
            onChange={e => set('invoicePrefix', e.target.value.toUpperCase())}
            placeholder="INV"
            maxLength={8}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent font-mono uppercase"
            style={{ minHeight: 56 }}
          />
          <p className="text-xs text-gray-400 mt-2">e.g. INV → INV-0042</p>
        </FieldCard>

        {/* Footer */}
        <FieldCard icon={<FileText size={14} />} label="Invoice Footer (optional)">
          <textarea
            value={form.invoiceFooter}
            onChange={e => set('invoiceFooter', e.target.value)}
            placeholder="Payment terms, bank details, thank-you note…"
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
          />
        </FieldCard>

      </div>
    </div>
  )
}

function FieldCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}
