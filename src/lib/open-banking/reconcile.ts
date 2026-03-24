import { getDb, schema } from '@/lib/db'
import { eq, and, isNull, gte } from 'drizzle-orm'

interface BankTransaction {
  externalId: string
  amount: number
  currency: string
  description: string
  merchantName?: string
  transactionAt: Date
  provider: string
}

export async function reconcileTransactions(
  contractorId: string,
  transactions: BankTransaction[]
): Promise<{ autoMatched: number; suggestions: number; unmatched: number }> {
  const db = getDb()

  const outstandingJobs = await db.query.jobs.findMany({
    where: and(
      eq(schema.jobs.contractorId, contractorId),
      eq(schema.jobs.paymentStatus, 'none'),
    ),
  })

  let autoMatched = 0
  let suggestions = 0
  let unmatched = 0

  for (const tx of transactions) {
    const existing = await db.query.obTransactions.findFirst({
      where: eq(schema.obTransactions.externalId, tx.externalId),
    })
    if (existing) continue

    let matchedJob: typeof outstandingJobs[0] | null = null
    let confidence = 0
    let matchMethod = 'unmatched'

    for (const job of outstandingJobs) {
      if (!job.invoiceNumber) continue
      const invoiceRef = job.invoiceNumber.toLowerCase()
      const txDesc = tx.description.toLowerCase()
      const txMerchant = (tx.merchantName ?? '').toLowerCase()

      const amountMatch = Math.abs(Number(job.balanceDue) - tx.amount) < 5
      const refMatch = txDesc.includes(invoiceRef) || txMerchant.includes(invoiceRef)

      if (amountMatch && refMatch) {
        matchedJob = job
        confidence = 0.95
        matchMethod = 'auto_amount_ref'
        break
      } else if (amountMatch) {
        matchedJob = job
        confidence = 0.70
        matchMethod = 'amount_only'
      }
    }

    await db.insert(schema.obTransactions).values({
      contractorId,
      provider: tx.provider,
      externalId: tx.externalId,
      amount: String(tx.amount),
      currency: tx.currency,
      description: tx.description,
      merchantName: tx.merchantName,
      status: 'pending',
      matchedJobId: confidence >= 0.90 ? matchedJob?.id : undefined,
      matchConfidence: confidence > 0 ? String(confidence) : undefined,
      matchMethod: confidence > 0 ? matchMethod : 'unmatched',
      transactionAt: tx.transactionAt,
    })

    if (confidence >= 0.90 && matchedJob) {
      await db.update(schema.jobs).set({
        paymentStatus: 'paid',
        amountPaid: matchedJob.balanceDue,
        balanceDue: '0',
        paidAt: tx.transactionAt,
        obMatchedAt: new Date(),
        obTransactionId: tx.externalId,
      }).where(eq(schema.jobs.id, matchedJob.id))
      autoMatched++
    } else if (confidence >= 0.60 && matchedJob) {
      await db.insert(schema.notifications).values({
        contractorId,
        jobId: matchedJob.id,
        type: 'ob_reconciliation_suggestion',
        channel: 'in_app',
        title: 'Possible payment match',
        body: `£${tx.amount} from "${tx.description}" may match invoice ${matchedJob.invoiceNumber}`,
        actionUrl: `/payments?highlight=${matchedJob.id}`,
      })
      suggestions++
    } else {
      unmatched++
    }
  }

  return { autoMatched, suggestions, unmatched }
}
