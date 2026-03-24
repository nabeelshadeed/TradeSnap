import { notFound } from 'next/navigation'
import { QuoteAcceptSection } from './QuoteAcceptSection'

export const dynamic = 'force-dynamic'

async function getQuoteData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/pricing/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function QuotePage({ params }: { params: { token: string } }) {
  const data = await getQuoteData(params.token)
  if (!data) notFound()

  if (data.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This price has expired</h1>
          <p className="text-gray-500">Contact your contractor for an updated price.</p>
        </div>
      </div>
    )
  }

  const { job, contractor, customer } = data
  const primaryColour = contractor.primaryColour ?? '#f97316'
  const totalWithOptional = parseFloat(job.total)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {contractor.logoUrl ? (
            <img src={contractor.logoUrl} alt={contractor.name} className="h-8 w-auto" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColour }}
            >
              {contractor.name[0]}
            </div>
          )}
          <span className="font-bold text-gray-900">{contractor.name}</span>
          {job.quoteSentAt && (
            <span
              className="ml-auto text-xs font-medium text-white px-3 py-1 rounded-full"
              style={{ backgroundColor: '#16a34a' }}
            >
              Valid — accept below
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quote header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">QUOTATION</p>
              <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-sm text-gray-500">{job.referenceNumber}</p>
            </div>
          </div>
          {customer && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
              {customer.addressLine1 && <p>{customer.addressLine1}</p>}
              {customer.addressCity && <p>{customer.addressCity} {customer.addressPostcode}</p>}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {['labour', 'materials', 'other'].map(category => {
            const items = job.lineItems.filter((i: any) => i.category === category)
            if (items.length === 0) return null
            return (
              <div key={category}>
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</p>
                </div>
                {items.map((item: any) => (
                  <div key={item.id} className={`flex items-center justify-between px-5 py-3 border-b border-gray-50 ${item.isOptional ? 'opacity-75' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-400">{item.quantity} × {item.unit}</p>
                      {item.isOptional && <span className="text-xs text-gray-400 italic">Optional add-on</span>}
                    </div>
                    <p className="text-sm font-mono font-semibold text-gray-900 ml-4">
                      £{parseFloat(item.total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )
          })}

          {/* Totals */}
          <div className="px-5 py-4 space-y-1 bg-gray-50">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono">£{parseFloat(job.subtotal).toFixed(2)}</span>
            </div>
            {contractor.taxRegistered && parseFloat(job.taxAmount) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{contractor.taxLabel} ({contractor.taxRate}%)</span>
                <span className="font-mono">£{parseFloat(job.taxAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-200" style={{ color: primaryColour }}>
              <span>TOTAL</span>
              <span className="font-mono">£{parseFloat(job.total).toFixed(2)}</span>
            </div>
            {parseFloat(job.depositPct ?? 0) > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Deposit required today ({job.depositPct}%)</span>
                  <span className="font-mono font-semibold">£{parseFloat(job.depositAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Balance on completion</span>
                  <span className="font-mono">£{(parseFloat(job.total) - parseFloat(job.depositAmount)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Not included */}
        {job.notIncluded && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">NOT INCLUDED IN THIS PRICE</p>
            <p className="text-sm text-gray-600 italic">{job.notIncluded}</p>
          </div>
        )}

        {/* Customer notes */}
        {job.customerNotes && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <p className="text-sm text-blue-800">{job.customerNotes}</p>
          </div>
        )}

        {/* Accept section */}
        {job.status !== 'accepted' && (
          <QuoteAcceptSection
            token={params.token}
            customerName={customer ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : ''}
            customerEmail={customer?.email ?? ''}
            depositAmount={parseFloat(job.depositAmount ?? 0)}
            total={parseFloat(job.total)}
            primaryColour={primaryColour}
          />
        )}

        {job.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-lg font-bold text-green-800">Price accepted</p>
            <p className="text-sm text-green-600">{contractor.name} will be in touch shortly.</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Sent by {contractor.name} · <a href={`mailto:${contractor.email}`} className="underline">{contractor.email}</a>
          <br />
          <span className="text-gray-300">Sent via SnapTrade</span>
        </p>
      </div>
    </div>
  )
}

