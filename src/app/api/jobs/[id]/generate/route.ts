import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { generatePrice } from '@/lib/ai/generate-price'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contractor = ctx.contractor
  const plan = contractor.plan ?? 'free'
  const aiLimits: Record<string, number> = { free: 0, starter: 5, pro: Infinity, business: Infinity }
  const aiUsed = contractor.aiUsesThisMonth ?? 0
  const aiLimit = aiLimits[plan] ?? 0

  if (aiUsed >= aiLimit) {
    return NextResponse.json(
      { error: `AI quote limit reached. Upgrade to Pro for unlimited AI quotes.` },
      { status: 403 }
    )
  }

  const db = getDb()
  const job = await db.query.jobs.findFirst({
    where: and(eq(schema.jobs.id, params.id), eq(schema.jobs.contractorId, ctx.contractorId)),
  })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const body = await req.json()
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim().slice(0, 10_000) : ''
  if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  const tradeHourlyRates: Record<string, number> = {
    electrician: 65, plumber: 70, roofer: 55, hvac: 75, painter: 40,
    tiler: 50, landscaper: 40, carpenter: 60, 'gas-engineer': 75, 'general-builder': 55, other: 50,
  }
  const hourlyRate = tradeHourlyRates[contractor.tradeType ?? 'other'] ?? 55
  const country = (contractor.operatingCountry ?? 'UK') as 'UK' | 'US'

  const generated = await generatePrice({
    transcript,
    tradeType: contractor.tradeType ?? 'other',
    hourlyRate,
    country,
  })

  // Store transcript + raw response, and increment AI usage atomically
  await Promise.all([
    db.update(schema.jobs).set({
      voiceTranscript: transcript,
      aiResponseRaw: generated as any,
      aiGeneratedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.jobs.id, params.id)),
    db.update(schema.contractors).set({
      aiUsesThisMonth: aiUsed + 1,
      updatedAt: new Date(),
    }).where(eq(schema.contractors.id, ctx.contractorId)),
  ])

  // Insert line items
  if (generated.lineItems.length > 0) {
    await db.insert(schema.lineItems).values(
      generated.lineItems.map((item, idx) => ({
        jobId: params.id,
        description: item.description,
        quantity: String(item.quantity),
        unit: item.unit,
        unitPrice: String(item.unitPrice),
        total: String(item.quantity * item.unitPrice),
        category: item.category,
        isOptional: item.isOptional,
        sortOrder: idx,
      }))
    )

    // Recalculate totals
    const subtotal = generated.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const taxRate = parseFloat(String(contractor.taxRate ?? 20))
    const taxAmount = contractor.taxRegistered ? subtotal * (taxRate / 100) : 0
    const total = subtotal + taxAmount
    const depositPct = generated.depositPercent || parseFloat(String(contractor.defaultDepositPct ?? 0))
    const depositAmount = (total * depositPct) / 100

    await db.update(schema.jobs).set({
      title: generated.jobTitle,
      estimatedDays: generated.estimatedDays,
      notIncluded: generated.notIncluded,
      customerNotes: generated.customerNotes,
      internalNotes: generated.internalNotes,
      depositPct: String(depositPct),
      depositAmount: String(depositAmount),
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      total: String(total),
      balanceDue: String(total),
      updatedAt: new Date(),
    }).where(eq(schema.jobs.id, params.id))
  }

  return NextResponse.json({ generated })
}
