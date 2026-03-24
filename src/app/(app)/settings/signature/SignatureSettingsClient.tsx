'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, PenLine, Trash2 } from 'lucide-react'
import { SignaturePad } from '@/components/SignaturePad'

interface Props {
  existingSignature: string | null
}

export function SignatureSettingsClient({ existingSignature }: Props) {
  const [saved, setSaved] = useState(existingSignature)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle')
  const [showPad, setShowPad] = useState(!existingSignature)

  async function handleSave(dataUrl: string) {
    setSaving(true)
    try {
      await fetch('/api/settings/signature', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      })
      setSaved(dataUrl)
      setShowPad(false)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setSaving(true)
    try {
      await fetch('/api/settings/signature', { method: 'DELETE' })
      setSaved(null)
      setShowPad(true)
      setStatus('cleared')
      setTimeout(() => setStatus('idle'), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/settings" className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Your Signature</h1>
        {status === 'saved' && (
          <span className="text-sm font-semibold text-green-600">Saved ✓</span>
        )}
      </header>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full pb-32">
        <p className="text-sm text-gray-500">
          Draw your signature once and it will automatically appear on all quotes and invoices.
        </p>

        {/* Existing signature preview */}
        {saved && !showPad && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your current signature</p>
            <img
              src={saved}
              alt="Your signature"
              className="max-h-24 w-auto object-contain"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPad(true)}
                className="flex items-center gap-2 flex-1 justify-center py-2.5 bg-orange-50 active:bg-orange-100 text-orange-600 rounded-xl text-sm font-semibold"
                style={{ minHeight: 44 }}
              >
                <PenLine size={15} />
                Re-draw
              </button>
              <button
                onClick={handleClear}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ minHeight: 44 }}
              >
                <Trash2 size={15} />
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Signature pad */}
        {showPad && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Draw your signature</p>
            <SignaturePad
              onSave={handleSave}
              onClear={() => {}}
            />
            {saved && (
              <button
                onClick={() => setShowPad(false)}
                className="w-full mt-3 py-2 text-sm text-gray-400 text-center"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700">
            Optional — customers can still sign quotes without requiring your signature on documents.
          </p>
        </div>
      </div>
    </div>
  )
}
