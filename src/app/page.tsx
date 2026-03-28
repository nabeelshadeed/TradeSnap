import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { LandingDemoWrapper } from '@/components/landing/LandingDemoWrapper'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    period: '/month',
    desc: 'See if it fits',
    features: ['3 jobs per month', 'Quotes & invoices', '1 user', 'PDF export'],
    cta: 'Start free',
    featured: false,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: '£29',
    period: '/month',
    desc: 'For the one-man band',
    features: ['50 jobs / month', 'AI quote generation', 'Auto payment reminders', 'Price book', 'Remove SnapTrade branding'],
    cta: 'Start free',
    featured: true,
    badge: 'Most popular',
  },
  {
    id: 'growing',
    name: 'Growing',
    price: '£49',
    period: '/month',
    desc: 'For busy teams',
    features: ['Unlimited jobs', 'Up to 5 users', 'Open banking reconciliation', 'Change orders', 'Full escalation system', 'Evidence packs'],
    cta: 'Start free',
    featured: false,
  },
]

const HOW_IT_WORKS = [
  {
    number: '1',
    title: 'Describe the job',
    desc: 'Type or speak what needs doing. SnapTrade builds a professional quote in seconds.',
  },
  {
    number: '2',
    title: 'Send quote to client',
    desc: 'Client receives a link, views on any device, and signs with a tap. Deposit collected immediately.',
  },
  {
    number: '3',
    title: 'Get paid — or we chase it',
    desc: 'Invoice goes out automatically. If they don\'t pay, SnapTrade follows up so you don\'t have to.',
  },
]

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">⚡</span>
            </div>
            <span className="font-black text-lg text-gray-900 tracking-tight">SnapTrade</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="px-4 pt-20 pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 tracking-wide uppercase">
          Built for tradespeople
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight mb-5">
          Get paid faster<br />
          <span className="text-orange-500">without chasing clients</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
          Create quotes, send invoices, and automatically follow up on unpaid jobs — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          <Link
            href="/auth/sign-up"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl text-base font-black transition-all shadow-lg shadow-orange-200"
          >
            Start free
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-2xl text-base font-bold transition-all"
          >
            See how it works
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-4 tracking-wide">
          No setup &nbsp;·&nbsp; No contracts &nbsp;·&nbsp; Cancel anytime
        </p>
      </section>

      {/* ─── Value bullets ─── */}
      <section className="px-4 pb-20 max-w-xl mx-auto">
        <div className="space-y-4">
          {[
            'Create a quote in under 2 minutes',
            'Send it and get paid instantly',
            'Automatically chase unpaid invoices',
          ].map(line => (
            <div key={line} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-sm font-black">✓</span>
              <p className="text-base sm:text-lg font-semibold text-gray-800 leading-snug">{line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Live Demo ─── */}
      <section className="bg-slate-950 px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-3">Live demo</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
            See a quote built in seconds
          </h2>
          <p className="text-slate-400 text-base">
            Type any job below and watch SnapTrade price it up — no signup needed.
          </p>
        </div>
        <LandingDemoWrapper />
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="px-4 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">Simple process</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">How it works</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map(step => (
            <div key={step.number} className="relative">
              {/* Connector line (desktop only) */}
              <div className="hidden sm:block absolute top-6 left-[calc(50%+28px)] right-0 h-px bg-gray-100" />

              <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-xl font-black mb-4 shrink-0">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Simple, honest pricing</h2>
            <p className="text-gray-500 text-sm">Start free — upgrade later</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-all ${
                  plan.featured
                    ? 'bg-orange-500 text-white shadow-2xl shadow-orange-200 scale-[1.03] z-10'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.featured ? 'text-orange-100' : 'text-gray-400'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.featured ? 'text-orange-100' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.featured ? 'text-orange-100' : 'text-gray-400'}`}>
                    {plan.desc}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-sm ${plan.featured ? 'text-orange-50' : 'text-gray-600'}`}
                    >
                      <span className={`shrink-0 mt-0.5 text-xs font-black ${plan.featured ? 'text-white' : 'text-orange-500'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/sign-up"
                  className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                    plan.featured
                      ? 'bg-white text-orange-600 hover:bg-orange-50 active:bg-orange-100'
                      : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Cancel anytime &nbsp;·&nbsp; No hidden fees &nbsp;·&nbsp; No credit card to start
          </p>
        </div>
      </section>

      {/* ─── Trust ─── */}
      <section className="px-4 py-20 max-w-2xl mx-auto text-center">
        <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug">
          Built for tradespeople who are tired of chasing payments.
        </p>
        <p className="text-gray-500 mt-4 text-base">
          Every feature exists because a tradesperson asked for it.
        </p>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-slate-950 px-4 py-24 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">
            Stop chasing invoices.<br />
            <span className="text-orange-400">Start getting paid.</span>
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Takes 3 minutes to set up. No card needed.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-10 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl text-lg font-black transition-all shadow-xl shadow-orange-900/40"
          >
            Start free
          </Link>
          <p className="text-slate-600 text-xs mt-4">
            No contracts &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">⚡</span>
            </div>
            <span className="font-black text-sm text-gray-700">SnapTrade</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} SnapTrade · Built for the trades
          </p>
          <div className="flex items-center gap-4">
            <Link href="/auth/sign-in" className="text-xs text-gray-400 hover:text-gray-700">Sign in</Link>
            <Link href="/auth/sign-up" className="text-xs text-gray-400 hover:text-gray-700">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
