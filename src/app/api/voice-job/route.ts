import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/get-auth'
import { getDb, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { generateToken } from '@/lib/utils'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * POST /api/voice-job
 * Accepts a voice transcript, uses Claude to extract job details,
 * creates a draft job, and returns the job + extracted data.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { transcript } = await req.json()
    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    // Quick Claude extraction — title + price estimate only
    const client = new Anthropic()
    const country = ctx.contractor.operatingCountry ?? 'UK'
    const sym = country === 'UK' ? '£' : '$'

    let extracted = { title: '', estimatedPrice: 0, notes: '' }

    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Extract job info from this voice note by a trade contractor.
Return ONLY valid JSON — no markdown, no explanation.

Voice note: "${transcript.trim()}"

JSON format:
{
  "title": "short job title (max 60 chars, include address if mentioned)",
  "estimatedPrice": <number, rough total price in ${sym} if mentioned, else 0>,
  "notes": "one sentence summary"
}`,
        }],
      })

      const text = (msg.content[0] as any).text?.trim() ?? ''
      const json = text.replace(/```json?|```/g, '').trim()
      extracted = JSON.parse(json)
    } catch {
      // Fall back to using transcript as title
      extracted.title = transcript.trim().slice(0, 60)
    }

    const db = getDb()
    const contractor = ctx.contractor
    const seq = contractor.priceSequence ?? 1
    const referenceNumber = `${contractor.pricePrefix ?? 'QT'}-${String(seq).padStart(4, '0')}`
    const quoteToken = generateToken(32)

    const [job] = await db.insert(schema.jobs).values({
      contractorId: ctx.contractorId,
      title: extracted.title || transcript.slice(0, 60),
      referenceNumber,
      quoteToken,
      paymentTermsType: 'net30' as any,
      paymentTermsDays: contractor.defaultPaymentDays ?? 30,
      depositPct: contractor.defaultDepositPct ?? '0',
      lateFeeType: contractor.defaultLateFeeType ?? 'none',
      voiceTranscript: transcript,
      internalNotes: extracted.notes || undefined,
    }).returning()

    // Increment sequence counter
    await db.update(schema.contractors)
      .set({ priceSequence: seq + 1, updatedAt: new Date() })
      .where(eq(schema.contractors.id, ctx.contractorId))

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        referenceNumber: job.referenceNumber,
        quoteToken: job.quoteToken,
      },
      extracted: {
        title: extracted.title,
        estimatedPrice: extracted.estimatedPrice,
        notes: extracted.notes,
      },
    }, { status: 201 })
  } catch (err: any) {
    console.error('[voice-job]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create voice job' }, { status: 500 })
  }
}
