// US ONLY — Contract-based enforcement. No statutory interest.
// Late fees ONLY enforceable if included in signed contract.
// Do NOT import UK statutory logic here.

import type { Job } from '@/lib/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UsPaymentTermsType = 'net7' | 'net14' | 'net30' | 'net60' | 'custom'

export type UsLateFeeType = 'percent' | 'fixed' | 'none'

export type UsReminderTone = 'friendly' | 'firm' | 'final'

export interface UsLateFeeResult {
  /** The calculated late fee amount in USD, or null if no fee applies */
  feeAmount: number
  /** Human-readable breakdown of how the fee was calculated */
  breakdown: string
}

export interface UsEnforceabilityResult {
  enforceable: boolean
  reason: string
}

export interface UsReminderContext {
  tone: UsReminderTone
  /** Whether a late fee can be applied based on contract terms */
  canApplyFee: boolean
  /** The fee amount if applicable, otherwise null */
  feeAmount: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TERMS_TYPES: readonly UsPaymentTermsType[] = ['net7', 'net14', 'net30', 'net60', 'custom']

/**
 * Industry-standard grace period before a fixed late fee becomes applicable.
 * Most US contracts use 5–7 days. We default to 5.
 */
const DEFAULT_FIXED_FEE_GRACE_DAYS = 5

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Validates that a payment terms type is explicitly set and recognised.
 *
 * In the US there is NO statutory default payment period. Terms MUST be
 * explicitly agreed in writing. This function throws if the terms type
 * is absent or unrecognised, preventing silent legal assumptions.
 *
 * @param termsType - The payment terms type to validate
 * @throws Error if termsType is not a recognised US payment terms value
 */
export function validateUsPaymentTerms(termsType: string): asserts termsType is UsPaymentTermsType {
  if (!VALID_TERMS_TYPES.includes(termsType as UsPaymentTermsType)) {
    throw new Error(
      `Invalid US payment terms: "${termsType}". ` +
        `Must be one of: ${VALID_TERMS_TYPES.join(', ')}. ` +
        `In the US, payment terms must be explicitly stated in the contract — ` +
        `there is no statutory default.`,
    )
  }
}

/**
 * Calculates the late fee amount, but ONLY if the fee type is defined in the
 * contract. Returns null if lateFeeType is 'none'.
 *
 * IMPORTANT: This function calculates what the fee would be. Whether it is
 * legally enforceable is a separate question — use isLateFeeEnforceable() first.
 *
 * @param invoiceAmount  - The outstanding invoice amount in USD
 * @param lateFeeType    - The type of late fee ('percent' | 'fixed' | 'none')
 * @param lateFeeAmount  - The fee amount: percentage value (e.g. 1.5 for 1.5%/month)
 *                         or fixed dollar amount (e.g. 50 for $50 flat fee)
 * @param daysOverdue    - Number of days the invoice is past due
 */
export function calculateContractualLateFee(
  invoiceAmount: number,
  lateFeeType: UsLateFeeType,
  lateFeeAmount: number,
  daysOverdue: number,
): UsLateFeeResult | null {
  if (lateFeeType === 'none') {
    return null
  }

  if (lateFeeType === 'percent') {
    // Monthly percentage applied pro-rata per day
    // e.g. 1.5% per month = 1.5 / 30 per day
    const dailyRate = lateFeeAmount / 30
    const feeAmount = invoiceAmount * (dailyRate / 100) * daysOverdue
    const rounded = Math.round(feeAmount * 100) / 100

    return {
      feeAmount: rounded,
      breakdown:
        `${lateFeeAmount}% per month (${dailyRate.toFixed(4)}%/day) ` +
        `on $${invoiceAmount.toFixed(2)} for ${daysOverdue} days = $${rounded.toFixed(2)}`,
    }
  }

  if (lateFeeType === 'fixed') {
    // Flat fee applied once after the grace period expires.
    // No fee is applied during the grace period.
    if (daysOverdue <= DEFAULT_FIXED_FEE_GRACE_DAYS) {
      return {
        feeAmount: 0,
        breakdown:
          `Fixed fee of $${lateFeeAmount.toFixed(2)} not yet applied — ` +
          `within ${DEFAULT_FIXED_FEE_GRACE_DAYS}-day grace period (${daysOverdue} days overdue).`,
      }
    }

    return {
      feeAmount: lateFeeAmount,
      breakdown:
        `Fixed late fee of $${lateFeeAmount.toFixed(2)} applied ` +
        `(${daysOverdue} days overdue, past ${DEFAULT_FIXED_FEE_GRACE_DAYS}-day grace period).`,
    }
  }

  // TypeScript exhaustiveness guard — lateFeeType cannot be anything else at runtime
  const _exhaustive: never = lateFeeType
  throw new Error(`Unhandled lateFeeType: ${_exhaustive}`)
}

/**
 * Determines whether a late fee is legally enforceable for a given job.
 *
 * In the US, late fees are ONLY enforceable if:
 *   1. The customer signed a quote/contract that explicitly included late fee terms
 *   2. A lateFeeType was set (not 'none' and not absent)
 *
 * @param job - The job record to assess
 */
export function isLateFeeEnforceable(
  job: Pick<Job, 'quoteSignedAt' | 'signerName' | 'lateFeeType' | 'lateFeeAmount'>,
): UsEnforceabilityResult {
  const hasSigned = job.quoteSignedAt !== null && job.signerName !== null && job.signerName !== ''

  if (!hasSigned) {
    return {
      enforceable: false,
      reason:
        'No signed contract on record. Late fees are only enforceable in the US if the ' +
        'customer signed a quote that explicitly included the late fee terms.',
    }
  }

  if (job.lateFeeType === null || job.lateFeeType === undefined) {
    return {
      enforceable: false,
      reason:
        'No late fee type set on this job. Even with a signed contract, the fee terms ' +
        'must have been present in the document the customer signed.',
    }
  }

  if (job.lateFeeType === 'none') {
    return {
      enforceable: false,
      reason:
        'Late fee type is set to "none". No late fee was included in the signed contract.',
    }
  }

  if (job.lateFeeAmount === null || job.lateFeeAmount === undefined || Number(job.lateFeeAmount) <= 0) {
    return {
      enforceable: false,
      reason:
        'Late fee type is set but the fee amount is zero or not specified. ' +
        'A valid fee amount must have been in the signed contract.',
    }
  }

  return {
    enforceable: true,
    reason:
      `Late fee enforceable: customer signed the contract (signed by "${job.signerName}") ` +
      `which included a ${job.lateFeeType} late fee of ${job.lateFeeAmount}.`,
  }
}

/**
 * Returns the number of payment days for a given US payment terms type.
 * Returns null for 'custom' — the caller must supply the specific agreed days.
 *
 * @param termsType - A validated US payment terms type
 */
export function getUsPaymentTermsDays(termsType: UsPaymentTermsType): number | null {
  const map: Record<UsPaymentTermsType, number | null> = {
    net7: 7,
    net14: 14,
    net30: 30,
    net60: 60,
    custom: null,
  }
  return map[termsType]
}

/**
 * Builds the context object needed to select the correct tone and fee status
 * for a payment reminder communication.
 *
 * Tone escalation:
 *   1–3 days late  → friendly (assume oversight or postal delay)
 *   4–14 days late → firm (clear reminder, fee warning if applicable)
 *   15+ days late  → final (pre-collection language, fee applied if enforceable)
 *
 * @param job      - The job record from the database
 * @param daysLate - Number of days the invoice is past its due date
 */
export function buildUsReminderContext(
  job: Pick<Job, 'quoteSignedAt' | 'signerName' | 'lateFeeType' | 'lateFeeAmount'>,
  daysLate: number,
): UsReminderContext {
  let tone: UsReminderTone
  if (daysLate >= 15) {
    tone = 'final'
  } else if (daysLate >= 4) {
    tone = 'firm'
  } else {
    tone = 'friendly'
  }

  const enforceability = isLateFeeEnforceable(job)

  let feeAmount: number | null = null

  if (enforceability.enforceable && job.lateFeeType !== 'none' && job.lateFeeType !== null) {
    const result = calculateContractualLateFee(
      // We don't have invoiceAmount directly in these job fields, so we cannot
      // compute a percent fee without it. The caller should compute this separately.
      // For 'fixed' type we can derive the amount directly.
      0,
      job.lateFeeType as UsLateFeeType,
      Number(job.lateFeeAmount ?? 0),
      daysLate,
    )

    if (result !== null && job.lateFeeType === 'fixed') {
      feeAmount = result.feeAmount > 0 ? result.feeAmount : null
    }
    // For 'percent' type, the caller must compute feeAmount with the invoice total
    // and pass it in separately — it cannot be derived without invoiceAmount.
  }

  return {
    tone,
    canApplyFee: enforceability.enforceable,
    feeAmount,
  }
}
