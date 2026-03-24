'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { SignaturePad } from '@/components/SignaturePad'

interface Props {
  token: string
  customerName: string
  customerEmail: string
  depositAmount: number
  total: number
  primaryColour: string
}

export function QuoteAcceptSection({ token, customerName, customerEmail, depositAmount, primaryColour }: Props) {
  const [name, setName] = useState(customerName)
  const [email, setEmail] = useState(customerEmail)
  const [accepted, setAccepted] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) { setError('Please confirm you accept the price and terms.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/pricing/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: name, signerEmail: email, customerSignatureDataUrl: signatureDataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-lg font-bold text-green-800">Price accepted</p>
        <p className="text-sm text-green-600 mt-1">
          We'll be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-green-400 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Accept this price</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Your full name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base focus:ring-2 focus:outline-none"
            style={{ '--tw-ring-color': primaryColour } as any}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base focus:ring-2 focus:outline-none"
            placeholder="your@email.com"
          />
        </div>

        {/* Optional signature */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Signature <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {signatureDataUrl ? (
            <div className="space-y-2">
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <img src={signatureDataUrl} alt="Your signature" className="max-h-16 w-auto" />
              </div>
              <button
                type="button"
                onClick={() => setSignatureDataUrl(null)}
                className="text-xs text-gray-400 underline"
              >
                Re-draw
              </button>
            </div>
          ) : (
            <SignaturePad onSave={setSignatureDataUrl} />
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 accent-green-500"
          />
          <span className="text-xs text-gray-600">
            I accept the above price and terms. I understand that items not listed above are not included in this price.
          </span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl text-white font-bold text-lg transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#16a34a' }}
        >
          {submitting ? 'Submitting…' : (
            <>✓ Accept This Price{depositAmount > 0 && ` — £${depositAmount.toFixed(2)} deposit`}</>
          )}
        </button>
      </form>
    </div>
  )
}
