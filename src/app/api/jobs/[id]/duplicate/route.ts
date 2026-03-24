import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { generateToken } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  const source = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
    with: { lineItems: { orderBy: (li, { asc }) => [asc(li.sortOrder)] } },
  })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contractor = ctx.contractor
  const seq = contractor.priceSequence ?? 1
  const referenceNumber = `${contractor.pricePrefix ?? 'QT'}-${String(seq).padStart(4, '0')}`
  const quoteToken = generateToken(32)

  const [newJob] = await db.insert(schema.jobs).values({
    contractorId: ctx.contractorId,
    customerId: source.customerId,
    title: `${source.title} (copy)`,
    tradeCategory: source.tradeCategory,
    siteAddress: source.siteAddress,
    siteCity: source.siteCity,
    sitePostcode: source.sitePostcode,
    siteSameAsCustomer: source.siteSameAsCustomer,
    referenceNumber,
    quoteToken,
    status: 'draft',
    subtotal: source.subtotal,
    taxAmount: source.taxAmount,
    total: source.total,
    depositPct: source.depositPct,
    depositAmount: source.depositAmount,
    paymentTermsType: source.paymentTermsType,
    paymentTermsDays: source.paymentTermsDays,
    lateFeeType: source.lateFeeType,
    lateFeeAmount: source.lateFeeAmount,
    earlyPayDiscountPct: source.earlyPayDiscountPct,
    earlyPayDays: source.earlyPayDays,
    internalNotes: source.internalNotes,
    customerNotes: source.customerNotes,
    notIncluded: source.notIncluded,
  }).returning()

  // Copy line items
  if (source.lineItems.length > 0) {
    await db.insert(schema.lineItems).values(
      source.lineItems.map(li => ({
        jobId: newJob.id,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
        total: li.total,
        category: li.category,
        isOptional: li.isOptional,
        sortOrder: li.sortOrder,
      }))
    )
  }

  // Increment sequence
  await db.update(schema.contractors)
    .set({ priceSequence: seq + 1, updatedAt: new Date() })
    .where(eq(schema.contractors.id, ctx.contractorId))

  return NextResponse.json({ job: newJob }, { status: 201 })
}
