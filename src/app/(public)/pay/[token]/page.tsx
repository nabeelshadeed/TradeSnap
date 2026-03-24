import { notFound } from 'next/navigation'
import { daysOverdue, formatDate } from '@/lib/utils'
import { InvoiceViewTracker } from '@/components/InvoiceViewTracker'

export const dynamic = 'force-dynamic'

async function getInvoiceData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/invoices/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function PayPage({ params }: { params: { token: string } }) {
  const data = await getInvoiceData(params.token)
  if (!data) notFound()

  const { job, contractor, customer } = data
  const sym = contractor.currency === 'USD' ? '$' : '£'
  const balanceDue = parseFloat(String(job.balanceDue ?? 0))
  const total = parseFloat(String(job.total ?? 0))
  const amountPaid = parseFloat(String(job.amountPaid ?? 0))
  const isOverdue = job.dueDateAt && new Date(job.dueDateAt) < new Date()
  const overdueDays = job.dueDateAt ? daysOverdue(job.dueDateAt) : 0
  const isPaid = balanceDue <= 0
  const hasPartialPayment = amountPaid > 0 && !isPaid
  const issueDate = job.invoiceSentAt
    ? formatDate(job.invoiceSentAt, 'long')
    : formatDate(new Date().toISOString(), 'long')
  const dueDate = job.dueDateAt ? formatDate(job.dueDateAt, 'long') : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <InvoiceViewTracker token={params.token} />

      {/* ─── Overdue banner ─────────────────────────────────────────────── */}
      {isOverdue && !isPaid && (
        <div style={{ background: '#dc2626', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
          ⚠️ This invoice is {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* ─── Invoice card ──────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>

          {/* Header */}
          <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              {/* Contractor brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {contractor.logoUrl ? (
                  <img
                    src={contractor.logoUrl}
                    alt={contractor.name}
                    style={{ height: 44, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: contractor.primaryColour ?? '#f97316',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 20, fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {contractor.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{contractor.name}</p>
                  {contractor.phone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{contractor.phone}</p>}
                </div>
              </div>

              {/* Invoice badge */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Invoice</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                  {job.invoiceNumber ?? job.referenceNumber}
                </p>
              </div>
            </div>

            {/* Date row */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Issued</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#374151', fontWeight: 500 }}>{issueDate}</p>
              </div>
              {dueDate && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 600, color: isOverdue && !isPaid ? '#dc2626' : '#374151' }}>
                    {dueDate}
                    {isOverdue && !isPaid && ' — overdue'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FROM / TO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ padding: '16px 28px', borderRight: '1px solid #f3f4f6' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{contractor.name}</p>
              {contractor.email && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{contractor.email}</p>}
              {contractor.phone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{contractor.phone}</p>}
            </div>
            <div style={{ padding: '16px 28px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</p>
              {customer ? (
                <>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {customer.firstName} {customer.lastName ?? ''}
                  </p>
                  {customer.email && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{customer.email}</p>}
                  {customer.phone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{customer.phone}</p>}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>—</p>
              )}
            </div>
          </div>

          {/* Job title */}
          <div style={{ padding: '14px 28px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>{job.title}</p>
          </div>

          {/* Line items */}
          <div>
            {/* Column headers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 28px', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</p>
            </div>

            {job.lineItems.map((item: any, i: number) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 28px',
                borderBottom: i < job.lineItems.length - 1 ? '1px solid #f9fafb' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#111827' }}>{item.description}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    {item.quantity} × {item.unit}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {sym}{parseFloat(item.total).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ background: '#fafafa', borderTop: '1px solid #e5e7eb', padding: '16px 28px' }}>
            {parseFloat(job.taxAmount ?? 0) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                    {sym}{parseFloat(job.subtotal).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>VAT</span>
                  <span style={{ fontSize: 13, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                    {sym}{parseFloat(job.taxAmount).toFixed(2)}
                  </span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: hasPartialPayment ? 6 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Invoice total</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                {sym}{total.toFixed(2)}
              </span>
            </div>
            {hasPartialPayment && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 13, color: '#16a34a' }}>Already paid</span>
                <span style={{ fontSize: 13, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                  −{sym}{amountPaid.toFixed(2)}
                </span>
              </div>
            )}
            {!isPaid && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: hasPartialPayment ? 0 : 8, paddingTop: 8, borderTop: '1px solid #e5e7eb',
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Balance due</span>
                <span style={{
                  fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                  color: isOverdue ? '#dc2626' : (contractor.primaryColour ?? '#f97316'),
                }}>
                  {sym}{balanceDue.toFixed(2)}
                </span>
              </div>
            )}
            {isPaid && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>✓ PAID</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Pay Now CTA ─────────────────────────────────────────────────── */}
        {!isPaid && (
          <div style={{ marginBottom: 12 }}>
            <a
              href={`/api/invoices/${params.token}/pay`}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                background: contractor.primaryColour ?? '#f97316',
                color: '#fff', textDecoration: 'none',
                padding: '18px 24px', borderRadius: 16,
                fontSize: 18, fontWeight: 800,
                boxSizing: 'border-box',
              }}
            >
              Pay {sym}{balanceDue.toFixed(2)} now
            </a>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: '8px 0 0' }}>
              🔒 Secure payment · Powered by Stripe
            </p>
          </div>
        )}

        {/* ─── Bank transfer ─────────────────────────────────────────────── */}
        {!isPaid && contractor.bankAccountNumber && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Pay by bank transfer</p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
              {[
                ['Account name', contractor.bankAccountName],
                ['Sort code', contractor.bankSortCode],
                ['Account number', contractor.bankAccountNumber],
                ['Reference', job.invoiceNumber ?? job.referenceNumber],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>
              ⚠️ Use the reference number above so your payment is matched automatically.
            </p>
          </div>
        )}

        {/* ─── Paid confirmation ────────────────────────────────────────────── */}
        {isPaid && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 16, padding: '28px 24px', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 32 }}>✅</p>
            <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#14532d' }}>All paid. Thank you!</p>
            <p style={{ margin: 0, fontSize: 13, color: '#16a34a' }}>Payment received by {contractor.name}</p>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 24 }}>
          Sent via TradeSnap
        </p>
      </div>
    </div>
  )
}
