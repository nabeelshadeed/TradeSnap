'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, X, Wand2, Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'confirm'
  | 'generating'
  | 'done'

interface Extracted {
  title: string
  estimatedPrice: number
  notes: string
  jobId: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function VoiceJobButton({ currency = 'GBP' }: { currency?: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [error, setError] = useState('')
  const recogRef = useRef<any>(null)
  const sym = currency === 'GBP' ? '£' : '$'

  const supported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  // ─── Start listening ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    setError('')
    setTranscript('')
    setInterimText('')

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const rec = new SR()
    recogRef.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-GB'
    rec.maxAlternatives = 1

    rec.onresult = (e: any) => {
      let final = ''
      let interim = ''
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript + ' '
        else interim += result[0].transcript
      }
      if (final) setTranscript(t => (t + ' ' + final).trim())
      setInterimText(interim)
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setError('Microphone blocked. Tap to type instead.')
      }
      setPhase('idle')
    }

    rec.onend = () => {
      setInterimText('')
      // Auto-submit if we captured speech
      setTranscript(t => {
        if (t.trim()) {
          setPhase('processing')
          submitTranscript(t.trim())
        } else {
          setPhase('idle')
        }
        return t
      })
    }

    try {
      rec.start()
      setPhase('listening')
      navigator.vibrate?.(60)
    } catch {
      setError('Could not start microphone.')
      setPhase('idle')
    }
  }, [])

  const stopListening = useCallback(() => {
    recogRef.current?.stop()
  }, [])

  // ─── Submit transcript to API ─────────────────────────────────────────────
  async function submitTranscript(text: string) {
    setPhase('processing')
    try {
      const res = await fetch('/api/voice-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setExtracted({
        title: data.extracted.title || text.slice(0, 60),
        estimatedPrice: data.extracted.estimatedPrice ?? 0,
        notes: data.extracted.notes ?? '',
        jobId: data.job.id,
      })
      setPhase('confirm')
      navigator.vibrate?.([80, 40, 80])
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setPhase('idle')
    }
  }

  // ─── Generate full quote ───────────────────────────────────────────────────
  async function generateQuote() {
    if (!extracted) return
    setPhase('generating')
    try {
      await fetch(`/api/jobs/${extracted.jobId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      setPhase('done')
      navigator.vibrate?.([100, 50, 200])
      setTimeout(() => router.push(`/jobs/${extracted.jobId}`), 800)
    } catch {
      // Navigate anyway — user can edit on detail page
      router.push(`/jobs/${extracted.jobId}`)
    }
  }

  function reset() {
    recogRef.current?.abort()
    setPhase('idle')
    setTranscript('')
    setInterimText('')
    setExtracted(null)
    setError('')
  }

  // ─── IDLE — mic button ────────────────────────────────────────────────────
  if (phase === 'idle') {
    if (!supported) return null // only render if Speech API is available
    return (
      <div>
        <button
          onClick={startListening}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-orange-200 text-orange-600 rounded-2xl font-bold active:bg-orange-50 transition-all active:scale-[0.98]"
          style={{ minHeight: 56 }}
        >
          <Mic size={20} />
          Speak a job
        </button>
        {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
      </div>
    )
  }

  // ─── LISTENING ────────────────────────────────────────────────────────────
  if (phase === 'listening') {
    const display = transcript + (interimText ? ' ' + interimText : '')
    return (
      <div className="bg-white border-2 border-red-300 rounded-2xl p-4 animate-pop-in">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-600">Listening…</span>
          </div>
          <button onClick={reset} className="text-gray-400 p-1">
            <X size={16} />
          </button>
        </div>
        {display ? (
          <p className="text-sm text-gray-700 min-h-12 leading-relaxed">{display}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Speak now — describe the job…</p>
        )}
        <button
          onClick={stopListening}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-red-500 active:bg-red-600 text-white rounded-xl font-semibold"
          style={{ minHeight: 48 }}
        >
          <MicOff size={16} />
          Done speaking
        </button>
      </div>
    )
  }

  // ─── PROCESSING ───────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center animate-pop-in">
        <span className="text-3xl animate-hammer inline-block mb-3">🔨</span>
        <p className="text-sm font-semibold text-gray-700">Reading your job…</p>
        <p className="text-xs text-gray-400 mt-1">Extracting title and price estimate</p>
      </div>
    )
  }

  // ─── CONFIRM ─────────────────────────────────────────────────────────────
  if (phase === 'confirm' && extracted) {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-2xl overflow-hidden animate-pop-in">
        <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Job created</span>
          <button onClick={reset} className="text-gray-400 p-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-base font-bold text-gray-900 mb-1">{extracted.title}</p>
          {extracted.notes && (
            <p className="text-sm text-gray-500 mb-3">{extracted.notes}</p>
          )}
          {extracted.estimatedPrice > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Rough estimate: <span className="font-semibold text-orange-500">{sym}{extracted.estimatedPrice.toFixed(0)}</span>
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={generateQuote}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 active:bg-orange-600 text-white rounded-xl font-bold transition-all"
              style={{ minHeight: 52 }}
            >
              <Wand2 size={16} />
              Build full quote
            </button>
            <button
              onClick={() => router.push(`/jobs/${extracted.jobId}`)}
              className="px-4 bg-gray-100 active:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm"
              style={{ minHeight: 52 }}
            >
              View draft
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── GENERATING ───────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center animate-pop-in">
        <span className="text-3xl animate-hammer inline-block mb-3">🔨</span>
        <p className="text-sm font-semibold text-gray-700">Building your quote…</p>
        <p className="text-xs text-gray-400 mt-1">Setting prices for each item</p>
      </div>
    )
  }

  // ─── DONE ─────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center animate-pop-in">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check size={22} className="text-white" strokeWidth={3} />
        </div>
        <p className="text-sm font-semibold text-green-800">Quote ready!</p>
      </div>
    )
  }

  return null
}
