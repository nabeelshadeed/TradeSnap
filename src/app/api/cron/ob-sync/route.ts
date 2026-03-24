import { NextRequest, NextResponse } from 'next/server'
import { getDb, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getTransactions } from '@/lib/open-banking/truelayer'
import { reconcileTransactions } from '@/lib/open-banking/reconcile'
import { decryptToken } from '@/lib/encrypt'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const connected = await db.query.contractors.findMany({
      where: and(eq(schema.contractors.obConnected, true), eq(schema.contractors.obProvider, 'truelayer')),
      columns: { id: true, obAccessToken: true, obLastSyncAt: true },
    })

    let synced = 0
    for (const contractor of connected) {
      if (!contractor.obAccessToken) continue
      try {
        const from = contractor.obLastSyncAt
          ? new Date(contractor.obLastSyncAt).toISOString()
          : new Date(Date.now() - 90 * 86_400_000).toISOString()
        const to = new Date().toISOString()

        const accessToken = await decryptToken(contractor.obAccessToken)
        const rawTxs = await getTransactions(accessToken, from, to)
        const transactions = rawTxs.map(tx => ({
          externalId: tx.transaction_id,
          amount: Math.abs(tx.amount),
          currency: tx.currency,
          description: tx.description,
          merchantName: tx.merchant_name,
          transactionAt: new Date(tx.timestamp),
          provider: 'truelayer',
        }))

        await reconcileTransactions(contractor.id, transactions)
        await db.update(schema.contractors).set({ obLastSyncAt: new Date() }).where(eq(schema.contractors.id, contractor.id))
        synced++
      } catch {}
    }

    return NextResponse.json({ ok: true, synced })
  } catch (err: any) {
    console.error('[cron/ob-sync]', err)
    return NextResponse.json({ error: err.message ?? 'Cron failed' }, { status: 500 })
  }
}
