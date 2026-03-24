import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ReceiptPage({ params }: { params: { token: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/invoices/${params.token}`, { cache: 'no-store' })
  if (!res.ok) notFound()
  const { job, contractor } = await res.json()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment confirmed</h1>
          <p className="text-gray-500">Thank you for your payment</p>
        </div>
        <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
          <div className="flex justify-between">
            <span className="text-gray-500">From</span>
            <span className="font-medium">{contractor.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Invoice</span>
            <span className="font-mono">{job.invoiceNumber ?? job.referenceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">For</span>
            <span className="font-medium">{job.title}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
            <span>Total paid</span>
            <span className="text-green-600">£{parseFloat(job.amountPaid).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
