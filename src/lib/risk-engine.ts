import { getDb, schema } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'

export async function recalculateCustomerRisk(customerId: string, contractorId: string): Promise<void> {
  const db = getDb()

  const customer = await db.query.customers.findFirst({
    where: and(eq(schema.customers.id, customerId), eq(schema.customers.contractorId, contractorId)),
  })

  if (!customer) return

  const paidJobs = await db.query.jobs.findMany({
    where: and(
      eq(schema.jobs.customerId, customerId),
      eq(schema.jobs.contractorId, contractorId),
      eq(schema.jobs.paymentStatus, 'paid'),
    ),
  })

  const avgPaymentDays =
    paidJobs.length > 0
      ? Math.round(
          paidJobs.reduce((sum, job) => {
            if (!job.invoiceSentAt || !job.paidAt) return sum
            const days = Math.floor(
              (new Date(job.paidAt).getTime() - new Date(job.invoiceSentAt).getTime()) / 86_400_000
            )
            return sum + days
          }, 0) / paidJobs.length
        )
      : null

  let score = 100

  if (avgPaymentDays !== null) {
    if (avgPaymentDays <= 7) score += 20
    if (avgPaymentDays > 14) score -= 15
    if (avgPaymentDays > 30) score -= 30
    if (avgPaymentDays > 60) score -= 50
  }

  const disputeCount = customer.disputeCount ?? 0
  const cancellationCount = customer.cancellationCount ?? 0
  const latePaymentCount = customer.latePaymentCount ?? 0
  const onTimeCount = customer.onTimeCount ?? 0

  score -= disputeCount * 25
  score -= cancellationCount * 15
  score -= latePaymentCount * 10
  score += onTimeCount * 5

  score = Math.max(0, Math.min(100, score))

  let riskLevel: 'good' | 'average' | 'slow' | 'avoid' = 'good'
  if (score >= 80) riskLevel = 'good'
  else if (score >= 60) riskLevel = 'average'
  else if (score >= 40) riskLevel = 'slow'
  else riskLevel = 'avoid'

  await db
    .update(schema.customers)
    .set({
      riskLevel,
      avgPaymentDays: avgPaymentDays ?? undefined,
      riskLastUpdated: new Date(),
    })
    .where(eq(schema.customers.id, customerId))
}
