import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { generateToken } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status')
    const VALID_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'in_progress', 'completed', 'invoiced', 'part_paid', 'paid', 'overdue', 'disputed', 'cancelled', 'lost'] as const
    type JobStatus = typeof VALID_STATUSES[number]
    const status = statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
      ? statusParam as JobStatus
      : null
    const limitParam = parseInt(url.searchParams.get('limit') ?? '20')
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100)

    const jobs = await db.query.jobs.findMany({
      where: and(
        eq(schema.jobs.contractorId, ctx.contractorId),
        status ? eq(schema.jobs.status, status) : undefined,
      ),
      with: { customer: true, lineItems: true },
      orderBy: [desc(schema.jobs.updatedAt)],
      limit,
    })

    return NextResponse.json({ jobs })
  } catch (err: any) {
    console.error('[jobs/GET]', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const contractor = ctx.contractor

    const jobsThisMonth = contractor.jobsThisMonth ?? 0
    const limits: Record<string, number> = { free: 3, starter: 50, pro: Infinity, business: Infinity }
    const planLimit = limits[contractor.plan ?? 'free'] ?? 3
    if (jobsThisMonth >= planLimit) {
      return NextResponse.json(
        { error: `Job limit reached (${planLimit}/month on ${contractor.plan} plan). Upgrade to send more.` },
        { status: 403 }
      )
    }

    const body = await req.json()
    const country = (contractor.operatingCountry ?? 'UK') as 'UK' | 'US'

    const VALID_TERMS = ['net7', 'net14', 'net30', 'net60', 'custom']
    if (country === 'US') {
      if (!body.paymentTermsType || !VALID_TERMS.includes(body.paymentTermsType)) {
        return NextResponse.json(
          { error: 'US contractors must specify explicit payment terms (net7, net14, net30, net60, or custom)' },
          { status: 400 },
        )
      }
    }

    const termsType: string = body.paymentTermsType ?? 'net30'
    const termsDaysMap: Record<string, number> = { net7: 7, net14: 14, net30: 30, net60: 60 }
    const paymentTermsDays = termsType === 'custom'
      ? (body.paymentTermsDays ?? 30)
      : (termsDaysMap[termsType] ?? 30)

    const seq = contractor.priceSequence ?? 1
    const referenceNumber = `${contractor.pricePrefix ?? 'QT'}-${String(seq).padStart(4, '0')}`
    const quoteToken = generateToken(32)

    const [job] = await db.insert(schema.jobs).values({
      contractorId: ctx.contractorId,
      customerId: body.customerId,
      title: body.title,
      siteAddress: body.siteAddress,
      siteCity: body.siteCity,
      sitePostcode: body.sitePostcode,
      visitDate: body.visitDate,
      referenceNumber,
      quoteToken,
      paymentTermsType: termsType as any,
      paymentTermsDays,
      depositPct: body.depositPct ?? contractor.defaultDepositPct ?? '0',
      lateFeeType: body.lateFeeType ?? contractor.defaultLateFeeType ?? 'none',
      lateFeeAmount: body.lateFeeAmount ?? contractor.defaultLateFeeAmount ?? undefined,
      internalNotes: body.internalNotes,
      customerNotes: body.customerNotes,
      notIncluded: body.notIncluded,
    }).returning()

    await db.update(schema.contractors)
      .set({ priceSequence: seq + 1, jobsThisMonth: jobsThisMonth + 1, updatedAt: new Date() })
      .where(eq(schema.contractors.id, ctx.contractorId))

    return NextResponse.json({ job }, { status: 201 })
  } catch (err: any) {
    console.error('[jobs/POST]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create job' }, { status: 500 })
  }
}
