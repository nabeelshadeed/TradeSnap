import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { PRICE_BOOK_SEEDS, getTradeTerms } from '@/lib/legal'
import { generateToken } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const db = getDb()

    // Update contractor
    await db.update(schema.contractors).set({
      tradeType: body.tradeType,
      teamSize: body.teamSize,
      avgJobValue: String(body.avgJobValue),
      biggestProblem: body.biggestProblem,
      defaultPaymentDays: body.paymentDays ?? 14,
      defaultDepositPct: String(body.depositPct ?? 25),
      taxRegistered: body.taxRegistered ?? false,
      defaultTerms: getTradeTerms(body.tradeType, body.paymentDays ?? 14),
      onboardingDone: true,
      updatedAt: new Date(),
    }).where(eq(schema.contractors.id, ctx.contractorId))

    // Seed price book with trade-specific items
    const seeds = PRICE_BOOK_SEEDS[body.tradeType] ?? PRICE_BOOK_SEEDS['general-builder'] ?? []
    if (seeds.length > 0) {
      await db.insert(schema.priceBook).values(
        seeds.map(item => ({
          contractorId: ctx.contractorId,
          name: item.name,
          unit: item.unit,
          unitPrice: String(item.unitPrice),
          category: item.category,
          tradeTag: body.tradeType,
          isFavourite: true,
        }))
      )
    }

    // Create a sample draft job
    const quoteToken = generateToken(32)
    await db.insert(schema.jobs).values({
      contractorId: ctx.contractorId,
      title: `Example ${body.tradeType} job`,
      referenceNumber: `${ctx.contractor.pricePrefix ?? 'QT'}-0001`,
      quoteToken,
      status: 'draft',
      paymentTermsDays: body.paymentDays ?? 14,
      depositPct: String(body.depositPct ?? 25),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[onboarding/complete]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to complete onboarding' }, { status: 500 })
  }
}
