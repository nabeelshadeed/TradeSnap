import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">⚡</span>
          </div>
          <span className="font-bold text-lg text-gray-900">TradeSnap</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
          <Link
            href="/auth/sign-up"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          ★★★★★ Rated by 2,000+ tradespeople
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4">
          Stop chasing payments.<br />Get paid same day.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          TradeSnap turns site notes into professional prices in 90 seconds — and automates every invoice and reminder, so you can focus on the work.
        </p>
        <Link
          href="/auth/sign-up"
          className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-lg font-bold transition-colors shadow-lg shadow-orange-200 active:scale-95"
        >
          Start Free — No card needed
        </Link>
        <p className="text-sm text-gray-400 mt-3">14-day free trial · Cancel any time · Takes 3 minutes</p>
      </section>

      {/* Stats strip */}
      <section className="bg-slate-900 px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { stat: '86 hrs', label: 'Lost per year chasing payments' },
            { stat: '£4,500', label: 'Average invoice written off' },
            { stat: '42 days', label: 'Average time to get paid' },
            { stat: '12 days', label: 'TradeSnap average' },
          ].map(item => (
            <div key={item.stat}>
              <p className="text-3xl font-black text-orange-400 mb-1">{item.stat}</p>
              <p className="text-sm text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Still doing this?</h2>
        <div className="space-y-3 text-left max-w-md mx-auto mb-8">
          {[
            'Typing quotes in your van at 7pm',
            'Chasing the same customer for the third time',
            'Sending invoices days after the job',
            'Not knowing who owes you what',
            'Losing money on jobs you forgot to invoice',
          ].map(pain => (
            <p key={pain} className="text-base text-gray-400 line-through">{pain}</p>
          ))}
        </div>
        <p className="text-xl font-bold text-gray-900">TradeSnap eliminates all of it.</p>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🎤', step: '1', title: 'Speak the job on site', desc: 'Price ready in 90 seconds from your voice notes.' },
              { icon: '📱', step: '2', title: 'Customer signs in one tap', desc: 'Deposit collected immediately on acceptance.' },
              { icon: '💰', step: '3', title: 'Invoice auto-sent', desc: 'We chase it so you don\'t have to.' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-4xl">{item.icon}</span>
                <h3 className="font-bold text-gray-900 mt-3 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-10">What tradespeople say</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              quote: 'I quoted a full rewire on my phone before I left the driveway. Customer signed while I was still packing up. Had the deposit in 10 minutes.',
              name: 'Mike T.',
              trade: 'Electrician, Manchester',
            },
            {
              quote: "Used to spend Sunday evening typing up quotes. Now it takes 5 minutes on the train home. My acceptance rate went up because I quote faster.",
              name: 'Sarah P.',
              trade: 'Plumber, Bristol',
            },
            {
              quote: "I had an invoice for £3,800 sitting unpaid for 6 weeks. TradeSnap sent 3 reminders and added the statutory interest. Got paid in full that week.",
              name: 'David K.',
              trade: 'Roofer, Leeds',
            },
          ].map(item => (
            <div key={item.name} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-700 italic mb-4">&ldquo;{item.quote}&rdquo;</p>
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.trade}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Simple pricing</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                price: '£0',
                period: '/month',
                features: ['3 jobs per month', 'Prices + invoices', '1 user', 'See if you like it'],
                cta: 'Start free',
                featured: false,
              },
              {
                name: 'Starter',
                price: '£29',
                period: '/month',
                features: ['50 jobs/month', 'AI quote generation', 'Auto payment reminders', 'Price book', 'No TradeSnap branding'],
                cta: 'Start free',
                featured: true,
              },
              {
                name: 'Pro',
                price: '£49',
                period: '/month',
                features: ['Unlimited jobs', 'Open banking', 'Change orders', 'Up to 5 users', 'Full escalation system', 'Evidence packs'],
                cta: 'Start free',
                featured: false,
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 ${plan.featured ? 'bg-orange-500 text-white shadow-xl' : 'bg-white border border-gray-200'}`}
              >
                <p className={`text-sm font-semibold mb-1 ${plan.featured ? 'text-orange-100' : 'text-gray-500'}`}>{plan.name}</p>
                <p className={`text-3xl font-black mb-4 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}<span className={`text-sm font-normal ${plan.featured ? 'text-orange-100' : 'text-gray-500'}`}>{plan.period}</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${plan.featured ? 'text-orange-50' : 'text-gray-600'}`}>
                      <span>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/sign-up"
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-white text-orange-600 hover:bg-orange-50'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Join 2,000+ trade professionals getting paid on time.</h2>
        <p className="text-gray-500 mb-8">Sends first price in 3 minutes. Real results from day one.</p>
        <Link
          href="/auth/sign-up"
          className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-lg font-bold transition-colors shadow-lg shadow-orange-200"
        >
          Start free — no card needed
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center">
        <p className="text-sm text-gray-400">© 2025 TradeSnap · Built for the trades</p>
      </footer>
    </div>
  )
}
